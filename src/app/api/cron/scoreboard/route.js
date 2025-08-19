 
import { createClient } from '@supabase/supabase-js';

// Create admin client locally to avoid import issues on Vercel
function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

async function fetchWeekScoreboard(week) {
  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=2&week=${week}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`ESPN scoreboard API error: ${response.status}`);
    }
    
    const data = await response.json();
    const games = [];
    
    for (const event of data.events || []) {
      const competition = event.competitions?.[0];
      if (competition && competition.competitors?.length === 2) {
        const homeTeam = competition.competitors.find(c => c.homeAway === 'home');
        const awayTeam = competition.competitors.find(c => c.homeAway === 'away');
        
        let winnerTeam = null;
        if (competition.status?.type?.completed) {
          const homeScore = parseInt(homeTeam?.score || 0);
          const awayScore = parseInt(awayTeam?.score || 0);
          
          if (homeScore > awayScore) {
            winnerTeam = homeTeam?.team?.abbreviation;
          } else if (awayScore > homeScore) {
            winnerTeam = awayTeam?.team?.abbreviation;
          }
          // If tied, winnerTeam stays null
        }
        
        games.push({
          espn_event_id: event.id,
          status: competition.status?.type?.name || 'scheduled',
          home_team: homeTeam?.team?.abbreviation,
          away_team: awayTeam?.team?.abbreviation,
          home_score: parseInt(homeTeam?.score || 0),
          away_score: parseInt(awayTeam?.score || 0),
          winner_team: winnerTeam
        });
      }
    }
    
    return games;
  } catch (error) {
    console.error('Error fetching week scoreboard:', error);
    throw error;
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const week = searchParams.get('week') || getCurrentWeek();
    
    const supabase = createAdminClient();
    
    // Fetch latest scores from ESPN
    const scoreboardGames = await fetchWeekScoreboard(week);
    
    let updatedGames = 0;
    let processedPicks = 0;
    
    for (const scoreGame of scoreboardGames) {
      // Update game status and scores
      const { error: gameError } = await supabase
        .from('game')
        .update({
          status: scoreGame.status,
          home_score: scoreGame.home_score,
          away_score: scoreGame.away_score,
          winner_team: scoreGame.winner_team
        })
        .eq('espn_event_id', scoreGame.espn_event_id);
      
      if (!gameError) {
        updatedGames++;
      }
      
      // If game is completed, process picks
      if (scoreGame.status === 'STATUS_FINAL' || scoreGame.winner_team !== undefined) {
        await processPicks(supabase, week, scoreGame);
        processedPicks++;
      }
    }
    
    return Response.json({ 
      ok: true, 
      message: `Updated ${updatedGames} games, processed ${processedPicks} completed games for week ${week}`
    });
    
  } catch (error) {
    console.error('Scoreboard cron error:', error);
    return Response.json({ ok: false, error: error.message });
  }
}

async function processPicks(supabase, week, game) {
  try {
    if (game.winner_team === null) {
      // Tie - mark picks as void
      await supabase
        .from('pick')
        .update({ result: 'void' })
        .eq('nfl_week', week)
        .in('team', [game.home_team, game.away_team])
        .eq('result', 'pending');
    } else {
      // Mark winning picks
      await supabase
        .from('pick')
        .update({ result: 'win' })
        .eq('nfl_week', week)
        .eq('team', game.winner_team)
        .eq('result', 'pending');
      
      // Mark losing picks and eliminate those members
      const losingTeam = game.winner_team === game.home_team ? game.away_team : game.home_team;
      
      const { data: losingPicks } = await supabase
        .from('pick')
        .select('member_id')
        .eq('nfl_week', week)
        .eq('team', losingTeam)
        .eq('result', 'pending');
      
      if (losingPicks && losingPicks.length > 0) {
        // Mark picks as losses
        await supabase
          .from('pick')
          .update({ result: 'loss' })
          .eq('nfl_week', week)
          .eq('team', losingTeam)
          .eq('result', 'pending');
        
        // Eliminate members
        const memberIds = losingPicks.map(p => p.member_id);
        await
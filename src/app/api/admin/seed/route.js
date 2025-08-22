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
    const events = [];
    
    for (const event of data.events || []) {
      const competition = event.competitions?.[0];
      if (competition && competition.competitors?.length === 2) {
        const homeTeam = competition.competitors.find(c => c.homeAway === 'home');
        const awayTeam = competition.competitors.find(c => c.homeAway === 'away');
        
        events.push({
          espn_event_id: event.id,
          nfl_week: week,
          start_time_utc: new Date(event.date).toISOString(),
          home_team: homeTeam?.team?.abbreviation || 'TBD',
          away_team: awayTeam?.team?.abbreviation || 'TBD',
          status: competition.status?.type?.name || 'scheduled',
          home_score: parseInt(homeTeam?.score || 0),
          away_score: parseInt(awayTeam?.score || 0)
        });
      }
    }
    
    return events;
  } catch (error) {
    console.error(`Error fetching week ${week} scoreboard:`, error);
    return [];
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year') || '2025';
    
    const supabase = createAdminClient();
    let allEvents = [];
    
    // Fetch weeks 1-18 using scoreboard API (which we know works)
    for (let week = 1; week <= 18; week++) {
      console.log(`Fetching week ${week}...`);
      const weekEvents = await fetchWeekScoreboard(week);
      allEvents.push(...weekEvents);
      
      // Small delay to be nice to ESPN's API
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (allEvents.length === 0) {
      return Response.json({ ok: false, error: 'No events found' });
    }
    
    // Upsert games into database
    const { data, error } = await supabase
      .from('game')
      .upsert(allEvents, { 
        onConflict: 'espn_event_id',
        ignoreDuplicates: false 
      });
    
    if (error) {
      console.error('Database error:', error);
      return Response.json({ ok: false, error: error.message });
    }
    
    return Response.json({ 
      ok: true, 
      inserted: allEvents.length,
      message: `Seeded ${allEvents.length} games for ${year} season (weeks 1-18)`
    });
    
  } catch (error) {
    console.error('Seed error:', error);
    return Response.json({ ok: false, error: error.message });
  }
}
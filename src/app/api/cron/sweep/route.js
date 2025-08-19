 
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

export async function GET() {
  try {
    const supabase = createAdminClient();
    
    // Get the most recent week that has games
    const { data: latestWeekGames } = await supabase
      .from('game')
      .select('nfl_week, start_time_utc')
      .order('nfl_week', { ascending: false })
      .limit(1);
    
    if (!latestWeekGames || latestWeekGames.length === 0) {
      return Response.json({ ok: true, message: 'No games found' });
    }
    
    const latestWeek = latestWeekGames[0].nfl_week;
    
    // Get the latest kickoff time for this week (Monday Night Football)
    const { data: weekGames } = await supabase
      .from('game')
      .select('start_time_utc')
      .eq('nfl_week', latestWeek)
      .order('start_time_utc', { ascending: false })
      .limit(1);
    
    if (!weekGames || weekGames.length === 0) {
      return Response.json({ ok: true, message: 'No games found for latest week' });
    }
    
    const latestKickoff = new Date(weekGames[0].start_time_utc);
    const now = new Date();
    
    // Only sweep if the latest game has already started
    if (now <= latestKickoff) {
      return Response.json({ 
        ok: true, 
        message: `Latest game for week ${latestWeek} hasn't started yet`
      });
    }
    
    // Find alive members who don't have a pick for the latest week
    const { data: membersWithoutPicks } = await supabase
      .from('member')
      .select(`
        id,
        first_name,
        last_name,
        pick!left(id)
      `)
      .eq('status', 'alive')
      .is('pick.id', null)
      .or(`pick.nfl_week.neq.${latestWeek},pick.id.is.null`);
    
    if (!membersWithoutPicks || membersWithoutPicks.length === 0) {
      return Response.json({ 
        ok: true, 
        message: `All alive members have picks for week ${latestWeek}`
      });
    }
    
    // Eliminate members who didn't pick
    const memberIds = membersWithoutPicks.map(m => m.id);
    
    const { error } = await supabase
      .from('member')
      .update({
        status: 'eliminated',
        eliminated_week: la
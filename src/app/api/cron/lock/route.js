 
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
    const now = new Date().toISOString();
    
    // Get all games that have started but have unlocked picks
    const { data: gamesToLock } = await supabase
      .from('game')
      .select(`
        *,
        pick!inner(*)
      `)
      .lte('start_time_utc', now)
      .is('pick.locked_at', null);
    
    if (!gamesToLock || gamesToLock.length === 0) {
      return Response.json({ ok: true, message: 'No picks to lock' });
    }
    
    // Lock picks for games that have started
    let lockedCount = 0;
    
    for (const game of gamesToLock) {
      // Lock picks for this game's teams
      const { error } = await supabase
        .from('pick')
        .update({ locked_at: now })
        .eq('nfl_week', game.nfl_week)
        .in('team', [game.home_team, game.away_team])
        .is('locked_at', null);
      
      if (!error) {
        lockedCount++;
      }
    }
    
    return Response.json({ 
      ok: true, 
      message: `Locked picks for ${lockedCount} games`
    });
    
  } catch (error) {
    console.error('Lock cron error:', error);
    return Response.json({ ok: false, error: error.message });
  }
}
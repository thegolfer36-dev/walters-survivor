 
-- NFL Survivor League Database Schema

-- Create leagues table
CREATE TABLE IF NOT EXISTS league (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    season_year INTEGER NOT NULL,
    timezone TEXT DEFAULT 'America/Denver',
    join_deadline_week INTEGER DEFAULT 1,
    created_by_email TEXT NOT NULL,
    invite_code TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create members table
CREATE TABLE IF NOT EXISTS member (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    league_id UUID REFERENCES league(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    status TEXT DEFAULT 'alive' CHECK (status IN ('alive', 'eliminated')),
    eliminated_week INTEGER,
    eliminated_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(league_id, email)
);

-- Create games table
CREATE TABLE IF NOT EXISTS game (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    league_id UUID REFERENCES league(id) ON DELETE SET NULL,
    nfl_week INTEGER NOT NULL,
    espn_event_id TEXT UNIQUE NOT NULL,
    start_time_utc TIMESTAMPTZ NOT NULL,
    home_team TEXT NOT NULL,
    away_team TEXT NOT NULL,
    status TEXT DEFAULT 'scheduled',
    home_score INTEGER DEFAULT 0,
    away_score INTEGER DEFAULT 0,
    winner_team TEXT
);

-- Create picks table
CREATE TABLE IF NOT EXISTS pick (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    league_id UUID REFERENCES league(id) ON DELETE CASCADE,
    nfl_week INTEGER NOT NULL,
    member_id UUID REFERENCES member(id) ON DELETE CASCADE,
    team TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    locked_at TIMESTAMPTZ,
    result TEXT DEFAULT 'pending' CHECK (result IN ('pending', 'win', 'loss', 'void'))
);

-- Create helpful indexes
CREATE INDEX IF NOT EXISTS idx_game_week ON game(nfl_week);
CREATE INDEX IF NOT EXISTS idx_game_start_time ON game(start_time_utc);
CREATE INDEX IF NOT EXISTS idx_pick_member_week ON pick(member_id, nfl_week);
CREATE INDEX IF NOT EXISTS idx_pick_league_week ON pick(league_id, nfl_week);
CREATE INDEX IF NOT EXISTS idx_member_league ON member(league_id);

-- Comments for clarity
COMMENT ON TABLE league IS 'Survivor league instances';
COMMENT ON TABLE member IS 'League participants';
COMMENT ON TABLE game IS 'NFL games schedule and results';
COMMENT ON TABLE pick IS 'Member picks for each week';

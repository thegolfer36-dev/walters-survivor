 
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { getTeamInfo } from '../lib/teams';

const supabase = createClient(
  'https://fzgkvbeqesawooppzwr.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6Z2t2YmVxZWVzYXdvb3BwendyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1NzcwMTksImV4cCI6MjA3MTE1MzAxOX0.KUuyDxmCHOn5B6zG_HIYNewHPqGIO0wBrqDUqcCgTPw'
);
export default function HomePage() {
  const [currentWeek, setCurrentWeek] = useState(1);
  const [games, setGames] = useState([]);
  const [availableTeams, setAvailableTeams] = useState([]);
  const [userPick, setUserPick] = useState(null);
  const [usedTeams, setUsedTeams] = useState([]);
  const [member, setMember] = useState(null);
  const [league, setLeague] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [currentWeek]);

  // Get current member - in a real app this would be from authentication
  async function getCurrentMember(leagueId) {
    try {
      // For now, get the first alive member in the league
      // In a real app, this would be based on the logged-in user
      const { data: members, error } = await supabase
        .from('member')
        .select('*')
        .eq('league_id', leagueId)
        .eq('status', 'alive')
        .order('created_at')
        .limit(1);
      
      if (error) {
        console.error('Error fetching member:', error);
        return null;
      }
      
      return members?.[0] || null;
    } catch (error) {
      console.error('Error in getCurrentMember:', error);
      return null;
    }
  }

  async function loadData() {
    try {
      setLoading(true);
      setError('');
      
      // Get current league
      const { data: leagues, error: leagueError } = await supabase
        .from('league')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (leagueError) {
        throw new Error('Error loading league: ' + leagueError.message);
      }
      
      if (!leagues || leagues.length === 0) {
        setError('No league found. Please create a league first.');
        setLoading(false);
        return;
      }
      
      const currentLeague = leagues[0];
      setLeague(currentLeague);
      
      // Get current member
      const currentMember = await getCurrentMember(currentLeague.id);
      if (!currentMember) {
        setError('No member found in this league. Please join the league first.');
        setLoading(false);
        return;
      }
      
      setMember(currentMember);
      
      // Get games for current week
      const { data: weekGames, error: gamesError } = await supabase
        .from('game')
        .select('*')
        .eq('nfl_week', currentWeek)
        .order('start_time_utc');
      
      if (gamesError) {
        throw new Error('Error loading games: ' + gamesError.message);
      }
      
      setGames(weekGames || []);
      
      // Get available teams (teams playing this week)
      const teamsThisWeek = [...new Set([
        ...weekGames?.map(g => g.home_team) || [],
        ...weekGames?.map(g => g.away_team) || []
      ])];
      
      // Get user's used teams
      const { data: picks, error: picksError } = await supabase
        .from('pick')
        .select('team')
        .eq('league_id', currentLeague.id)
        .eq('member_id', currentMember.id);
      
      if (picksError) {
        console.error('Error loading picks:', picksError);
      }
      
      const used = picks?.map(p => p.team) || [];
      setUsedTeams(used);
      
      // Filter available teams
      const available = teamsThisWeek.filter(team => !used.includes(team));
      setAvailableTeams(available);
      
      // Get current week pick
      const { data: currentPick, error: currentPickError } = await supabase
        .from('pick')
        .select('*')
        .eq('league_id', currentLeague.id)
        .eq('member_id', currentMember.id)
        .eq('nfl_week', currentWeek)
        .single();
      
      if (currentPickError && currentPickError.code !== 'PGRST116') {
        console.error('Error loading current pick:', currentPickError);
      }
      
      setUserPick(currentPick || null);
      
    } catch (error) {
      console.error('Error loading data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function makePick(team) {
    if (!league || !member) {
      alert('League or member not loaded');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('pick')
        .upsert({
          league_id: league.id,
          member_id: member.id,
          nfl_week: currentWeek,
          team: team
        });
      
      if (error) {
        throw error;
      }
      
      // Refresh data to show new pick
      await loadData();
      
    } catch (error) {
      console.error('Error making pick:', error);
      alert('Error making pick: ' + error.message);
    }
  }

  function isGameStarted(startTime) {
    return new Date(startTime) <= new Date();
  }

  function formatTime(utcTime) {
    const date = new Date(utcTime);
    return date.toLocaleString('en-US', {
      timeZone: 'America/Denver',
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center text-red-600">{error}</div>
          <div className="text-center mt-4">
            <a href="/join" className="text-blue-500 hover:underline">
              Join League
            </a>
            {' | '}
            <a href="/admin" className="text-blue-500 hover:underline">
              Admin Panel
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-2xl font-bold mb-4">Week {currentWeek} Picks</h2>
        
        {/* Member Info */}
        {member && (
          <div className="mb-4 text-sm text-gray-600">
            Playing as: <strong>{member.first_name} {member.last_name}</strong> ({member.email})
          </div>
        )}
        
        {/* Week Selector */}
        <div className="mb-6">
          <label className="block mb-2">Select Week:</label>
          <select 
            value={currentWeek}
            onChange={(e) => setCurrentWeek(parseInt(e.target.value))}
            className="border rounded px-3 py-2"
          >
            {[...Array(18)].map((_, i) => (
              <option key={i + 1} value={i + 1}>Week {i + 1}</option>
            ))}
          </select>
        </div>

        {/* Current Pick Status */}
        {userPick && (
          <div className="mb-6 p-4 bg-blue-50 rounded">
            <h3 className="font-bold">Your Pick for Week {currentWeek}:</h3>
            <div className="flex items-center mt-2">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3"
                style={{ backgroundColor: getTeamInfo(userPick.team).color }}
              >
                {userPick.team}
              </div>
              <span>{getTeamInfo(userPick.team).name}</span>
              {userPick.locked_at && (
                <span className="ml-2 text-sm text-gray-600">(Locked)</span>
              )}
            </div>
          </div>
        )}

        {/* Available Teams */}
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-3">Available Teams This Week:</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {availableTeams.map(team => {
              const teamInfo = getTeamInfo(team);
              const teamGames = games.filter(g => g.home_team === team || g.away_team === team);
              const nextGame = teamGames[0];
              const isLocked = nextGame && isGameStarted(nextGame.start_time_utc);
              
              return (
                <button
                  key={team}
                  onClick={() => !isLocked && makePick(team)}
                  disabled={isLocked}
                  className={`p-3 rounded-lg border text-left ${
                    isLocked 
                      ? 'bg-gray-100 cursor-not-allowed opacity-50' 
                      : 'bg-white hover:bg-gray-50 cursor-pointer border-2 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center mb-2">
                    <div 
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold mr-2"
                      style={{ backgroundColor: teamInfo.color }}
                    >
                      {team}
                    </div>
                    <span className="font-medium">{teamInfo.name}</span>
                  </div>
                  {nextGame && (
                    <div className="text-sm text-gray-600">
                      {formatTime(nextGame.start_time_utc)}
                    </div>
                  )}
                  {isLocked && (
                    <div className="text-sm text-red-600 font-medium">Locked</div>
                  )}
                </button>
              );
            })}
          </div>
          
          {availableTeams.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No available teams for Week {currentWeek}. Check if games are seeded for this week.
            </div>
          )}
        </div>

        {/* Used Teams */}
        {usedTeams.length > 0 && (
          <div>
            <h3 className="text-lg font-bold mb-3">Teams You've Already Used:</h3>
            <div className="flex flex-wrap gap-2">
              {usedTeams.map(team => {
                const teamInfo = getTeamInfo(team);
                return (
                  <div 
                    key={team}
                    className="flex items-center bg-gray-200 rounded-full px-3 py-1"
                  >
                    <div 
                      className="w-4 h-4 rounded-full flex items-center justify-center text-white text-xs font-bold mr-2"
                      style={{ backgroundColor: teamInfo.color }}
                    >
                      {team}
                    </div>
                    <span className="text-sm">{teamInfo.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
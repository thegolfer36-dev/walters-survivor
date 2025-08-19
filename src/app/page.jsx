 
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { getTeamInfo } from '../lib/teams';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function HomePage() {
  const [currentWeek, setCurrentWeek] = useState(1);
  const [games, setGames] = useState([]);
  const [availableTeams, setAvailableTeams] = useState([]);
  const [userPick, setUserPick] = useState(null);
  const [usedTeams, setUsedTeams] = useState([]);
  const [member, setMember] = useState(null);
  const [league, setLeague] = useState(null);

  useEffect(() => {
    loadData();
  }, [currentWeek]);

  async function loadData() {
    try {
      // Get current league
      const { data: leagues } = await supabase
        .from('league')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (leagues && leagues.length > 0) {
        setLeague(leagues[0]);
        
        // For demo, we'll use a mock member - in real app this would be from auth
        const mockMember = {
          id: '00000000-0000-0000-0000-000000000001',
          email: 'demo@example.com',
          first_name: 'Demo',
          last_name: 'User'
        };
        setMember(mockMember);
        
        // Get games for current week
        const { data: weekGames } = await supabase
          .from('game')
          .select('*')
          .eq('nfl_week', currentWeek)
          .order('start_time_utc');
        
        setGames(weekGames || []);
        
        // Get available teams (teams playing this week)
        const teamsThisWeek = [...new Set([
          ...weekGames?.map(g => g.home_team) || [],
          ...weekGames?.map(g => g.away_team) || []
        ])];
        
        // Get user's used teams
        const { data: picks } = await supabase
          .from('pick')
          .select('team')
          .eq('league_id', leagues[0].id)
          .eq('member_id', mockMember.id);
        
        const used = picks?.map(p => p.team) || [];
        setUsedTeams(used);
        
        // Filter available teams
        const available = teamsThisWeek.filter(team => !used.includes(team));
        setAvailableTeams(available);
        
        // Get current week pick
        const { data: currentPick } = await supabase
          .from('pick')
          .select('*')
          .eq('league_id', leagues[0].id)
          .eq('member_id', mockMember.id)
          .eq('nfl_week', currentWeek)
          .single();
        
        setUserPick(currentPick);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  async function makePick(team) {
    if (!league || !member) return;
    
    try {
      const { error } = await supabase
        .from('pick')
        .upsert({
          league_id: league.id,
          member_id: member.id,
          nfl_week: currentWeek,
          team: team
        });
      
      if (error) throw error;
      
      loadData(); // Refresh data
    } catch (error) {
      console.error('Error making pick:', error);
      alert('Error making pick');
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

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-2xl font-bold mb-4">Week {currentWeek} Picks</h2>
        
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
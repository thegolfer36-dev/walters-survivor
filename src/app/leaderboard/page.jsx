 
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function LeaderboardPage() {
  const [members, setMembers] = useState([]);
  const [league, setLeague] = useState(null);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  async function loadLeaderboard() {
    try {
      // Get current league
      const { data: leagues } = await supabase
        .from('league')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (leagues && leagues.length > 0) {
        setLeague(leagues[0]);
        
        // Get all members with their latest pick
        const { data: allMembers } = await supabase
          .from('member')
          .select(`
            *,
            pick (
              nfl_week,
              team,
              result,
              created_at
            )
          `)
          .eq('league_id', leagues[0].id)
          .order('created_at');
        
        // Process members to get latest pick info
        const processedMembers = allMembers?.map(member => {
          const picks = member.pick || [];
          const latestPick = picks.reduce((latest, pick) => {
            return !latest || pick.nfl_week > latest.nfl_week ? pick : latest;
          }, null);
          
          return {
            ...member,
            latestPick,
            totalPicks: picks.length
          };
        }) || [];
        
        // Sort: alive members first (by total picks desc), then eliminated members (by elimination week desc)
        processedMembers.sort((a, b) => {
          if (a.status === 'alive' && b.status === 'eliminated') return -1;
          if (a.status === 'eliminated' && b.status === 'alive') return 1;
          
          if (a.status === 'alive') {
            return b.totalPicks - a.totalPicks;
          } else {
            return (b.eliminated_week || 0) - (a.eliminated_week || 0);
          }
        });
        
        setMembers(processedMembers);
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    }
  }

  const aliveMembers = members.filter(m => m.status === 'alive');
  const eliminatedMembers = members.filter(m => m.status === 'eliminated');

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-6">
          {league?.name || 'Survivor League'} - Leaderboard
        </h2>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-green-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-green-600">{aliveMembers.length}</div>
            <div className="text-sm text-green-600">Still Alive</div>
          </div>
          <div className="bg-red-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-red-600">{eliminatedMembers.length}</div>
            <div className="text-sm text-red-600">Eliminated</div>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-600">{members.length}</div>
            <div className="text-sm text-blue-600">Total Players</div>
          </div>
        </div>
        
        {/* Alive Members */}
        {aliveMembers.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-bold mb-4 text-green-600">🟢 Still Alive</h3>
            <div className="space-y-3">
              {aliveMembers.map((member, index) => (
                <div key={member.id} className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold mr-3">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{member.first_name} {member.last_name}</div>
                      <div className="text-sm text-gray-600">{member.email}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">
                      {member.totalPicks} pick{member.totalPicks !== 1 ? 's' : ''}
                    </div>
                    {member.latestPick && (
                      <div className="text-sm">
                        Week {member.latestPick.nfl_week}: {member.latestPick.team}
                        {member.latestPick.result !== 'pending' && (
                          <span className={`ml-1 ${
                            member.latestPick.result === 'win' ? 'text-green-600' : 
                            member.latestPick.result === 'loss' ? 'text-red-600' : 'text-yellow-600'
                          }`}>
                            ({member.latestPick.result})
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Eliminated Members */}
        {eliminatedMembers.length > 0 && (
          <div>
            <h3 className="text-xl font-bold mb-4 text-red-600">❌ Eliminated</h3>
            <div className="space-y-3">
              {eliminatedMembers.map((member, index) => (
                <div key={member.id} className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center font-bold mr-3">
                      X
                    </div>
                    <div>
                      <div className="font-medium">{member.first_name} {member.last_name}</div>
                      <div className="text-sm text-gray-600">{member.email}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-red-600">
                      Eliminated Week {member.eliminated_week}
                    </div>
                    <div className="text-sm text-gray-600">
                      {member.eliminated_reason || 'Unknown reason'}
                    </div>
                    {member.latestPick && (
                      <div className="text-sm">
                        Last pick: Week {member.latestPick.nfl_week}: {member.latestPick.team}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {members.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No members found. Players can join using the invite code.
          </div>
        )}
      </div>
    </div>
  );
}
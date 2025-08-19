 
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function AdminPage() {
  const [league, setLeague] = useState(null);
  const [newLeagueName, setNewLeagueName] = useState('');
  const [startWeek, setStartWeek] = useState(1);
  const [seedYear, setSeedYear] = useState(2025);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadCurrentLeague();
  }, []);

  async function loadCurrentLeague() {
    try {
      const { data: leagues } = await supabase
        .from('league')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (leagues && leagues.length > 0) {
        setLeague(leagues[0]);
      }
    } catch (error) {
      console.error('Error loading league:', error);
    }
  }

  async function createLeague() {
    if (!newLeagueName.trim()) {
      setMessage('Please enter a league name');
      return;
    }
    
    setLoading(true);
    try {
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const { data, error } = await supabase
        .from('league')
        .insert({
          name: newLeagueName,
          season_year: seedYear,
          join_deadline_week: startWeek,
          created_by_email: 'thegolfer36@gmail.com',
          invite_code: inviteCode
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setLeague(data);
      setMessage(`League created successfully! Invite code: ${inviteCode}`);
      setNewLeagueName('');
    } catch (error) {
      console.error('Error creating league:', error);
      setMessage('Error creating league: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function generateNewInviteCode() {
    if (!league) return;
    
    setLoading(true);
    try {
      const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const { error } = await supabase
        .from('league')
        .update({ invite_code: newCode })
        .eq('id', league.id);
      
      if (error) throw error;
      
      setLeague({ ...league, invite_code: newCode });
      setMessage(`New invite code generated: ${newCode}`);
    } catch (error) {
      console.error('Error generating invite code:', error);
      setMessage('Error generating invite code: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function seedSchedule() {
    setLoading(true);
    setMessage('Seeding schedule...');
    
    try {
      const response = await fetch(`/api/admin/seed?year=${seedYear}`);
      const result = await response.json();
      
      if (result.ok) {
        setMessage(`Schedule seeded successfully! Inserted ${result.inserted} games.`);
      } else {
        setMessage('Error seeding schedule: ' + result.error);
      }
    } catch (error) {
      console.error('Error seeding schedule:', error);
      setMessage('Error seeding schedule: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-6">Admin Panel</h2>
        
        {message && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
            {message}
          </div>
        )}
        
        {/* Current League Info */}
        {league && (
          <div className="mb-8 p-4 bg-gray-50 rounded">
            <h3 className="text-lg font-bold mb-2">Current League</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><strong>Name:</strong> {league.name}</div>
              <div><strong>Season:</strong> {league.season_year}</div>
              <div><strong>Invite Code:</strong> {league.invite_code}</div>
              <div><strong>Join Deadline:</strong> Week {league.join_deadline_week}</div>
            </div>
            <button
              onClick={generateNewInviteCode}
              disabled={loading}
              className="mt-3 bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 disabled:opacity-50"
            >
              Generate New Invite Code
            </button>
          </div>
        )}
        
        {/* Create New League */}
        <div className="mb-8 p-4 border rounded">
          <h3 className="text-lg font-bold mb-4">Create New League</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">League Name</label>
              <input
                type="text"
                value={newLeagueName}
                onChange={(e) => setNewLeagueName(e.target.value)}
                placeholder="e.g., Walters Survivor Round 2"
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Start Week</label>
              <select
                value={startWeek}
                onChange={(e) => setStartWeek(parseInt(e.target.value))}
                className="w-full border rounded px-3 py-2"
              >
                {[...Array(18)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>Week {i + 1}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Season Year</label>
              <input
                type="number"
                value={seedYear}
                onChange={(e) => setSeedYear(parseInt(e.target.value))}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>
          <button
            onClick={createLeague}
            disabled={loading}
            className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600 disabled:opacity-50"
          >
            Create League
          </button>
        </div>
        
        {/* Seed Schedule */}
        <div className="mb-8 p-4 border rounded">
          <h3 className="text-lg font-bold mb-4">Seed NFL Schedule</h3>
          <p className="text-sm text-gray-600 mb-4">
            This will fetch the NFL schedule from ESPN and populate the games table. 
            Run this once per season or when creating a new league.
          </p>
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Season Year</label>
              <input
                type="number"
                value={seedYear}
                onChange={(e) => setSeedYear(parseInt(e.target.value))}
                className="border rounded px-3 py-2"
              />
            </div>
            <button
              onClick={seedSchedule}
              disabled={loading}
              className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:opacity-50 mt-6"
            >
              Seed Schedule
            </button>
          </div>
        </div>
        
        {/* Manual API Endpoints */}
        <div className="p-4 border rounded">
          <h3 className="text-lg font-bold mb-4">Manual Cron Jobs</h3>
          <p className="text-sm text-gray-600 mb-4">
            These endpoints are normally called by Vercel Cron jobs, but you can trigger them manually for testing.
          </p>
          <div className="space-y-2 text-sm">
            <div><strong>Lock Picks:</strong> <code>GET /api/cron/lock</code></div>
            <div><strong>Update Scoreboard:</strong> <code>GET /api/cron/scoreboard?week=1</code></div>
            <div><strong>Sweep No-Picks:</strong> <code>GET /api/cron/sweep</code></div>
          </div>
        </div>
      </div>
    </div>
  );
}
 
'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function JoinPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    inviteCode: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.inviteCode) {
      setMessage('Please fill in all fields');
      return;
    }
    
    setLoading(true);
    try {
      // Find league by invite code
      const { data: league, error: leagueError } = await supabase
        .from('league')
        .select('*')
        .eq('invite_code', formData.inviteCode.toUpperCase())
        .single();
      
      if (leagueError || !league) {
        setMessage('Invalid invite code');
        return;
      }
      
      // Check if user already exists
      const { data: existingMember } = await supabase
        .from('member')
        .select('*')
        .eq('league_id', league.id)
        .eq('email', formData.email.toLowerCase())
        .single();
      
      if (existingMember) {
        setMessage('You are already a member of this league');
        return;
      }
      
      // Create new member
      const { error: memberError } = await supabase
        .from('member')
        .insert({
          league_id: league.id,
          email: formData.email.toLowerCase(),
          first_name: formData.firstName,
          last_name: formData.lastName,
          status: 'alive'
        });
      
      if (memberError) throw memberError;
      
      setMessage(`Successfully joined ${league.name}! You can now make your picks.`);
      setFormData({ firstName: '', lastName: '', email: '', inviteCode: '' });
      
    } catch (error) {
      console.error('Error joining league:', error);
      setMessage('Error joining league: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-6 text-center">Join Survivor League</h2>
        
        {message && (
          <div className={`mb-6 p-4 rounded ${
            message.includes('Successfully') 
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            {message}
          </div>
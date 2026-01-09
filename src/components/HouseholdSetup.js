'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function HouseholdSetup({ onReady }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [householdName, setHouseholdName] = useState('Alex & Adriana');
  const [joinCode, setJoinCode] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user ?? null);
      if (!data?.user) return;

      const { data: p } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', data.user.id)
        .maybeSingle();
      setProfile(p || null);
    })();
  }, []);

  if (!user) return null;
  if (profile?.household_id) return null;

  async function upsertProfile(household_id) {
    const { error } = await supabase.from('profiles').upsert({
      user_id: user.id,
      household_id,
      default_currency: 'USD',
    });
    if (error) throw error;
  }

  async function createHousehold() {
    setStatus('Creating household...');
    try {
      const { data: hh, error: hhErr } = await supabase
        .from('households')
        .insert({ name: householdName })
        .select('*')
        .single();
      if (hhErr) throw hhErr;

      // add member
      const { error: memErr } = await supabase
        .from('household_members')
        .insert({ household_id: hh.id, user_id: user.id });
      if (memErr) throw memErr;

      // create budget config default
      await supabase.from('budget_config').upsert({ household_id: hh.id });

      await upsertProfile(hh.id);

      setStatus(`Household created ✅ Join code: ${hh.join_code}`);
      onReady?.(hh.id, hh.join_code);
    } catch (e) {
      setStatus(e.message || 'Failed to create household.');
    }
  }

  async function joinHousehold() {
    setStatus('Joining household...');
    try {
      const { data: hh, error: findErr } = await supabase
        .from('households')
        .select('*')
        .eq('join_code', joinCode.trim())
        .single();
      if (findErr) throw findErr;

      const { error: memErr } = await supabase
        .from('household_members')
        .insert({ household_id: hh.id, user_id: user.id });
      if (memErr) throw memErr;

      await upsertProfile(hh.id);
      setStatus('Joined ✅');
      onReady?.(hh.id, hh.join_code);
    } catch (e) {
      setStatus(e.message || 'Failed to join household.');
    }
  }

  return (
    <section
      style={{
        marginTop: 14,
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        padding: 16,
      }}
    >
      <h2 style={{ marginTop: 0 }}>Setup (first-time)</h2>
      <p style={{ opacity: 0.8 }}>
        Create a household or join one using a join code. This makes the repo
        fork-friendly.
      </p>

      <div style={{ display: 'grid', gap: 12 }}>
        <div
          style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 }}
        >
          <div style={{ fontWeight: 700 }}>Create Household</div>
          <input
            value={householdName}
            onChange={(e) => setHouseholdName(e.target.value)}
            style={{ width: '100%', padding: 10, marginTop: 8 }}
          />
          <button
            onClick={createHousehold}
            style={{ padding: '10px 12px', marginTop: 8 }}
          >
            Create
          </button>
        </div>

        <div
          style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 12 }}
        >
          <div style={{ fontWeight: 700 }}>Join Household</div>
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="Join code (e.g. a1b2c3d4e5f6)"
            style={{ width: '100%', padding: 10, marginTop: 8 }}
          />
          <button
            onClick={joinHousehold}
            style={{ padding: '10px 12px', marginTop: 8 }}
          >
            Join
          </button>
        </div>

        {status && <div style={{ marginTop: 4 }}>{status}</div>}
      </div>
    </section>
  );
}

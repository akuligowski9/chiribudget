'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { colors, styles } from '@/lib/theme';

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

      setStatus(`Household created! Join code: ${hh.join_code}`);
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
      setStatus('Joined successfully!');
      onReady?.(hh.id, hh.join_code);
    } catch (e) {
      setStatus(e.message || 'Failed to join household.');
    }
  }

  const innerCard = {
    background: colors.bgHover,
    borderRadius: 12,
    padding: 16,
  };

  return (
    <section style={{ ...styles.card, marginTop: 14 }}>
      <h2 style={{ marginTop: 0, marginBottom: 8 }}>Setup (first-time)</h2>
      <p style={{ color: colors.textSecondary, marginBottom: 16 }}>
        Create a household or join one using a join code. This makes the repo
        fork-friendly.
      </p>

      <div style={{ display: 'grid', gap: 14 }}>
        <div style={innerCard}>
          <div
            style={{
              fontWeight: 600,
              color: colors.textPrimary,
              marginBottom: 10,
            }}
          >
            Create Household
          </div>
          <input
            value={householdName}
            onChange={(e) => setHouseholdName(e.target.value)}
            style={{ ...styles.input, width: '100%' }}
          />
          <button
            onClick={createHousehold}
            style={{ ...styles.button, ...styles.buttonPrimary, marginTop: 10 }}
          >
            Create
          </button>
        </div>

        <div style={innerCard}>
          <div
            style={{
              fontWeight: 600,
              color: colors.textPrimary,
              marginBottom: 10,
            }}
          >
            Join Household
          </div>
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="Join code (e.g. a1b2c3d4e5f6)"
            style={{ ...styles.input, width: '100%' }}
          />
          <button
            onClick={joinHousehold}
            style={{
              ...styles.button,
              ...styles.buttonSecondary,
              marginTop: 10,
            }}
          >
            Join
          </button>
        </div>

        {status && (
          <div
            style={{
              padding: 12,
              background: status.includes('!')
                ? colors.success + '15'
                : colors.bgHover,
              borderRadius: 8,
              color: status.includes('!')
                ? colors.success
                : colors.textSecondary,
              fontWeight: 500,
            }}
          >
            {status}
          </div>
        )}
      </div>
    </section>
  );
}

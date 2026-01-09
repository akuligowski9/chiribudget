'use client';

import { getDemoMode, setDemoMode } from '@/lib/auth';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function Header({ onToggleGuidelines }) {
  const [demoMode, setDemo] = useState(false);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => setDemo(getDemoMode()), []);

  async function sendMagicLink(e) {
    e.preventDefault();
    setStatus('Sending link...');
    const { error } = await supabase.auth.signInWithOtp({ email });
    setStatus(error ? error.message : 'Check your email for the sign-in link.');
  }

  function demoLogin() {
    setDemoMode(true);
    setDemo(true);
  }

  function exitDemo() {
    setDemoMode(false);
    setDemo(false);
  }

  return (
    <section
      style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>ChiriBudget</h1>
          <p style={{ margin: '6px 0', opacity: 0.85 }}>
            Create a friendly, shared view of our family’s financial health.
          </p>
          <p style={{ margin: 0, opacity: 0.75 }}>
            Built to make monthly budgeting easier than spreadsheets.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
            flexWrap: 'wrap',
          }}
        >
          <button onClick={onToggleGuidelines} style={{ padding: '10px 12px' }}>
            Rules & Guidelines
          </button>

          {!demoMode ? (
            <>
              <form
                onSubmit={sendMagicLink}
                style={{ display: 'flex', gap: 8 }}
              >
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email for magic link"
                  style={{ padding: 10, minWidth: 220 }}
                />
                <button type="submit" style={{ padding: '10px 12px' }}>
                  Log in
                </button>
              </form>
              <button onClick={demoLogin} style={{ padding: '10px 12px' }}>
                Try Demo
              </button>
            </>
          ) : (
            <button onClick={exitDemo} style={{ padding: '10px 12px' }}>
              Exit Demo
            </button>
          )}
        </div>
      </div>

      {status && <p style={{ marginTop: 10 }}>{status}</p>}
    </section>
  );
}

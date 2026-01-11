'use client';

import { getDemoMode, setDemoMode } from '@/lib/auth';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Home, LogOut } from 'lucide-react';

export default function Header() {
  const [demoMode, setDemo] = useState(false);
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    setDemo(getDemoMode());

    // Check current auth state
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user || null);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

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

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
    setStatus('');
  }

  return (
    <Card accent className="p-6">
      <div className="flex justify-between gap-4 flex-wrap items-start">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-slate to-slate-light">
              <Home className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-2xl font-bold gradient-text m-0">
              ChiriBudget
            </h1>
          </div>
          <p className="text-stone text-sm m-0">
            Family finances, made simple.
          </p>
        </div>

        <div className="flex gap-2 items-center flex-wrap">
          {demoMode ? (
            <Button variant="secondary" onClick={exitDemo}>
              Exit Demo
            </Button>
          ) : user ? (
            <>
              <span className="text-sm text-stone truncate max-w-[200px]">
                {user.email}
              </span>
              <Button variant="outline" onClick={logout}>
                <LogOut className="w-4 h-4 mr-1.5" />
                Log out
              </Button>
            </>
          ) : (
            <>
              <form onSubmit={sendMagicLink} className="flex gap-2">
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="min-w-[180px]"
                />
                <Button type="submit">Log in</Button>
              </form>
              <Button variant="outline" onClick={demoLogin}>
                Try Demo
              </Button>
            </>
          )}
        </div>
      </div>

      {status && (
        <p className="mt-3 text-sm text-stone bg-white/50 rounded-lg px-3 py-2">
          {status}
        </p>
      )}
    </Card>
  );
}

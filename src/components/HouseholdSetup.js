'use client';

import { useState } from 'react';
import { Home, Users, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { RELOAD_DELAY_MS, COPY_FEEDBACK_MS } from '@/lib/constants';
import { supabase } from '@/lib/supabaseClient';

export default function HouseholdSetup({ onReady }) {
  const { user, profile, loading, refreshProfile } = useAuth();

  const [householdName, setHouseholdName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [status, setStatus] = useState('');
  const [createdCode, setCreatedCode] = useState('');
  const [copied, setCopied] = useState(false);

  // Don't show during loading
  if (loading) return null;
  // Don't show if no user
  if (!user) return null;
  // Don't show if user already has a household
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
    if (!householdName.trim()) {
      setStatus('Please enter a household name');
      return;
    }
    setStatus('Creating household...');
    try {
      const { data: hh, error: hhErr } = await supabase
        .from('households')
        .insert({ name: householdName.trim() })
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

      setCreatedCode(hh.join_code);
      setStatus('Household created! Share the code below with your partner.');
      onReady?.(hh.id, hh.join_code);
    } catch (e) {
      setStatus(e.message || 'Failed to create household.');
    }
  }

  async function joinHousehold() {
    if (!joinCode.trim()) {
      setStatus('Please enter a join code');
      return;
    }
    setStatus('Joining household...');
    try {
      const { data: hh, error: findErr } = await supabase
        .from('households')
        .select('*')
        .eq('join_code', joinCode.trim().toLowerCase())
        .single();
      if (findErr)
        throw new Error('Invalid join code. Please check and try again.');

      const { error: memErr } = await supabase
        .from('household_members')
        .insert({ household_id: hh.id, user_id: user.id });
      if (memErr) throw memErr;

      await upsertProfile(hh.id);
      setStatus('Joined successfully! Refreshing...');
      onReady?.(hh.id, hh.join_code);
      // Refresh the auth context then reload
      refreshProfile();
      setTimeout(() => window.location.reload(), RELOAD_DELAY_MS);
    } catch (e) {
      setStatus(e.message || 'Failed to join household.');
    }
  }

  async function copyCode() {
    await navigator.clipboard.writeText(createdCode);
    setCopied(true);
    setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
  }

  function continueToApp() {
    refreshProfile();
    window.location.reload();
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Home className="w-5 h-5 text-slate" />
          <CardTitle>Welcome! Set Up Your Household</CardTitle>
        </div>
        <p className="text-sm text-warm-gray mt-1">
          Create a household or join an existing one to start tracking your
          budget together.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Success state with join code */}
        {createdCode && (
          <div className="bg-success/10 border border-success/30 rounded-xl p-4">
            <div className="font-semibold text-success mb-2">
              Household Created!
            </div>
            <p className="text-sm text-charcoal/80 mb-3">
              Share this code with your partner so they can join:
            </p>
            <div className="flex items-center gap-2">
              <code
                className="flex-1 bg-white/80 px-4 py-2 rounded-lg font-mono text-lg tracking-wider text-charcoal"
                aria-label={`Join code: ${createdCode}`}
              >
                {createdCode}
              </code>
              <Button
                variant="outline"
                size="sm"
                onClick={copyCode}
                aria-label={
                  copied ? 'Code copied' : 'Copy join code to clipboard'
                }
              >
                {copied ? (
                  <Check className="w-4 h-4" aria-hidden="true" />
                ) : (
                  <Copy className="w-4 h-4" aria-hidden="true" />
                )}
              </Button>
            </div>
            <Button className="w-full mt-4" onClick={continueToApp}>
              Continue to App
            </Button>
          </div>
        )}

        {/* Create/Join forms - hide after success */}
        {!createdCode && (
          <div className="grid gap-4 md:grid-cols-2">
            {/* Create Household */}
            <div className="bg-white/40 rounded-xl p-4 border border-white/60">
              <div className="flex items-center gap-2 mb-3">
                <Home className="w-4 h-4 text-slate" />
                <span className="font-semibold text-charcoal">Create New</span>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="household-name">Household Name</Label>
                  <Input
                    id="household-name"
                    value={householdName}
                    onChange={(e) => setHouseholdName(e.target.value)}
                    placeholder="e.g., Alex & Adriana"
                    aria-describedby="household-name-desc"
                  />
                  <span id="household-name-desc" className="sr-only">
                    Enter a name for your new household
                  </span>
                </div>
                <Button
                  onClick={createHousehold}
                  className="w-full"
                  aria-label="Create a new household"
                >
                  Create Household
                </Button>
              </div>
            </div>

            {/* Join Household */}
            <div className="bg-white/40 rounded-xl p-4 border border-white/60">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-slate" />
                <span className="font-semibold text-charcoal">
                  Join Existing
                </span>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="join-code">Join Code</Label>
                  <Input
                    id="join-code"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    placeholder="e.g., a1b2c3d4e5f6"
                    aria-describedby="join-code-desc"
                  />
                  <span id="join-code-desc" className="sr-only">
                    Enter the join code shared by your household member
                  </span>
                </div>
                <Button
                  variant="secondary"
                  onClick={joinHousehold}
                  className="w-full"
                  aria-label="Join an existing household"
                >
                  Join Household
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Status message */}
        <div aria-live="polite" aria-atomic="true">
          {status && !createdCode && (
            <div
              role={
                status.includes('!')
                  ? 'status'
                  : status.includes('...')
                    ? 'status'
                    : 'alert'
              }
              className={`p-3 rounded-lg text-sm font-medium ${
                status.includes('!')
                  ? 'bg-success/10 text-success border border-success/20'
                  : status.includes('...')
                    ? 'bg-slate/10 text-slate border border-slate/20'
                    : 'bg-error/10 text-error border border-error/20'
              }`}
            >
              {status}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

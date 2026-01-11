'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { getDemoMode } from '@/lib/auth';
import { CURRENCIES } from '@/lib/categories';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { User } from 'lucide-react';
import Toast from './Toast';
import { toastId } from '@/lib/format';

export default function ProfileSettings() {
  const [demoMode, setDemoMode] = useState(false);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [userEmail, setUserEmail] = useState('');

  const [displayName, setDisplayName] = useState('');
  const [defaultCurrency, setDefaultCurrency] = useState('USD');

  const [originalDisplayName, setOriginalDisplayName] = useState('');
  const [originalCurrency, setOriginalCurrency] = useState('USD');

  useEffect(() => {
    setDemoMode(getDemoMode());
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);

    if (getDemoMode()) {
      setDisplayName('Demo User');
      setOriginalDisplayName('Demo User');
      setDefaultCurrency('USD');
      setOriginalCurrency('USD');
      setUserEmail('demo@example.com');
      setLoading(false);
      return;
    }

    const { data } = await supabase.auth.getUser();
    const user = data?.user;
    if (!user) {
      setLoading(false);
      return;
    }

    setUserId(user.id);
    setUserEmail(user.email || '');

    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, default_currency')
      .eq('user_id', user.id)
      .maybeSingle();

    if (profile) {
      setDisplayName(profile.display_name || '');
      setOriginalDisplayName(profile.display_name || '');
      setDefaultCurrency(profile.default_currency || 'USD');
      setOriginalCurrency(profile.default_currency || 'USD');
    }

    setLoading(false);
  }

  const hasChanges =
    displayName !== originalDisplayName || defaultCurrency !== originalCurrency;

  async function saveProfile() {
    if (!hasChanges) {
      setToast({ id: toastId(), type: 'success', title: 'No changes to save' });
      return;
    }

    if (demoMode) {
      setOriginalDisplayName(displayName);
      setOriginalCurrency(defaultCurrency);
      setToast({ id: toastId(), type: 'success', title: 'Saved (demo)' });
      return;
    }

    if (!userId) {
      setToast({
        id: toastId(),
        type: 'error',
        title: 'Not logged in',
        message: 'Please log in first.',
      });
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName.trim() || null,
        default_currency: defaultCurrency,
      })
      .eq('user_id', userId);

    if (error) {
      setToast({
        id: toastId(),
        type: 'error',
        title: 'Save failed',
        message: error.message,
      });
      return;
    }

    setOriginalDisplayName(displayName);
    setOriginalCurrency(defaultCurrency);
    setToast({ id: toastId(), type: 'success', title: 'Profile updated' });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-slate" />
          <CardTitle>Your Profile</CardTitle>
        </div>
        <p className="text-sm text-stone mt-1">
          Personal settings for your account
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-warm-gray">
            <div className="w-4 h-4 rounded-full bg-slate/20 animate-pulse" />
            <span className="text-sm">Loading...</span>
          </div>
        ) : !demoMode && !userId ? (
          <p className="text-sm text-warm-gray">
            Log in to configure your profile settings.
          </p>
        ) : (
          <div className="space-y-4 max-w-sm">
            {/* Email (read-only) */}
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={userEmail} disabled className="bg-sand/30" />
            </div>

            {/* Display Name */}
            <div className="space-y-1.5">
              <Label>Display Name</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
              />
              <p className="text-xs text-warm-gray">
                Shown when you edit guidelines or transactions
              </p>
            </div>

            {/* Default Currency */}
            <div className="space-y-1.5">
              <Label>Default Currency</Label>
              <select
                value={defaultCurrency}
                onChange={(e) => setDefaultCurrency(e.target.value)}
                className="w-full h-10 px-3 text-sm font-bold rounded-xl cursor-pointer transition-all duration-200 bg-gradient-to-r from-accent to-accent-light text-white border-2 border-accent/30 shadow-md shadow-accent/25 hover:shadow-lg hover:shadow-accent/35"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c} className="bg-white text-charcoal">
                    {c === 'USD' ? 'USD ($)' : 'PEN (S/.)'}
                  </option>
                ))}
              </select>
              <p className="text-xs text-warm-gray">
                Pre-selected when adding new transactions
              </p>
            </div>

            <Button
              onClick={saveProfile}
              disabled={!hasChanges}
              className="mt-2"
            >
              Save Profile
            </Button>
          </div>
        )}

        <Toast toast={toast} onClose={() => setToast(null)} />
      </CardContent>
    </Card>
  );
}

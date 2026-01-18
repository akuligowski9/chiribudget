'use client';

import { useEffect, useState } from 'react';
import { User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useDemo } from '@/hooks/useDemo';
import { CURRENCIES } from '@/lib/categories';
import { toastId } from '@/lib/format';
import { supabase } from '@/lib/supabaseClient';
import Toast from './Toast';

export default function ProfileSettings() {
  const t = useTranslations();
  const { isDemoMode } = useDemo();
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [userEmail, setUserEmail] = useState('');

  const [displayName, setDisplayName] = useState('');
  const [defaultCurrency, setDefaultCurrency] = useState('USD');

  const [originalDisplayName, setOriginalDisplayName] = useState('');
  const [originalCurrency, setOriginalCurrency] = useState('USD');

  useEffect(() => {
    loadProfile();
  }, [isDemoMode]);

  async function loadProfile() {
    setLoading(true);

    if (isDemoMode) {
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
      setToast({
        id: toastId(),
        type: 'success',
        title: t('settings.noChanges'),
      });
      return;
    }

    if (isDemoMode) {
      setOriginalDisplayName(displayName);
      setOriginalCurrency(defaultCurrency);
      setToast({
        id: toastId(),
        type: 'success',
        title: `${t('common.success')} (demo)`,
      });
      return;
    }

    if (!userId) {
      setToast({
        id: toastId(),
        type: 'error',
        title: t('settings.notLoggedIn'),
        message: t('settings.pleaseLogIn'),
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
        title: t('settings.saveFailed'),
        message: error.message,
      });
      return;
    }

    setOriginalDisplayName(displayName);
    setOriginalCurrency(defaultCurrency);
    setToast({
      id: toastId(),
      type: 'success',
      title: t('settings.profileUpdated'),
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-slate" />
          <CardTitle>{t('settings.yourProfile')}</CardTitle>
        </div>
        <p className="text-sm text-stone mt-1">
          {t('settings.personalSettings')}
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4 max-w-sm">
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-3 w-56" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-11 w-28" />
          </div>
        ) : !isDemoMode && !userId ? (
          <p className="text-sm text-warm-gray">
            {t('settings.loginToConfigureProfile')}
          </p>
        ) : (
          <div className="space-y-4 max-w-sm">
            {/* Email (read-only) */}
            <div className="space-y-1.5">
              <Label>{t('settings.email')}</Label>
              <Input value={userEmail} disabled className="bg-sand/30" />
            </div>

            {/* Display Name */}
            <div className="space-y-1.5">
              <Label>{t('settings.displayName')}</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t('settings.yourNamePlaceholder')}
              />
              <p className="text-xs text-warm-gray">
                {t('settings.displayNameHelp')}
              </p>
            </div>

            {/* Default Currency */}
            <div className="space-y-1.5">
              <Label>{t('settings.defaultCurrency')}</Label>
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
                {t('settings.preSelectedCurrency')}
              </p>
            </div>

            <Button
              onClick={saveProfile}
              disabled={!hasChanges}
              className="mt-2"
            >
              {t('settings.saveProfile')}
            </Button>
          </div>
        )}

        <Toast toast={toast} onClose={() => setToast(null)} />
      </CardContent>
    </Card>
  );
}

'use client';

import { Home, LogOut, Sparkles, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useDemo } from '@/hooks/useDemo';

export default function Header() {
  const t = useTranslations();
  const { user, household, signOut } = useAuth();
  const { isDemoMode, exitDemo } = useDemo();

  // Don't render header if not logged in and not in demo mode
  if (!user && !isDemoMode) return null;

  return (
    <Card accent className="p-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-slate to-slate-light">
            <Home className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold gradient-text leading-tight">
              ChiriBudget
            </h1>
          </div>
        </div>

        <div className="flex gap-2 items-center">
          {isDemoMode ? (
            <Button variant="outline" size="sm" onClick={exitDemo}>
              <LogOut className="w-4 h-4 sm:mr-1.5" />
              <span className="hidden sm:inline">{t('demo.exitDemo')}</span>
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="w-4 h-4 sm:mr-1.5" />
              <span className="hidden sm:inline">{t('nav.logOut')}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Context bar */}
      <div className="mt-2 pt-2 border-t border-sand/50 text-sm text-stone">
        {isDemoMode ? (
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span>{t('demo.demoMode')}</span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <Home className="w-3.5 h-3.5" />
              <strong className="text-charcoal">
                {household?.name || t('household.title')}
              </strong>
            </span>
            <span className="text-stone">•</span>
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              {user?.email}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}

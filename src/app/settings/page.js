'use client';

import { Settings } from 'lucide-react';
import { useTranslations } from 'next-intl';
import BudgetSettings from '@/components/BudgetSettings';
import CategoryLimitsSettings from '@/components/CategoryLimitsSettings';
import ConversionRateSettings from '@/components/ConversionRateSettings';
import Guidelines from '@/components/Guidelines';
import HouseholdMembers from '@/components/HouseholdMembers';
import LanguageSelector from '@/components/LanguageSelector';
import LoginScreen from '@/components/LoginScreen';
import ProfileSettings from '@/components/ProfileSettings';
import TrashView from '@/components/TrashView';
import { Skeleton, SkeletonCard } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useDemo } from '@/hooks/useDemo';

export default function SettingsPage() {
  const t = useTranslations();
  const { user, loading } = useAuth();
  const { isDemoMode } = useDemo();

  // Show skeleton while auth is loading (but not in demo mode)
  if (loading && !isDemoMode) {
    return (
      <main className="max-w-2xl mx-auto px-4 pt-4 pb-8">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 rounded-xl bg-gradient-to-br from-slate to-slate-light">
            <Settings className="w-5 h-5 text-white" />
          </div>
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </main>
    );
  }

  // Show login screen if not authenticated and not in demo mode
  if (!user && !isDemoMode) {
    return <LoginScreen />;
  }

  return (
    <main className="max-w-2xl mx-auto px-4 pt-4 pb-8">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2 rounded-xl bg-gradient-to-br from-slate to-slate-light">
          <Settings className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-2xl font-bold gradient-text m-0">
          {t('settings.title')}
        </h1>
      </div>

      <div className="space-y-4">
        <ProfileSettings />
        <LanguageSelector />
        <HouseholdMembers />
        <ConversionRateSettings />
        <BudgetSettings />
        <CategoryLimitsSettings />
        <Guidelines />
        <TrashView />
      </div>
    </main>
  );
}

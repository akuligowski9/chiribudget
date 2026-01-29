'use client';

import { useState } from 'react';
import { Settings, User, Home, PiggyBank, Database } from 'lucide-react';
import { useTranslations } from 'next-intl';
import BackupSettings from '@/components/BackupSettings';
import BudgetSettings from '@/components/BudgetSettings';
import CategoryLimitsSettings from '@/components/CategoryLimitsSettings';
import ConversionRateSettings from '@/components/ConversionRateSettings';
import Guidelines from '@/components/Guidelines';
import HouseholdMembers from '@/components/HouseholdMembers';
import LanguageSelector from '@/components/LanguageSelector';
import LoginScreen from '@/components/LoginScreen';
import ProfileSettings from '@/components/ProfileSettings';
import RecurringTransactionsSettings from '@/components/RecurringTransactionsSettings';
import TrashView from '@/components/TrashView';
import { Skeleton, SkeletonCard } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useDemo } from '@/hooks/useDemo';

const TABS = [
  { id: 'account', icon: User },
  { id: 'household', icon: Home },
  { id: 'budget', icon: PiggyBank },
  { id: 'data', icon: Database },
];

export default function SettingsPage() {
  const t = useTranslations();
  const { user, loading } = useAuth();
  const { isDemoMode } = useDemo();
  const [activeTab, setActiveTab] = useState('account');

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

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-5 p-1 bg-cream rounded-lg overflow-x-auto">
        {TABS.map(({ id, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 min-w-0 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === id
                ? 'bg-white text-charcoal shadow-sm'
                : 'text-warm-gray hover:text-charcoal hover:bg-white/50'
            }`}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{t(`settings.tabs.${id}`)}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {activeTab === 'account' && (
          <>
            <ProfileSettings />
            <LanguageSelector />
          </>
        )}

        {activeTab === 'household' && (
          <>
            <HouseholdMembers />
            <Guidelines />
          </>
        )}

        {activeTab === 'budget' && (
          <>
            <ConversionRateSettings />
            <BudgetSettings />
            <CategoryLimitsSettings />
            <RecurringTransactionsSettings />
          </>
        )}

        {activeTab === 'data' && (
          <>
            <BackupSettings />
            <TrashView />
          </>
        )}
      </div>
    </main>
  );
}

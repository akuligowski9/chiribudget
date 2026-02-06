'use client';

import { ClipboardList } from 'lucide-react';
import { useTranslations } from 'next-intl';
import LoginScreen from '@/components/LoginScreen';
import { Skeleton, SkeletonCard } from '@/components/ui/skeleton';
import UnsortedTransactions from '@/components/UnsortedTransactions';
import { useAuth } from '@/contexts/AuthContext';
import { useDemo } from '@/hooks/useDemo';

export default function UnsortedPage() {
  const t = useTranslations();
  const { user, loading } = useAuth();
  const { isDemoMode } = useDemo();

  // Show skeleton while auth is loading (but not in demo mode)
  if (loading && !isDemoMode) {
    return (
      <main className="max-w-2xl mx-auto px-4 pt-4 pb-8">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 rounded-xl bg-gradient-to-br from-slate to-slate-light">
            <ClipboardList className="w-5 h-5 text-white" />
          </div>
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="space-y-4">
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
          <ClipboardList className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-2xl font-bold gradient-text m-0">
          {t('unsorted.title')}
        </h1>
      </div>

      <UnsortedTransactions />
    </main>
  );
}

'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDemo } from '@/hooks/useDemo';
import Header from '@/components/Header';
import TransactionHub from '@/components/TransactionHub';
import TodayTransactions from '@/components/TodayTransactions';
import HouseholdSetup from '@/components/HouseholdSetup';
import LoginScreen from '@/components/LoginScreen';
import { Skeleton } from '@/components/ui/skeleton';

export default function Home() {
  const { user, loading } = useAuth();
  const { isDemoMode } = useDemo();
  const [refreshKey, setRefreshKey] = useState(0);

  function handleTransactionAdded() {
    setRefreshKey((k) => k + 1);
  }

  // Show loading skeleton while checking auth
  if (loading) {
    return (
      <main className="max-w-2xl mx-auto px-4 pt-4 pb-8">
        <Skeleton className="h-16 w-full rounded-xl" />
        <div className="space-y-4 mt-4">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
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
      <Header />
      <div className="space-y-4 mt-4">
        <HouseholdSetup />
        <TransactionHub onTransactionAdded={handleTransactionAdded} />
        <TodayTransactions refreshKey={refreshKey} />
      </div>
    </main>
  );
}

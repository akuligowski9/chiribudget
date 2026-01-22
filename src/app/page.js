'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import HouseholdSetup from '@/components/HouseholdSetup';
import LoginScreen from '@/components/LoginScreen';
import TodayTransactions from '@/components/TodayTransactions';
import TransactionHub from '@/components/TransactionHub';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useDemo } from '@/hooks/useDemo';

export default function Home() {
  const { user, loading } = useAuth();
  const { isDemoMode, enterDemo } = useDemo();
  const [refreshKey, setRefreshKey] = useState(0);

  // Auto-enter demo mode if DEMO_ONLY env var is set
  useEffect(() => {
    const isDemoOnly = process.env.NEXT_PUBLIC_DEMO_ONLY === 'true';
    if (isDemoOnly && !isDemoMode) {
      enterDemo();
    }
  }, [isDemoMode, enterDemo]);

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

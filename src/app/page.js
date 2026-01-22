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

  // Check if this is a demo-only deployment
  const isDemoOnly = process.env.NEXT_PUBLIC_DEMO_ONLY === 'true';

  // Auto-enter demo mode if DEMO_ONLY env var is set
  useEffect(() => {
    if (isDemoOnly && !isDemoMode) {
      enterDemo();
    }
  }, [isDemoOnly, isDemoMode, enterDemo]);

  function handleTransactionAdded() {
    setRefreshKey((k) => k + 1);
  }

  // Show loading skeleton while checking auth (but not in demo-only mode)
  if (loading && !isDemoOnly) {
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

  // Show login screen ONLY if not demo-only mode and not authenticated
  if (!isDemoOnly && !user && !isDemoMode) {
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

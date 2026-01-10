'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import TransactionHub from '@/components/TransactionHub';
import TodayTransactions from '@/components/TodayTransactions';
import HouseholdSetup from '@/components/HouseholdSetup';

export default function Home() {
  const [refreshKey, setRefreshKey] = useState(0);

  function handleTransactionAdded() {
    setRefreshKey((k) => k + 1);
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

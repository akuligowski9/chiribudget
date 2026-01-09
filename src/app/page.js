'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import Guidelines from '@/components/Guidelines';
import TransactionHub from '@/components/TransactionHub';
import DemoBanner from '@/components/DemoBanner';
import HouseholdSetup from '@/components/HouseholdSetup';

export default function Home() {
  const [showGuidelines, setShowGuidelines] = useState(false);

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: 16 }}>
      <Header onToggleGuidelines={() => setShowGuidelines((s) => !s)} />
      <DemoBanner />
      {showGuidelines && <Guidelines />}
      <HouseholdSetup />
      <TransactionHub />
      <div style={{ marginTop: 18 }}>
        <a href="/dashboard">Go to Dashboard →</a>
      </div>
    </main>
  );
}

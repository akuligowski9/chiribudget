'use client';

import BudgetSettings from '@/components/BudgetSettings';
import Guidelines from '@/components/Guidelines';

export default function SettingsPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 pt-4 pb-8">
      <h1 className="text-xl font-bold text-charcoal mb-4">Settings</h1>

      <div className="space-y-4">
        <BudgetSettings />
        <Guidelines />
      </div>
    </main>
  );
}

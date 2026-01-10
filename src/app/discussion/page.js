'use client';

import { useState } from 'react';
import FlaggedReview from '@/components/FlaggedReview';
import DiscussionPanel from '@/components/DiscussionPanel';
import { CURRENCIES } from '@/lib/categories';
import { Select } from '@/components/ui/input';
import { MessageCircle } from 'lucide-react';

export default function DiscussionPage() {
  const [currency, setCurrency] = useState('USD');

  return (
    <main className="max-w-2xl mx-auto px-4 pt-4 pb-8">
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-slate to-slate-light">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold gradient-text m-0">Discussion</h1>
        </div>

        <Select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="w-24"
        >
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </div>

      <p className="text-stone text-sm mb-5">
        Review flagged transactions and discuss with your household.
      </p>

      <div className="space-y-4">
        <FlaggedReview currency={currency} />
        <DiscussionPanel currency={currency} />
      </div>
    </main>
  );
}

'use client';

import { useState } from 'react';
import FlaggedReview from '@/components/FlaggedReview';
import DiscussionPanel from '@/components/DiscussionPanel';
import LoginScreen from '@/components/LoginScreen';
import { Skeleton, SkeletonCard } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useDemo } from '@/hooks/useDemo';
import { MessageCircle } from 'lucide-react';

export default function DiscussionPage() {
  const { user, loading } = useAuth();
  const { isDemoMode } = useDemo();
  const [currency, setCurrency] = useState('USD');

  // Show skeleton while auth is loading (but not in demo mode)
  if (loading && !isDemoMode) {
    return (
      <main className="max-w-2xl mx-auto px-4 pt-4 pb-8">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 rounded-xl bg-gradient-to-br from-slate to-slate-light">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <Skeleton className="h-8 w-28" />
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
          <MessageCircle className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-2xl font-bold gradient-text m-0">Discussion</h1>
      </div>

      <p className="text-stone text-sm mb-5">
        Review flagged transactions and discuss with your household.
      </p>

      <div className="space-y-4">
        <FlaggedReview currency={currency} onCurrencyChange={setCurrency} />
        <DiscussionPanel currency={currency} />
      </div>
    </main>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import BottomNav from '@/components/BottomNav';
import Header from '@/components/Header';
import UnsortedTransactions from '@/components/UnsortedTransactions';
import { useAuth } from '@/contexts/AuthContext';
import { useDemo } from '@/hooks/useDemo';

export default function UnsortedPage() {
  const t = useTranslations();
  const router = useRouter();
  const { user, loading } = useAuth();
  const { isDemoMode } = useDemo();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!loading && !user && !isDemoMode) {
      router.push('/');
    }
  }, [user, loading, isDemoMode, router]);

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cream to-cream-light flex items-center justify-center">
        <div className="text-warm-gray">{t('common.loading')}</div>
      </div>
    );
  }

  if (!user && !isDemoMode) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream to-cream-light pb-20">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-6">
        <UnsortedTransactions />
      </main>
      <BottomNav />
    </div>
  );
}

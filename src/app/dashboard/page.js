'use client';

import { useState, useMemo } from 'react';
import { Calendar, BarChart3 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import DashboardSummary from '@/components/DashboardSummary';
import LoginScreen from '@/components/LoginScreen';
import TransactionList from '@/components/TransactionList';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton, SkeletonCard } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useDemo } from '@/hooks/useDemo';
import { useMounted } from '@/hooks/useMounted';
import { CURRENCIES } from '@/lib/categories';
import { cn } from '@/lib/utils';

const RANGE_PRESETS = ['day', 'week', 'month', 'quarter', 'year', 'custom'];

function getDateRange(preset, customStart, customEnd) {
  const today = new Date();
  let start, end;

  switch (preset) {
    case 'day':
      start = new Date(today);
      end = new Date(today);
      break;
    case 'week':
      start = new Date(today);
      start.setDate(today.getDate() - today.getDay());
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      break;
    case 'month':
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      break;
    case 'quarter':
      const qMonth = Math.floor(today.getMonth() / 3) * 3;
      start = new Date(today.getFullYear(), qMonth, 1);
      end = new Date(today.getFullYear(), qMonth + 3, 0);
      break;
    case 'year':
      start = new Date(today.getFullYear(), 0, 1);
      end = new Date(today.getFullYear(), 11, 31);
      break;
    case 'custom':
      start = customStart ? new Date(customStart) : new Date(today);
      end = customEnd ? new Date(customEnd) : new Date(today);
      break;
    default:
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  }

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

export default function DashboardPage() {
  const t = useTranslations();
  const { user, loading } = useAuth();
  const { isDemoMode } = useDemo();
  const mounted = useMounted();
  const [rangePreset, setRangePreset] = useState('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [refreshKey, setRefreshKey] = useState(0);

  const { startDate, endDate } = useMemo(
    () => getDateRange(rangePreset, customStart, customEnd),
    [rangePreset, customStart, customEnd]
  );

  // Trigger refresh when transactions are updated
  const handleTransactionUpdate = () => {
    setRefreshKey((k) => k + 1);
  };

  // Show skeleton while auth is loading (but not in demo mode)
  if (!mounted || (loading && !isDemoMode)) {
    return (
      <main className="max-w-2xl mx-auto px-4 pt-4 pb-8">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 rounded-xl bg-gradient-to-br from-slate to-slate-light">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <Skeleton className="h-8 w-32" />
        </div>
        <SkeletonCard className="mb-5" />
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
          <BarChart3 className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-2xl font-bold gradient-text m-0">
          {t('dashboard.title')}
        </h1>
      </div>

      <Card className="mb-5">
        <CardContent className="pt-5">
          <div className="flex flex-wrap gap-2 items-center">
            {RANGE_PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={() => setRangePreset(preset)}
                className={cn(
                  'min-h-[44px] px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-200',
                  rangePreset === preset
                    ? 'bg-gradient-to-r from-slate to-slate-light text-white shadow-md shadow-slate/20'
                    : 'bg-white/50 text-stone hover:bg-white/80 hover:text-charcoal border border-white/60'
                )}
                aria-pressed={rangePreset === preset}
              >
                {t(`dashboard.${preset}`)}
              </button>
            ))}

            <div className="ml-auto">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-24 h-10 px-3 text-sm font-bold rounded-xl cursor-pointer transition-all duration-200 bg-gradient-to-r from-accent to-accent-light text-white border-2 border-accent/30 shadow-md shadow-accent/25 hover:shadow-lg hover:shadow-accent/35 hover:scale-105"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c} className="bg-white text-charcoal">
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {rangePreset === 'custom' && (
            <div className="flex gap-3 mt-4 flex-wrap">
              <div className="space-y-1.5">
                <label
                  htmlFor="custom-start"
                  className="text-xs font-semibold text-charcoal/70"
                >
                  {t('dashboard.startDate')}
                </label>
                <Input
                  id="custom-start"
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-auto"
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="custom-end"
                  className="text-xs font-semibold text-charcoal/70"
                >
                  {t('dashboard.endDate')}
                </label>
                <Input
                  id="custom-end"
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-auto"
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 mt-4 text-sm text-stone">
            <Calendar className="w-4 h-4 text-slate" />
            <span className="font-medium">{startDate}</span>
            <span className="text-warm-gray">{t('dashboard.to')}</span>
            <span className="font-medium">{endDate}</span>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <DashboardSummary
          startDate={startDate}
          endDate={endDate}
          currency={currency}
          refreshKey={refreshKey}
        />
        <TransactionList
          startDate={startDate}
          endDate={endDate}
          currency={currency}
          onTransactionUpdate={handleTransactionUpdate}
        />
      </div>
    </main>
  );
}

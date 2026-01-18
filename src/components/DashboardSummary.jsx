'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { TrendingUp, TrendingDown, Wallet, PieChart } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { getDemoMode } from '@/lib/auth';
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  PAYERS,
} from '@/lib/categories';
import { convertAmount } from '@/lib/currency';
import { getDemoTransactions } from '@/lib/demoStore';
import { supabase } from '@/lib/supabaseClient';
import { cn } from '@/lib/utils';

// Map category values to translation keys
const CATEGORY_KEYS = {
  'Fixed Expenses': 'fixedExpenses',
  'Rent/Mortgages': 'rentMortgages',
  Food: 'food',
  Dogs: 'dogs',
  'Holidays & Birthdays': 'holidaysBirthdays',
  Adventure: 'adventure',
  Unexpected: 'unexpected',
  Salary: 'salary',
  Investments: 'investments',
  Extra: 'extra',
};

// Dynamic import to avoid SSR issues with Recharts
const ExpenseDonutChart = dynamic(
  () =>
    import('@/components/SpendingCharts').then((mod) => mod.ExpenseDonutChart),
  { ssr: false, loading: () => <ChartPlaceholder /> }
);
const SpendingTrendChart = dynamic(
  () =>
    import('@/components/SpendingCharts').then((mod) => mod.SpendingTrendChart),
  { ssr: false, loading: () => <ChartPlaceholder /> }
);

function ChartPlaceholder() {
  return (
    <Card>
      <CardContent className="h-[300px] flex items-center justify-center">
        <div className="text-warm-gray text-sm">Loading chart...</div>
      </CardContent>
    </Card>
  );
}

function sum(list) {
  return list.reduce((s, x) => s + Number(x || 0), 0);
}

export default function DashboardSummary({
  startDate,
  endDate,
  currency, // Display currency (for conversion)
  refreshKey,
}) {
  const t = useTranslations();
  const { conversionRate } = useAuth();
  const [demoMode, setDemoMode] = useState(false);
  const [householdId, setHouseholdId] = useState(null);
  const [rawRows, setRawRows] = useState([]);

  useEffect(() => {
    setDemoMode(getDemoMode());
    (async () => {
      if (getDemoMode()) {
        // Get ALL demo transactions (both currencies) for date range
        const month = startDate.slice(0, 7);
        const usdTx = getDemoTransactions({ month, currency: 'USD' });
        const penTx = getDemoTransactions({ month, currency: 'PEN' });
        const allTx = [...usdTx, ...penTx];
        const filtered = allTx.filter(
          (t) => t.txn_date >= startDate && t.txn_date <= endDate
        );
        setRawRows(filtered);
        return;
      }

      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (!user) return;

      const { data: p } = await supabase
        .from('profiles')
        .select('household_id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (!p?.household_id) return;
      setHouseholdId(p.household_id);

      // Fetch ALL transactions (both currencies) for date range
      const { data: tx, error } = await supabase
        .from('transactions')
        .select('txn_date,amount,category,payer,currency,is_flagged')
        .eq('household_id', p.household_id)
        .gte('txn_date', startDate)
        .lte('txn_date', endDate)
        .is('deleted_at', null);

      if (!error) setRawRows(tx || []);
    })();
  }, [startDate, endDate, refreshKey]);

  // Convert all amounts to display currency
  const rows = useMemo(() => {
    return rawRows.map((r) => ({
      ...r,
      displayAmount: convertAmount(
        Number(r.amount),
        r.currency,
        currency,
        conversionRate
      ),
    }));
  }, [rawRows, currency, conversionRate]);

  // Use displayAmount (converted) for all calculations
  const incomeRows = rows.filter((r) => r.displayAmount > 0);
  const expenseRows = rows.filter((r) => r.displayAmount < 0);

  const incomeByCat = useMemo(() => {
    const m = Object.fromEntries(INCOME_CATEGORIES.map((c) => [c, 0]));
    for (const r of incomeRows)
      m[r.category] = (m[r.category] || 0) + r.displayAmount;
    return m;
  }, [incomeRows]);

  const expenseByCat = useMemo(() => {
    const m = Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c, 0]));
    for (const r of expenseRows)
      m[r.category] = (m[r.category] || 0) + Math.abs(r.displayAmount);
    return m;
  }, [expenseRows]);

  const netByPayer = useMemo(() => {
    const m = Object.fromEntries(PAYERS.map((p) => [p, 0]));
    for (const r of rows) m[r.payer] = (m[r.payer] || 0) + r.displayAmount;
    return m;
  }, [rows]);

  const totalIncome = sum(Object.values(incomeByCat));
  const totalExpenses = sum(Object.values(expenseByCat));
  const net = totalIncome - totalExpenses;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <PieChart className="w-5 h-5 text-slate" />
            <CardTitle>{t('dashboard.summary')}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {!demoMode && !householdId && (
            <p className="text-warm-gray text-sm">
              {t('dashboard.loginForData')}
            </p>
          )}

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-gradient-to-br from-success/15 to-success/5 rounded-xl p-4 border border-success/20">
              <div className="flex items-center gap-2 text-success mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wide">
                  {t('dashboard.income')}
                </span>
              </div>
              <div className="text-xl font-bold text-success">
                {currency} {totalIncome.toFixed(2)}
              </div>
            </div>

            <div className="bg-gradient-to-br from-error/15 to-error/5 rounded-xl p-4 border border-error/20">
              <div className="flex items-center gap-2 text-error mb-1">
                <TrendingDown className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wide">
                  {t('dashboard.expenses')}
                </span>
              </div>
              <div className="text-xl font-bold text-error">
                {currency} {totalExpenses.toFixed(2)}
              </div>
            </div>

            <div
              className={cn(
                'rounded-xl p-4 border',
                net >= 0
                  ? 'bg-gradient-to-br from-slate/15 to-slate/5 border-slate/20'
                  : 'bg-gradient-to-br from-warning/15 to-warning/5 border-warning/20'
              )}
            >
              <div
                className={cn(
                  'flex items-center gap-2 mb-1',
                  net >= 0 ? 'text-slate' : 'text-warning'
                )}
              >
                <Wallet className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wide">
                  {t('dashboard.net')}
                </span>
              </div>
              <div
                className={cn(
                  'text-xl font-bold',
                  net >= 0 ? 'text-slate' : 'text-warning'
                )}
              >
                {currency} {net.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Category Breakdowns */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-white/40 rounded-xl p-4 border border-white/60">
              <div className="font-semibold text-charcoal mb-3 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-success" />
                {t('dashboard.incomeByCategory')}
              </div>
              <div className="space-y-2">
                {INCOME_CATEGORIES.map((c) => {
                  const val = Number(incomeByCat[c] || 0);
                  const pct = totalIncome > 0 ? (val / totalIncome) * 100 : 0;
                  return (
                    <div key={c}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-stone">
                          {t(`categories.${CATEGORY_KEYS[c]}`)}
                        </span>
                        <span className="font-semibold text-success">
                          {currency} {val.toFixed(2)}
                        </span>
                      </div>
                      <div className="h-1.5 bg-success/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-success to-emerald-400 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white/40 rounded-xl p-4 border border-white/60">
              <div className="font-semibold text-charcoal mb-3 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-error" />
                {t('dashboard.expensesByCategory')}
              </div>
              <div className="space-y-2">
                {EXPENSE_CATEGORIES.map((c) => {
                  const val = Number(expenseByCat[c] || 0);
                  const pct =
                    totalExpenses > 0 ? (val / totalExpenses) * 100 : 0;
                  return (
                    <div key={c}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-stone">
                          {t(`categories.${CATEGORY_KEYS[c]}`)}
                        </span>
                        <span className="font-semibold text-error">
                          {currency} {val.toFixed(2)}
                        </span>
                      </div>
                      <div className="h-1.5 bg-error/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-error to-rose-400 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Net by Payer */}
          <div className="bg-white/40 rounded-xl p-4 border border-white/60">
            <div className="font-semibold text-charcoal mb-3">
              {t('dashboard.netByPayer')}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {PAYERS.map((p) => {
                const val = Number(netByPayer[p] || 0);
                return (
                  <div
                    key={p}
                    className={cn(
                      'rounded-lg p-3 text-center',
                      val >= 0
                        ? 'bg-success/10 border border-success/20'
                        : 'bg-error/10 border border-error/20'
                    )}
                  >
                    <div className="text-xs text-stone font-medium mb-1 capitalize">
                      {t(`payers.${p.toLowerCase()}`)}
                    </div>
                    <div
                      className={cn(
                        'font-bold',
                        val >= 0 ? 'text-success' : 'text-error'
                      )}
                    >
                      {currency} {val.toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <ExpenseDonutChart
          expenseByCat={expenseByCat}
          currency={currency}
          totalExpenses={totalExpenses}
        />
        <SpendingTrendChart
          rows={rows}
          currency={currency}
          startDate={startDate}
          endDate={endDate}
        />
      </div>
    </>
  );
}

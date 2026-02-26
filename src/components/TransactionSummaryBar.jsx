'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatCurrency } from '@/lib/formatCurrency';

/**
 * Summary bar showing transaction count and totals.
 */
export default function TransactionSummaryBar({
  count,
  totalIncome,
  totalExpenses,
  currency,
}) {
  const t = useTranslations();

  return (
    <div className="flex flex-wrap gap-4 mb-4 text-sm">
      <div className="bg-white/50 rounded-lg px-3 py-1.5 border border-white/60">
        <span className="text-stone">
          {count === 1
            ? t('transaction.transactionCountSingular', { count })
            : t('transaction.transactionCount', { count })}
        </span>
      </div>
      <div className="flex items-center gap-1.5 bg-success/10 rounded-lg px-3 py-1.5 border border-success/20">
        <TrendingUp className="w-3.5 h-3.5 text-success" />
        <span className="font-semibold text-success">
          +{currency} {formatCurrency(totalIncome)}
        </span>
      </div>
      <div className="flex items-center gap-1.5 bg-error/10 rounded-lg px-3 py-1.5 border border-error/20">
        <TrendingDown className="w-3.5 h-3.5 text-error" />
        <span className="font-semibold text-error">
          -{currency} {formatCurrency(totalExpenses)}
        </span>
      </div>
    </div>
  );
}

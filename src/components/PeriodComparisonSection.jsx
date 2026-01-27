'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/lib/categories';
import {
  calculateCategoryComparison,
  generateInsights,
} from '@/lib/comparisonUtils';
import { formatCurrency } from '@/lib/format';

/**
 * Collapsible comparison section showing full period-over-period analysis
 */
export default function PeriodComparisonSection({
  currentData,
  previousData,
  previousPeriodLabel,
  currency,
}) {
  const t = useTranslations();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!previousData) {
    return null;
  }

  // Calculate comparisons
  const expenseComparison = calculateCategoryComparison(
    currentData.expenseByCat,
    previousData.expenseByCat
  );
  const incomeComparison = calculateCategoryComparison(
    currentData.incomeByCat,
    previousData.incomeByCat
  );

  // Generate insights
  const expenseInsights = generateInsights(expenseComparison, 'expense', 10);
  const incomeInsights = generateInsights(incomeComparison, 'income', 10);
  const allInsights = [...expenseInsights, ...incomeInsights];

  return (
    <Card>
      <CardHeader>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between hover:opacity-70 transition-opacity"
          aria-expanded={isExpanded}
        >
          <CardTitle className="text-lg">
            {t('dashboard.periodComparison')}
          </CardTitle>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-warm-gray" />
          ) : (
            <ChevronDown className="w-5 h-5 text-warm-gray" />
          )}
        </button>
        <p className="text-sm text-warm-gray/70 mt-1">
          {t('dashboard.comparingTo', { period: previousPeriodLabel })}
        </p>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-6">
          {/* Expense Comparison Table */}
          <div>
            <h3 className="text-sm font-medium text-slate mb-3">
              {t('dashboard.expenses')}
            </h3>
            <div className="space-y-2">
              {EXPENSE_CATEGORIES.filter(
                (cat) =>
                  currentData.expenseByCat[cat] > 0 ||
                  previousData.expenseByCat[cat] > 0
              ).map((category) => {
                const metrics = expenseComparison[category];
                const current = currentData.expenseByCat[category] || 0;
                const previous = previousData.expenseByCat[category] || 0;

                return (
                  <ComparisonRow
                    key={category}
                    category={t(`categories.${category}`)}
                    current={current}
                    previous={previous}
                    metrics={metrics}
                    currency={currency}
                    type="expense"
                  />
                );
              })}
            </div>
          </div>

          {/* Income Comparison Table */}
          <div>
            <h3 className="text-sm font-medium text-slate mb-3">
              {t('dashboard.income')}
            </h3>
            <div className="space-y-2">
              {INCOME_CATEGORIES.filter(
                (cat) =>
                  currentData.incomeByCat[cat] > 0 ||
                  previousData.incomeByCat[cat] > 0
              ).map((category) => {
                const metrics = incomeComparison[category];
                const current = currentData.incomeByCat[category] || 0;
                const previous = previousData.incomeByCat[category] || 0;

                return (
                  <ComparisonRow
                    key={category}
                    category={t(`categories.${category}`)}
                    current={current}
                    previous={previous}
                    metrics={metrics}
                    currency={currency}
                    type="income"
                  />
                );
              })}
            </div>
          </div>

          {/* Key Insights */}
          {allInsights.length > 0 && (
            <div className="pt-4 border-t border-white/30">
              <h3 className="text-sm font-medium text-slate mb-3">
                {t('dashboard.keyInsights')}
              </h3>
              <ul className="space-y-2">
                {allInsights.slice(0, 5).map((insight, idx) => (
                  <li
                    key={idx}
                    className="text-sm text-warm-gray flex items-start gap-2"
                  >
                    {insight.type === 'increase' ? (
                      <TrendingUp className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    ) : insight.type === 'decrease' ? (
                      <TrendingDown className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    ) : null}
                    <span>
                      {insight.type === 'new' ? (
                        <>
                          <strong>{insight.category}</strong> is a new category
                        </>
                      ) : (
                        <>
                          <strong>{insight.category}</strong> {insight.change}{' '}
                          by{' '}
                          <strong>{insight.percentChange.toFixed(0)}%</strong>
                        </>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {allInsights.length === 0 && (
            <div className="pt-4 border-t border-white/30">
              <p className="text-sm text-warm-gray/70 text-center">
                {t('dashboard.noSignificantChanges')}
              </p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

/**
 * Single row in comparison table
 */
function ComparisonRow({
  category,
  current,
  previous,
  metrics,
  currency,
  type: _type,
}) {
  const { percentChange, trend, isNew } = metrics;

  // Determine color for percentage display
  let percentClass = 'text-stone';
  if (!isNew && percentChange !== null) {
    if (type === 'expense') {
      if (trend === 'down') {
        percentClass = 'text-success';
      } else if (Math.abs(percentChange) >= 20) {
        percentClass = 'text-error';
      } else {
        percentClass = 'text-warning';
      }
    } else {
      // Income
      if (trend === 'up') {
        percentClass = 'text-success';
      } else if (Math.abs(percentChange) >= 20) {
        percentClass = 'text-error';
      } else {
        percentClass = 'text-warning';
      }
    }
  }

  return (
    <div className="grid grid-cols-[1fr,auto,auto,auto] gap-3 items-center text-sm">
      {/* Category name */}
      <span className="text-warm-gray truncate">{category}</span>

      {/* Current amount */}
      <span className="text-slate font-medium text-right min-w-[70px]">
        {formatCurrency(current, currency)}
      </span>

      {/* Previous amount */}
      <span className="text-warm-gray/70 text-right min-w-[70px]">
        {formatCurrency(previous, currency)}
      </span>

      {/* Percent change */}
      <span className={`${percentClass} font-medium text-right min-w-[60px]`}>
        {isNew ? (
          <span className="text-stone">NEW</span>
        ) : percentChange === null || percentChange === 0 ? (
          <span className="text-stone/50">—</span>
        ) : (
          <>
            {trend === 'up' ? '+' : ''}
            {percentChange.toFixed(0)}%
          </>
        )}
      </span>
    </div>
  );
}

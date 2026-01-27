'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';
import {
  calculateCategoryDelta,
  isSignificantChange,
} from '@/lib/comparisonUtils';

/**
 * Inline badge showing percentage change for a category
 * Only renders if the change is significant (>5% by default)
 */
export default function CategoryComparisonBadge({
  current,
  previous,
  type = 'expense',
  threshold = 5,
  currency: _currency,
}) {
  const metrics = calculateCategoryDelta(current, previous);
  const { percentChange, trend, isNew } = metrics;

  // Don't render if change is not significant
  if (!isNew && !isSignificantChange(percentChange, metrics.delta, threshold)) {
    return null;
  }

  // Handle NEW category
  if (isNew) {
    return (
      <span
        className="text-xs font-medium px-1.5 py-0.5 rounded bg-stone/20 text-stone"
        aria-label="New category"
      >
        NEW
      </span>
    );
  }

  // Determine color based on type and trend
  // For expenses: decrease (↓) is good (green), increase (↑) is bad (amber/red)
  // For income: increase (↑) is good (green), decrease (↓) is bad (amber/red)
  let colorClass;
  let Icon;

  if (type === 'expense') {
    if (trend === 'down') {
      // Decreased expenses = good
      colorClass = 'bg-success/20 text-success';
      Icon = TrendingDown;
    } else {
      // Increased expenses = bad
      if (Math.abs(percentChange) >= 20) {
        colorClass = 'bg-error/20 text-error';
      } else {
        colorClass = 'bg-warning/20 text-warning';
      }
      Icon = TrendingUp;
    }
  } else {
    // Income
    if (trend === 'up') {
      // Increased income = good
      colorClass = 'bg-success/20 text-success';
      Icon = TrendingUp;
    } else {
      // Decreased income = bad
      if (Math.abs(percentChange) >= 20) {
        colorClass = 'bg-error/20 text-error';
      } else {
        colorClass = 'bg-warning/20 text-warning';
      }
      Icon = TrendingDown;
    }
  }

  const displayPercent = Math.abs(percentChange).toFixed(0);
  const trendLabel = trend === 'up' ? 'increased' : 'decreased';
  const ariaLabel = `${type} ${trendLabel} by ${displayPercent}%`;

  return (
    <span
      className={`inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded ${colorClass}`}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <Icon className="w-3 h-3" aria-hidden="true" />
      {displayPercent}%
    </span>
  );
}

/**
 * Comparison utilities for period-over-period analysis
 */

import {
  subDays,
  subMonths,
  subQuarters,
  subYears,
  differenceInDays,
  format,
  lastDayOfMonth,
  min,
} from 'date-fns';

/**
 * Calculate previous period date range based on current selection
 *
 * @param {string} preset - Date range preset ('day', 'week', 'month', 'quarter', 'year', 'custom')
 * @param {string} startDate - Current period start date (YYYY-MM-DD)
 * @param {string} endDate - Current period end date (YYYY-MM-DD)
 * @param {string} customStart - Custom range start (for custom preset)
 * @param {string} customEnd - Custom range end (for custom preset)
 * @returns {{ previousStartDate: string, previousEndDate: string } | null}
 */
export function getPreviousPeriodRange(
  preset,
  startDate,
  endDate,
  _customStart,
  _customEnd
) {
  if (!startDate || !endDate) return null;

  const start = new Date(startDate);
  const end = new Date(endDate);

  let previousStart, previousEnd;

  switch (preset) {
    case 'day':
      // Previous day
      previousStart = subDays(start, 1);
      previousEnd = subDays(end, 1);
      break;

    case 'week':
      // Previous week (7 days back)
      previousStart = subDays(start, 7);
      previousEnd = subDays(end, 7);
      break;

    case 'month':
      // Previous month (handles month-end edge cases)
      previousStart = subMonths(start, 1);
      previousEnd = subMonths(end, 1);
      // Handle month-end edge cases (e.g., Jan 31 → Feb 28)
      const lastDayOfPrevMonth = lastDayOfMonth(previousStart);
      previousEnd = min([previousEnd, lastDayOfPrevMonth]);
      break;

    case 'quarter':
      // Previous quarter (3 months back)
      previousStart = subQuarters(start, 1);
      previousEnd = subQuarters(end, 1);
      break;

    case 'year':
      // Previous year (same dates, previous year)
      previousStart = subYears(start, 1);
      previousEnd = subYears(end, 1);
      break;

    case 'custom':
      // Custom range: shift backward by range duration
      const duration = differenceInDays(end, start);
      previousStart = subDays(start, duration + 1);
      previousEnd = subDays(end, duration + 1);
      break;

    default:
      return null;
  }

  return {
    previousStartDate: format(previousStart, 'yyyy-MM-dd'),
    previousEndDate: format(previousEnd, 'yyyy-MM-dd'),
  };
}

/**
 * Calculate comparison metrics for a single category
 *
 * @param {number} currentAmount - Current period amount
 * @param {number} previousAmount - Previous period amount
 * @returns {{ current: number, previous: number, delta: number, percentChange: number | null, trend: string, isNew: boolean }}
 */
export function calculateCategoryDelta(currentAmount, previousAmount) {
  const current = Number(currentAmount) || 0;
  const previous = Number(previousAmount) || 0;
  const delta = current - previous;

  let percentChange = null;
  let isNew = false;

  if (previous === 0 && current === 0) {
    // No spending in either period
    percentChange = 0;
  } else if (previous === 0 && current > 0) {
    // New category (didn't exist in previous period)
    isNew = true;
    percentChange = null;
  } else if (previous > 0 && current === 0) {
    // Category dropped to zero
    percentChange = -100;
  } else {
    // Normal case
    percentChange = ((delta / previous) * 100).toFixed(1);
    percentChange = parseFloat(percentChange);
  }

  // Determine trend
  let trend = 'stable';
  if (delta > 0) trend = 'up';
  if (delta < 0) trend = 'down';

  return {
    current,
    previous,
    delta,
    percentChange,
    trend,
    isNew,
  };
}

/**
 * Calculate comparison data for all categories
 *
 * @param {Object} currentByCat - Current period category totals { category: amount }
 * @param {Object} previousByCat - Previous period category totals { category: amount }
 * @returns {Object} - Comparison data { category: comparisonMetrics }
 */
export function calculateCategoryComparison(currentByCat, previousByCat) {
  const comparison = {};

  // Get all unique categories from both periods
  const allCategories = new Set([
    ...Object.keys(currentByCat),
    ...Object.keys(previousByCat),
  ]);

  for (const category of allCategories) {
    const current = currentByCat[category] || 0;
    const previous = previousByCat[category] || 0;

    comparison[category] = {
      ...calculateCategoryDelta(current, previous),
      isSignificant: false, // Will be set by isSignificantChange()
    };
  }

  return comparison;
}

/**
 * Determine if a change is significant enough to display
 *
 * @param {number | null} percentChange - Percentage change
 * @param {number} absoluteDelta - Absolute change amount
 * @param {number} threshold - Percentage threshold (default 5%)
 * @returns {boolean}
 */
export function isSignificantChange(
  percentChange,
  absoluteDelta,
  threshold = 5
) {
  if (percentChange === null) return true; // NEW categories are significant
  if (Math.abs(percentChange) >= threshold) return true;
  return false;
}

/**
 * Generate human-readable insights from comparison data
 *
 * @param {Object} comparisonData - Comparison metrics by category
 * @param {string} _type - 'expense' or 'income' (reserved for future use)
 * @param {number} threshold - Percentage threshold for insights (default 10%)
 * @returns {Array<{ category: string, change: string, type: string }>}
 */
export function generateInsights(
  comparisonData,
  _type = 'expense',
  threshold = 10
) {
  const insights = [];

  for (const [category, metrics] of Object.entries(comparisonData)) {
    if (metrics.isNew) {
      insights.push({
        category,
        change: 'new',
        type: 'new',
        percentChange: null,
      });
    } else if (
      metrics.percentChange !== null &&
      Math.abs(metrics.percentChange) >= threshold
    ) {
      insights.push({
        category,
        change: metrics.trend === 'up' ? 'increased' : 'decreased',
        type: metrics.trend === 'up' ? 'increase' : 'decrease',
        percentChange: Math.abs(metrics.percentChange),
      });
    }
  }

  // Sort by absolute percentage change (descending)
  insights.sort((a, b) => {
    if (a.percentChange === null) return 1;
    if (b.percentChange === null) return -1;
    return Math.abs(b.percentChange) - Math.abs(a.percentChange);
  });

  return insights;
}

/**
 * Format previous period label for display
 *
 * @param {string} previousStartDate - Start date (YYYY-MM-DD)
 * @param {string} previousEndDate - End date (YYYY-MM-DD)
 * @returns {string} - Formatted label (e.g., "Dec 1-31, 2025")
 */
export function formatPreviousPeriodLabel(previousStartDate, previousEndDate) {
  if (!previousStartDate || !previousEndDate) return '';

  const start = new Date(previousStartDate);
  const end = new Date(previousEndDate);

  // If same day, show single date
  if (previousStartDate === previousEndDate) {
    return format(start, 'MMM d, yyyy');
  }

  // If same month and year, show compact format
  const isSameMonth =
    start.getMonth() === end.getMonth() &&
    start.getFullYear() === end.getFullYear();

  if (isSameMonth) {
    return `${format(start, 'MMM d')}-${format(end, 'd, yyyy')}`;
  }

  // Different months or years, show full range
  return `${format(start, 'MMM d, yyyy')} - ${format(end, 'MMM d, yyyy')}`;
}

// Flag mode constants
export const FLAG_MODES = {
  OFF: 'off',
  CROSSING: 'crossing',
  ALL_AFTER: 'all_after',
};

/**
 * Calculate spending status for each category with a limit
 * @param {Array} transactions - Array of transactions with displayAmount and category
 * @param {Object} limits - Category limits object { "Food": { limit: 800, flagMode: "off" }, ... }
 * @param {string} displayCurrency - Currency to display amounts in
 * @param {number} conversionRate - USD to PEN conversion rate
 * @returns {Object} Status per category { "Food": { spent: 500, limit: 800, percentage: 62.5, status: "normal" }, ... }
 */
export function calculateCategoryStatus(
  transactions,
  limits,
  _displayCurrency,
  _conversionRate
) {
  const status = {};

  // Get categories that have limits set
  const categoriesWithLimits = Object.keys(limits).filter(
    (cat) => limits[cat]?.limit > 0
  );

  for (const category of categoriesWithLimits) {
    const limitConfig = limits[category];
    const limit = Number(limitConfig.limit);

    // Sum expenses in this category (expenses are negative, so take absolute value)
    const spent = transactions
      .filter((t) => t.category === category && t.displayAmount < 0)
      .reduce((sum, t) => sum + Math.abs(t.displayAmount), 0);

    const percentage = limit > 0 ? (spent / limit) * 100 : 0;

    // Determine status based on percentage
    let statusLevel;
    if (percentage >= 100) {
      statusLevel = 'exceeded';
    } else if (percentage >= 80) {
      statusLevel = 'approaching';
    } else {
      statusLevel = 'normal';
    }

    status[category] = {
      spent,
      limit,
      percentage,
      status: statusLevel,
      flagMode: limitConfig.flagMode || FLAG_MODES.OFF,
      remaining: Math.max(0, limit - spent),
    };
  }

  return status;
}

/**
 * Evaluate which transactions should be flagged based on category limits
 * @param {Array} transactions - Array of transactions sorted by date (oldest first)
 * @param {Object} limits - Category limits object
 * @param {number} conversionRate - USD to PEN conversion rate
 * @returns {Object} { transactionIdsToFlag: string[], crossingTransactionId: string | null }
 */
export function evaluateCategoryFlags(transactions, limits, conversionRate) {
  const result = {
    transactionIdsToFlag: [],
    categoryInfo: {},
  };

  // Get categories with active flagging (not 'off')
  const activeCategories = Object.entries(limits)
    .filter(
      ([, config]) =>
        config?.limit > 0 &&
        config?.flagMode &&
        config.flagMode !== FLAG_MODES.OFF
    )
    .map(([category]) => category);

  if (activeCategories.length === 0) {
    return result;
  }

  // Track running totals per category
  const runningTotals = {};
  const crossedThreshold = {};

  for (const category of activeCategories) {
    runningTotals[category] = 0;
    crossedThreshold[category] = false;
    result.categoryInfo[category] = {
      crossingTransactionId: null,
      flaggedAfterIds: [],
    };
  }

  // Sort transactions by date (oldest first) to process in chronological order
  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(a.txn_date) - new Date(b.txn_date)
  );

  for (const txn of sortedTransactions) {
    const category = txn.category;

    // Skip if this category doesn't have active flagging
    if (!activeCategories.includes(category)) continue;

    // Skip income (positive amounts)
    if (txn.amount >= 0) continue;

    const limitConfig = limits[category];
    const limit = Number(limitConfig.limit);
    const flagMode = limitConfig.flagMode;

    // Convert amount to USD equivalent for comparison
    // (limits are stored in USD, so we need to convert PEN to USD)
    const amountInUsd =
      txn.currency === 'USD'
        ? Math.abs(txn.amount)
        : Math.abs(txn.amount) / conversionRate;

    runningTotals[category] += amountInUsd;

    // Check if this transaction crosses the threshold
    if (!crossedThreshold[category] && runningTotals[category] > limit) {
      crossedThreshold[category] = true;
      result.categoryInfo[category].crossingTransactionId = txn.id;

      if (
        flagMode === FLAG_MODES.CROSSING ||
        flagMode === FLAG_MODES.ALL_AFTER
      ) {
        result.transactionIdsToFlag.push(txn.id);
      }
    } else if (
      crossedThreshold[category] &&
      flagMode === FLAG_MODES.ALL_AFTER
    ) {
      // Flag all transactions after threshold is crossed
      result.transactionIdsToFlag.push(txn.id);
      result.categoryInfo[category].flaggedAfterIds.push(txn.id);
    }
  }

  return result;
}

/**
 * Check if a new transaction should be flagged based on category limits
 * @param {Object} newTransaction - The new transaction being added
 * @param {Array} existingTransactions - Existing transactions for the month
 * @param {Object} limits - Category limits object
 * @param {number} conversionRate - USD to PEN conversion rate
 * @returns {Object} { shouldFlag: boolean, reason: string | null }
 */
export function shouldFlagNewTransaction(
  newTransaction,
  existingTransactions,
  limits,
  conversionRate
) {
  const category = newTransaction.category;
  const limitConfig = limits[category];

  // No limit set or flagging is off
  if (!limitConfig?.limit || limitConfig.flagMode === FLAG_MODES.OFF) {
    return { shouldFlag: false, reason: null };
  }

  const limit = Number(limitConfig.limit);
  const flagMode = limitConfig.flagMode;

  // Skip income
  if (newTransaction.amount >= 0) {
    return { shouldFlag: false, reason: null };
  }

  // Calculate current spending in this category (before adding new transaction)
  const currentSpending = existingTransactions
    .filter(
      (t) =>
        t.category === category && t.amount < 0 && t.id !== newTransaction.id // exclude if updating
    )
    .reduce((sum, t) => {
      const amountInUsd =
        t.currency === 'USD'
          ? Math.abs(t.amount)
          : Math.abs(t.amount) / conversionRate;
      return sum + amountInUsd;
    }, 0);

  // Convert new transaction amount to USD
  const newAmountInUsd =
    newTransaction.currency === 'USD'
      ? Math.abs(newTransaction.amount)
      : Math.abs(newTransaction.amount) / conversionRate;

  const newTotal = currentSpending + newAmountInUsd;
  const wasOverLimit = currentSpending > limit;
  const isNowOverLimit = newTotal > limit;

  if (flagMode === FLAG_MODES.CROSSING) {
    // Only flag if this transaction crosses the threshold
    if (!wasOverLimit && isNowOverLimit) {
      return { shouldFlag: true, reason: 'over_category_limit' };
    }
  } else if (flagMode === FLAG_MODES.ALL_AFTER) {
    // Flag if already over or this crosses the threshold
    if (wasOverLimit || isNowOverLimit) {
      return { shouldFlag: true, reason: 'over_category_limit' };
    }
  }

  return { shouldFlag: false, reason: null };
}

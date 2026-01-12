import demoTxnsJson from '../../demo/transactions.json';
import { USD_THRESHOLD, FX_USD_TO_PEN } from './categories';

// In-memory store for demo mode
let demoTransactions = [...demoTxnsJson];
let demoThresholds = {
  usdThreshold: USD_THRESHOLD,
  fxRate: FX_USD_TO_PEN,
};

// Get demo transactions filtered by month and currency
export function getDemoTransactions({ month, currency }) {
  return demoTransactions.filter(
    (t) => (t.txn_date || '').startsWith(month) && t.currency === currency
  );
}

// Get all demo transactions (unfiltered)
export function getAllDemoTransactions() {
  return demoTransactions;
}

// Update a demo transaction
export function updateDemoTransaction(id, updates) {
  demoTransactions = demoTransactions.map((t) =>
    t.id === id ? { ...t, ...updates } : t
  );
}

// Get current demo thresholds
export function getDemoThresholds() {
  return { ...demoThresholds };
}

// Set demo thresholds
export function setDemoThresholds({ usdThreshold, fxRate }) {
  demoThresholds = { usdThreshold, fxRate };
}

// Get transactions that would be affected by threshold change
export function getThresholdChangePreview({ usdThreshold, fxRate }) {
  const penThreshold = Math.round(usdThreshold * fxRate);
  const toFlag = [];
  const toUnflag = [];

  for (const t of demoTransactions) {
    const threshold = t.currency === 'USD' ? usdThreshold : penThreshold;
    const absAmount = Math.abs(t.amount);
    const isOverThreshold = absAmount > threshold;

    // Transactions to flag: over new threshold, not already flagged, not resolved
    if (isOverThreshold && !t.is_flagged && !t.resolved_at) {
      toFlag.push(t);
    }

    // Transactions to unflag: under new threshold, currently flagged due to threshold, not resolved
    if (
      !isOverThreshold &&
      t.is_flagged &&
      !t.resolved_at &&
      (t.flag_reason === 'over_threshold_expense' ||
        t.flag_reason === 'over_threshold_income')
    ) {
      toUnflag.push(t);
    }
  }

  return { toFlag, toUnflag };
}

// Apply flag/unflag changes to specific transaction IDs
export function applyThresholdChanges({ toFlagIds, toUnflagIds }) {
  let flaggedCount = 0;
  let unflaggedCount = 0;

  demoTransactions = demoTransactions.map((t) => {
    // Flag this transaction
    if (toFlagIds.includes(t.id)) {
      flaggedCount++;
      return {
        ...t,
        is_flagged: true,
        flag_reason:
          t.amount > 0 ? 'over_threshold_income' : 'over_threshold_expense',
      };
    }

    // Unflag this transaction
    if (toUnflagIds.includes(t.id)) {
      unflaggedCount++;
      return {
        ...t,
        is_flagged: false,
        flag_reason: null,
      };
    }

    return t;
  });

  return { flaggedCount, unflaggedCount };
}

// Re-flag demo transactions based on new thresholds (legacy - flags all, doesn't unflag)
// Returns count of newly flagged transactions
// Preserves: already flagged transactions, already resolved/discussed transactions
export function reflagDemoTransactions({ usdThreshold, fxRate }) {
  const penThreshold = Math.round(usdThreshold * fxRate);
  let flaggedCount = 0;

  demoTransactions = demoTransactions.map((t) => {
    // Skip if already flagged or already resolved/discussed
    if (t.is_flagged || t.resolved_at) {
      return t;
    }

    // Determine threshold based on currency
    const threshold = t.currency === 'USD' ? usdThreshold : penThreshold;
    const absAmount = Math.abs(t.amount);

    // Check if over threshold
    if (absAmount > threshold) {
      flaggedCount++;
      return {
        ...t,
        is_flagged: true,
        flag_reason:
          t.amount > 0 ? 'over_threshold_income' : 'over_threshold_expense',
      };
    }

    return t;
  });

  return flaggedCount;
}

// Reset demo store to initial state (useful for testing)
export function resetDemoStore() {
  demoTransactions = [...demoTxnsJson];
  demoThresholds = {
    usdThreshold: USD_THRESHOLD,
    fxRate: FX_USD_TO_PEN,
  };
}

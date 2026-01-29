import { USD_THRESHOLD, FX_USD_TO_PEN } from './categories';
import demoTxnsJson from '../../demo/transactions.json';

// Get today's date in YYYY-MM-DD format
function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

// Get first day of current month
function getFirstOfMonth() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
}

// Sample recurring transactions for demo
function getInitialRecurring() {
  const firstOfMonth = getFirstOfMonth();
  return [
    {
      id: 'demo_recurring_1',
      household_id: 'demo_household',
      amount: -1500,
      currency: 'USD',
      category: 'Rent/Mortgages',
      payer: 'Together',
      description: 'Monthly Rent',
      frequency: 'monthly',
      start_date: '2025-01-01',
      end_date: null,
      day_of_month: 1,
      day_of_week: null,
      is_active: true,
      created_by: 'demo_user',
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    },
    {
      id: 'demo_recurring_2',
      household_id: 'demo_household',
      amount: -150,
      currency: 'USD',
      category: 'Fixed Expenses',
      payer: 'Partner 1',
      description: 'Gym Membership',
      frequency: 'monthly',
      start_date: '2025-01-15',
      end_date: null,
      day_of_month: 15,
      day_of_week: null,
      is_active: true,
      created_by: 'demo_user',
      created_at: '2025-01-15T00:00:00Z',
      updated_at: '2025-01-15T00:00:00Z',
    },
    {
      id: 'demo_recurring_3',
      household_id: 'demo_household',
      amount: -100,
      currency: 'USD',
      category: 'Food',
      payer: 'Together',
      description: 'Weekly Groceries',
      frequency: 'weekly',
      start_date: firstOfMonth,
      end_date: null,
      day_of_month: null,
      day_of_week: 0, // Sunday
      is_active: true,
      created_by: 'demo_user',
      created_at: firstOfMonth + 'T00:00:00Z',
      updated_at: firstOfMonth + 'T00:00:00Z',
    },
    {
      id: 'demo_recurring_4',
      household_id: 'demo_household',
      amount: 5000,
      currency: 'USD',
      category: 'Salary',
      payer: 'Partner 1',
      description: 'Paycheck',
      frequency: 'biweekly',
      start_date: '2025-01-10',
      end_date: null,
      day_of_month: null,
      day_of_week: 5, // Friday
      is_active: true,
      created_by: 'demo_user',
      created_at: '2025-01-10T00:00:00Z',
      updated_at: '2025-01-10T00:00:00Z',
    },
  ];
}

// Sample transactions for "today" so demo users see activity immediately
function getTodayTransactions() {
  const today = getTodayDate();
  return [
    {
      id: 'demo_today_1',
      txn_date: today,
      currency: 'USD',
      description: 'Morning coffee - Starbucks',
      amount: -6.75,
      category: 'Food',
      payer: 'Partner 1',
      is_flagged: false,
    },
    {
      id: 'demo_today_2',
      txn_date: today,
      currency: 'USD',
      description: "Grocery run - Trader Joe's",
      amount: -47.82,
      category: 'Food',
      payer: 'Together',
      is_flagged: false,
    },
    {
      id: 'demo_today_3',
      txn_date: today,
      currency: 'USD',
      description: 'Gas station fill-up',
      amount: -52.3,
      category: 'Transportation',
      payer: 'Partner 2',
      is_flagged: false,
    },
  ];
}

// In-memory store for demo mode
let demoTransactions = [...getTodayTransactions(), ...demoTxnsJson];
let demoThresholds = {
  usdThreshold: USD_THRESHOLD,
  fxRate: FX_USD_TO_PEN,
};
let demoCategoryLimits = {};
let demoRecurring = [...getInitialRecurring()];
let demoExceptions = [];

// =====================
// Recurring Transactions
// =====================

// Get active recurring transactions
export function getDemoRecurring() {
  return demoRecurring.filter((r) => r.is_active);
}

// Get all recurring transactions (including inactive)
export function getAllDemoRecurring() {
  return [...demoRecurring];
}

// Get a recurring transaction by ID
export function getDemoRecurringById(id) {
  return demoRecurring.find((r) => r.id === id) || null;
}

// Add a new recurring transaction
export function addDemoRecurring(recurring) {
  const id = `demo_recurring_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const now = new Date().toISOString();
  const newRecurring = {
    ...recurring,
    id,
    household_id: 'demo_household',
    is_active: true,
    created_by: 'demo_user',
    created_at: now,
    updated_at: now,
  };
  demoRecurring = [newRecurring, ...demoRecurring];
  return id;
}

// Update a recurring transaction
export function updateDemoRecurring(id, updates) {
  demoRecurring = demoRecurring.map((r) =>
    r.id === id ? { ...r, ...updates, updated_at: new Date().toISOString() } : r
  );
}

// Soft delete (deactivate) a recurring transaction
export function deleteDemoRecurring(id) {
  demoRecurring = demoRecurring.map((r) =>
    r.id === id
      ? { ...r, is_active: false, updated_at: new Date().toISOString() }
      : r
  );
}

// Hard delete a recurring transaction
export function hardDeleteDemoRecurring(id) {
  demoRecurring = demoRecurring.filter((r) => r.id !== id);
  // Also remove associated exceptions
  demoExceptions = demoExceptions.filter((e) => e.recurring_id !== id);
}

// =====================
// Recurring Exceptions
// =====================

// Get exceptions for a recurring transaction
export function getDemoExceptions(recurringId) {
  return demoExceptions.filter((e) => e.recurring_id === recurringId);
}

// Get all exceptions
export function getAllDemoExceptions() {
  return [...demoExceptions];
}

// Add a skip exception
export function addDemoException(recurringId, occurrenceDate) {
  // Check if exception already exists
  const exists = demoExceptions.some(
    (e) =>
      e.recurring_id === recurringId && e.occurrence_date === occurrenceDate
  );
  if (exists) return null;

  const id = `demo_exception_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const newException = {
    id,
    recurring_id: recurringId,
    occurrence_date: occurrenceDate,
    exception_type: 'skip',
    created_by: 'demo_user',
    created_at: new Date().toISOString(),
  };
  demoExceptions = [...demoExceptions, newException];
  return id;
}

// Remove an exception (undo skip)
export function removeDemoException(recurringId, occurrenceDate) {
  demoExceptions = demoExceptions.filter(
    (e) =>
      !(e.recurring_id === recurringId && e.occurrence_date === occurrenceDate)
  );
}

// Remove exception by ID
export function removeDemoExceptionById(id) {
  demoExceptions = demoExceptions.filter((e) => e.id !== id);
}

// Check if an occurrence is skipped
export function isDemoOccurrenceSkipped(recurringId, occurrenceDate) {
  return demoExceptions.some(
    (e) =>
      e.recurring_id === recurringId &&
      e.occurrence_date === occurrenceDate &&
      e.exception_type === 'skip'
  );
}

// =====================
// Fingerprint Helpers
// =====================

// Get all recurring fingerprints from transactions
export function getDemoRecurringFingerprints() {
  return new Set(
    demoTransactions
      .filter((t) => t.recurring_fingerprint)
      .map((t) => t.recurring_fingerprint)
  );
}

// Check if a fingerprint already exists
export function demoFingerprintExists(fingerprint) {
  return demoTransactions.some((t) => t.recurring_fingerprint === fingerprint);
}

// =====================
// Regular Transactions
// =====================

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

// Delete a demo transaction
export function deleteDemoTransaction(id) {
  demoTransactions = demoTransactions.filter((t) => t.id !== id);
}

// Add a new demo transaction
export function addDemoTransaction(transaction) {
  const id = `demo_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  demoTransactions = [{ ...transaction, id }, ...demoTransactions];
  return id;
}

// Set all demo transactions (for restore)
export function setDemoTransactions(transactions) {
  demoTransactions = [...transactions];
}

// Get current demo thresholds
export function getDemoThresholds() {
  return { ...demoThresholds };
}

// Set demo thresholds
export function setDemoThresholds({ usdThreshold, fxRate }) {
  demoThresholds = { usdThreshold, fxRate };
}

// Get current demo category limits
export function getDemoCategoryLimits() {
  return { ...demoCategoryLimits };
}

// Set demo category limits
export function setDemoCategoryLimits(limits) {
  demoCategoryLimits = { ...limits };
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
  demoTransactions = [...getTodayTransactions(), ...demoTxnsJson];
  demoThresholds = {
    usdThreshold: USD_THRESHOLD,
    fxRate: FX_USD_TO_PEN,
  };
  demoCategoryLimits = {};
  demoRecurring = [...getInitialRecurring()];
  demoExceptions = [];
}

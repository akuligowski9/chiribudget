/**
 * Period Comparison Integration Tests
 *
 * These tests verify that the period-over-period comparison feature works
 * correctly with transactions in different months, handling:
 * - Month-over-month comparisons (Jan 2026 vs Dec 2025)
 * - Categories that exist in one period but not the other
 * - Percentage change calculations
 * - Edge cases (no previous data, zero amounts)
 */

import {
  getPreviousPeriodRange,
  calculateCategoryComparison,
  generateInsights,
} from '@/lib/comparisonUtils';

// Mock household and user
const testUser = { id: 'test-user-123', email: 'test@example.com' };
const testHouseholdId = 'test-household-abc';

// In-memory database simulation
let database = {
  transactions: [],
};

function resetDatabase() {
  database = { transactions: [] };
}

// Helper to add transaction
function addTransaction({
  txn_date,
  amount,
  category,
  currency = 'USD',
  payer = 'Partner 1',
}) {
  database.transactions.push({
    id: `txn-${Date.now()}-${Math.random()}`,
    household_id: testHouseholdId,
    txn_date,
    amount,
    category,
    currency,
    payer,
    created_by: testUser.id,
    is_flagged: false,
    deleted_at: null,
  });
}

// Helper to get transactions for date range
function getTransactionsInRange(startDate, endDate, currency = 'USD') {
  return database.transactions.filter(
    (t) =>
      t.household_id === testHouseholdId &&
      t.currency === currency &&
      t.txn_date >= startDate &&
      t.txn_date <= endDate &&
      t.deleted_at === null
  );
}

// Helper to aggregate by category
function aggregateByCategory(transactions, type) {
  const result = {};
  transactions
    .filter((t) => (type === 'income' ? t.amount > 0 : t.amount < 0))
    .forEach((t) => {
      const amount = Math.abs(t.amount);
      result[t.category] = (result[t.category] || 0) + amount;
    });
  return result;
}

describe('Period Comparison Integration Tests', () => {
  beforeEach(() => {
    resetDatabase();
  });

  describe('Month-over-month comparison', () => {
    beforeEach(() => {
      // December 2025 transactions
      addTransaction({
        txn_date: '2025-12-05',
        amount: -400,
        category: 'Food',
      });
      addTransaction({
        txn_date: '2025-12-10',
        amount: -150,
        category: 'Dogs',
      });
      addTransaction({
        txn_date: '2025-12-15',
        amount: -200,
        category: 'Adventure',
      });
      addTransaction({
        txn_date: '2025-12-20',
        amount: 4000,
        category: 'Salary',
      });
      addTransaction({
        txn_date: '2025-12-25',
        amount: 100,
        category: 'Investments',
      });

      // January 2026 transactions
      addTransaction({
        txn_date: '2026-01-05',
        amount: -500,
        category: 'Food',
      });
      addTransaction({
        txn_date: '2026-01-10',
        amount: -120,
        category: 'Dogs',
      });
      addTransaction({
        txn_date: '2026-01-15',
        amount: -300,
        category: 'Adventure',
      });
      addTransaction({
        txn_date: '2026-01-20',
        amount: 4000,
        category: 'Salary',
      });
      addTransaction({
        txn_date: '2026-01-25',
        amount: 150,
        category: 'Investments',
      });
    });

    it('should calculate correct previous period for month preset', () => {
      const result = getPreviousPeriodRange(
        'month',
        '2026-01-01',
        '2026-01-31'
      );

      expect(result).not.toBeNull();
      expect(result.previousStartDate).toBe('2025-12-01');
      expect(result.previousEndDate).toBe('2025-12-31');
    });

    it('should fetch transactions for both periods', () => {
      const currentTxns = getTransactionsInRange('2026-01-01', '2026-01-31');
      const previousTxns = getTransactionsInRange('2025-12-01', '2025-12-31');

      expect(currentTxns).toHaveLength(5);
      expect(previousTxns).toHaveLength(5);
    });

    it('should calculate correct expense comparison', () => {
      const currentTxns = getTransactionsInRange('2026-01-01', '2026-01-31');
      const previousTxns = getTransactionsInRange('2025-12-01', '2025-12-31');

      const currentExpenses = aggregateByCategory(currentTxns, 'expense');
      const previousExpenses = aggregateByCategory(previousTxns, 'expense');

      const comparison = calculateCategoryComparison(
        currentExpenses,
        previousExpenses
      );

      // Food: 500 vs 400 = +25%
      expect(comparison.Food.current).toBe(500);
      expect(comparison.Food.previous).toBe(400);
      expect(comparison.Food.percentChange).toBe(25);
      expect(comparison.Food.trend).toBe('up');

      // Dogs: 120 vs 150 = -20%
      expect(comparison.Dogs.current).toBe(120);
      expect(comparison.Dogs.previous).toBe(150);
      expect(comparison.Dogs.percentChange).toBe(-20);
      expect(comparison.Dogs.trend).toBe('down');

      // Adventure: 300 vs 200 = +50%
      expect(comparison.Adventure.current).toBe(300);
      expect(comparison.Adventure.previous).toBe(200);
      expect(comparison.Adventure.percentChange).toBe(50);
      expect(comparison.Adventure.trend).toBe('up');
    });

    it('should calculate correct income comparison', () => {
      const currentTxns = getTransactionsInRange('2026-01-01', '2026-01-31');
      const previousTxns = getTransactionsInRange('2025-12-01', '2025-12-31');

      const currentIncome = aggregateByCategory(currentTxns, 'income');
      const previousIncome = aggregateByCategory(previousTxns, 'income');

      const comparison = calculateCategoryComparison(
        currentIncome,
        previousIncome
      );

      // Salary: 4000 vs 4000 = 0%
      expect(comparison.Salary.current).toBe(4000);
      expect(comparison.Salary.previous).toBe(4000);
      expect(comparison.Salary.percentChange).toBe(0);
      expect(comparison.Salary.trend).toBe('stable');

      // Investments: 150 vs 100 = +50%
      expect(comparison.Investments.current).toBe(150);
      expect(comparison.Investments.previous).toBe(100);
      expect(comparison.Investments.percentChange).toBe(50);
      expect(comparison.Investments.trend).toBe('up');
    });

    it('should generate insights for significant changes', () => {
      const currentTxns = getTransactionsInRange('2026-01-01', '2026-01-31');
      const previousTxns = getTransactionsInRange('2025-12-01', '2025-12-31');

      const currentExpenses = aggregateByCategory(currentTxns, 'expense');
      const previousExpenses = aggregateByCategory(previousTxns, 'expense');

      const comparison = calculateCategoryComparison(
        currentExpenses,
        previousExpenses
      );

      const insights = generateInsights(comparison, 'expense', 10);

      // Should have 2 insights (Adventure +50%, Food +25%)
      // Dogs -20% is also above 10% threshold
      expect(insights.length).toBeGreaterThanOrEqual(2);

      // Sorted by absolute percentage (Adventure 50% should be first)
      expect(insights[0].category).toBe('Adventure');
      expect(insights[0].percentChange).toBe(50);
      expect(insights[0].change).toBe('increased');
    });
  });

  describe('Edge case: No previous data', () => {
    beforeEach(() => {
      // Only January 2026 transactions (first month of usage)
      addTransaction({
        txn_date: '2026-01-05',
        amount: -500,
        category: 'Food',
      });
      addTransaction({
        txn_date: '2026-01-10',
        amount: 4000,
        category: 'Salary',
      });
    });

    it('should return empty array when no previous transactions exist', () => {
      const previousTxns = getTransactionsInRange('2025-12-01', '2025-12-31');
      expect(previousTxns).toHaveLength(0);
    });

    it('should handle comparison with empty previous period', () => {
      const currentTxns = getTransactionsInRange('2026-01-01', '2026-01-31');
      const previousTxns = getTransactionsInRange('2025-12-01', '2025-12-31');

      const currentExpenses = aggregateByCategory(currentTxns, 'expense');
      const previousExpenses = aggregateByCategory(previousTxns, 'expense');

      const comparison = calculateCategoryComparison(
        currentExpenses,
        previousExpenses
      );

      // Food is "new" (previous = 0)
      expect(comparison.Food.current).toBe(500);
      expect(comparison.Food.previous).toBe(0);
      expect(comparison.Food.isNew).toBe(true);
      expect(comparison.Food.percentChange).toBeNull();
    });
  });

  describe('Edge case: New category in current month', () => {
    beforeEach(() => {
      // December: Food only
      addTransaction({
        txn_date: '2025-12-05',
        amount: -400,
        category: 'Food',
      });

      // January: Food + Adventure (new)
      addTransaction({
        txn_date: '2026-01-05',
        amount: -500,
        category: 'Food',
      });
      addTransaction({
        txn_date: '2026-01-10',
        amount: -300,
        category: 'Adventure',
      });
    });

    it('should mark new category correctly', () => {
      const currentTxns = getTransactionsInRange('2026-01-01', '2026-01-31');
      const previousTxns = getTransactionsInRange('2025-12-01', '2025-12-31');

      const currentExpenses = aggregateByCategory(currentTxns, 'expense');
      const previousExpenses = aggregateByCategory(previousTxns, 'expense');

      const comparison = calculateCategoryComparison(
        currentExpenses,
        previousExpenses
      );

      // Adventure is new
      expect(comparison.Adventure.isNew).toBe(true);
      expect(comparison.Adventure.current).toBe(300);
      expect(comparison.Adventure.previous).toBe(0);
      expect(comparison.Adventure.percentChange).toBeNull();

      // Food exists in both
      expect(comparison.Food.isNew).toBe(false);
      expect(comparison.Food.percentChange).toBe(25); // 500 vs 400
    });
  });

  describe('Edge case: Category dropped to zero', () => {
    beforeEach(() => {
      // December: Food + Adventure
      addTransaction({
        txn_date: '2025-12-05',
        amount: -400,
        category: 'Food',
      });
      addTransaction({
        txn_date: '2025-12-10',
        amount: -300,
        category: 'Adventure',
      });

      // January: Food only (Adventure dropped)
      addTransaction({
        txn_date: '2026-01-05',
        amount: -500,
        category: 'Food',
      });
    });

    it('should show -100% for dropped category', () => {
      const currentTxns = getTransactionsInRange('2026-01-01', '2026-01-31');
      const previousTxns = getTransactionsInRange('2025-12-01', '2025-12-31');

      const currentExpenses = aggregateByCategory(currentTxns, 'expense');
      const previousExpenses = aggregateByCategory(previousTxns, 'expense');

      const comparison = calculateCategoryComparison(
        currentExpenses,
        previousExpenses
      );

      // Adventure dropped to zero
      expect(comparison.Adventure.current).toBe(0);
      expect(comparison.Adventure.previous).toBe(300);
      expect(comparison.Adventure.percentChange).toBe(-100);
      expect(comparison.Adventure.trend).toBe('down');
    });
  });

  describe('Edge case: Week preset', () => {
    beforeEach(() => {
      // Week of Jan 14-20, 2026
      addTransaction({
        txn_date: '2026-01-14',
        amount: -100,
        category: 'Food',
      });
      addTransaction({
        txn_date: '2026-01-18',
        amount: -50,
        category: 'Dogs',
      });

      // Previous week Jan 7-13, 2026
      addTransaction({
        txn_date: '2026-01-07',
        amount: -80,
        category: 'Food',
      });
      addTransaction({
        txn_date: '2026-01-10',
        amount: -60,
        category: 'Dogs',
      });
    });

    it('should calculate correct previous week', () => {
      const result = getPreviousPeriodRange('week', '2026-01-14', '2026-01-20');

      expect(result.previousStartDate).toBe('2026-01-07');
      expect(result.previousEndDate).toBe('2026-01-13');
    });

    it('should compare week-over-week correctly', () => {
      const currentTxns = getTransactionsInRange('2026-01-14', '2026-01-20');
      const previousTxns = getTransactionsInRange('2026-01-07', '2026-01-13');

      const currentExpenses = aggregateByCategory(currentTxns, 'expense');
      const previousExpenses = aggregateByCategory(previousTxns, 'expense');

      const comparison = calculateCategoryComparison(
        currentExpenses,
        previousExpenses
      );

      // Food: 100 vs 80 = +25%
      expect(comparison.Food.percentChange).toBe(25);

      // Dogs: 50 vs 60 = -16.7% (rounded to -16.7)
      expect(comparison.Dogs.percentChange).toBeCloseTo(-16.7, 1);
    });
  });

  describe('Multi-currency handling', () => {
    beforeEach(() => {
      // December USD
      addTransaction({
        txn_date: '2025-12-05',
        amount: -400,
        category: 'Food',
        currency: 'USD',
      });

      // January USD
      addTransaction({
        txn_date: '2026-01-05',
        amount: -500,
        category: 'Food',
        currency: 'USD',
      });

      // December PEN
      addTransaction({
        txn_date: '2025-12-10',
        amount: -1300,
        category: 'Food',
        currency: 'PEN',
      });

      // January PEN
      addTransaction({
        txn_date: '2026-01-10',
        amount: -1625,
        category: 'Food',
        currency: 'PEN',
      });
    });

    it('should filter transactions by currency', () => {
      const usdCurrent = getTransactionsInRange(
        '2026-01-01',
        '2026-01-31',
        'USD'
      );
      const penCurrent = getTransactionsInRange(
        '2026-01-01',
        '2026-01-31',
        'PEN'
      );

      expect(usdCurrent).toHaveLength(1);
      expect(penCurrent).toHaveLength(1);
      expect(usdCurrent[0].amount).toBe(-500);
      expect(penCurrent[0].amount).toBe(-1625);
    });

    it('should calculate comparison per currency', () => {
      // USD comparison
      const usdCurrent = aggregateByCategory(
        getTransactionsInRange('2026-01-01', '2026-01-31', 'USD'),
        'expense'
      );
      const usdPrevious = aggregateByCategory(
        getTransactionsInRange('2025-12-01', '2025-12-31', 'USD'),
        'expense'
      );

      const usdComparison = calculateCategoryComparison(
        usdCurrent,
        usdPrevious
      );

      // USD Food: 500 vs 400 = +25%
      expect(usdComparison.Food.percentChange).toBe(25);

      // PEN comparison
      const penCurrent = aggregateByCategory(
        getTransactionsInRange('2026-01-01', '2026-01-31', 'PEN'),
        'expense'
      );
      const penPrevious = aggregateByCategory(
        getTransactionsInRange('2025-12-01', '2025-12-31', 'PEN'),
        'expense'
      );

      const penComparison = calculateCategoryComparison(
        penCurrent,
        penPrevious
      );

      // PEN Food: 1625 vs 1300 = +25%
      expect(penComparison.Food.percentChange).toBe(25);
    });
  });
});

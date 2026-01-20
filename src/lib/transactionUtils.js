/**
 * Transaction utility functions and constants.
 */

// Map category values to translation keys
export const CATEGORY_KEYS = {
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

/**
 * Sort transactions by field.
 * @param {Array} transactions - Array of transaction objects
 * @param {string} sortField - Field to sort by ('txn_date' or 'amount')
 * @param {boolean} sortAsc - Sort ascending if true
 * @returns {Array} Sorted transactions
 */
export function sortTransactions(transactions, sortField, sortAsc) {
  return [...transactions].sort((a, b) => {
    let cmp = 0;
    if (sortField === 'txn_date') {
      cmp = a.txn_date.localeCompare(b.txn_date);
    } else if (sortField === 'amount') {
      cmp = Math.abs(a.amount) - Math.abs(b.amount);
    }
    return sortAsc ? cmp : -cmp;
  });
}

/**
 * Filter transactions by search query.
 * @param {Array} transactions - Array of transaction objects
 * @param {string} query - Search query string
 * @returns {Array} Filtered transactions
 */
export function filterBySearch(transactions, query) {
  if (!query.trim()) {
    return transactions;
  }
  const q = query.toLowerCase();
  return transactions.filter(
    (t) =>
      t.description?.toLowerCase().includes(q) ||
      t.category?.toLowerCase().includes(q)
  );
}

/**
 * Filter transactions by date range.
 * @param {Array} transactions - Array of transaction objects
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Array} Filtered transactions
 */
export function filterByDateRange(transactions, startDate, endDate) {
  return transactions.filter(
    (t) => t.txn_date >= startDate && t.txn_date <= endDate
  );
}

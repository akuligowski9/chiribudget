/**
 * Application-wide constants
 * Centralizes magic numbers for easier maintenance
 */

// ===================
// Timing (milliseconds)
// ===================

/** How long toast notifications display before auto-dismissing */
export const TOAST_DURATION_MS = 3200;

/** How long "Copied!" feedback shows after copying to clipboard */
export const COPY_FEEDBACK_MS = 2000;

/** Delay before page reload after successful action (e.g., joining household) */
export const RELOAD_DELAY_MS = 1000;

// ===================
// Pagination
// ===================

/** Number of transactions to show per page in TransactionList */
export const TRANSACTIONS_PER_PAGE = 20;

// ===================
// Validation Limits
// ===================

/** Maximum transaction amount in USD (prevents typos like 50000 instead of 500) */
export const MAX_TRANSACTION_USD = 50000;

/** Maximum transaction amount in PEN (calculated from USD max * FX rate) */
export const MAX_TRANSACTION_PEN = 162500;

/**
 * Get max transaction amount for a currency
 * @param {string} currency - 'USD' or 'PEN'
 * @returns {number} Maximum allowed amount
 */
export function getMaxAmount(currency) {
  return currency === 'USD' ? MAX_TRANSACTION_USD : MAX_TRANSACTION_PEN;
}

// ===================
// UI Limits
// ===================

/** Maximum length for transaction descriptions */
export const MAX_DESCRIPTION_LENGTH = 200;

/** Maximum length for discussion notes */
export const MAX_NOTES_LENGTH = 2000;

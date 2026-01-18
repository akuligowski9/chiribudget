/**
 * Validation utilities for transactions
 * Provides both client-side and server-side validation
 */

import { ALL_CATEGORIES, CURRENCIES, PAYERS } from './categories';
import { getMaxAmount, MAX_DESCRIPTION_LENGTH } from './constants';

// ===================
// Date Validation
// ===================

/**
 * Validate that a date is not in the future
 * @param {string} date - ISO date string (YYYY-MM-DD)
 * @returns {string|null} Error message or null if valid
 */
export function validateDate(date) {
  if (!date) {
    return 'Date is required';
  }
  const today = new Date().toISOString().slice(0, 10);
  if (date > today) {
    return 'Date cannot be in the future';
  }
  return null;
}

// ===================
// Amount Validation
// ===================

/**
 * Validate transaction amount
 * @param {string|number} value - Amount to validate
 * @param {string} currency - 'USD' or 'PEN'
 * @returns {string|null} Error message or null if valid
 */
export function validateAmount(value, currency) {
  if (value === null || value === undefined || String(value).trim() === '') {
    return 'Amount is required';
  }
  const num = Number(value);
  if (isNaN(num) || !Number.isFinite(num)) {
    return 'Enter a valid number';
  }
  if (num <= 0) {
    return 'Amount must be greater than 0';
  }
  const max = getMaxAmount(currency);
  if (num > max) {
    return `Amount cannot exceed ${currency} ${max.toLocaleString()}`;
  }
  return null;
}

// ===================
// Description Validation
// ===================

/**
 * Validate description length
 * @param {string} value - Description to validate
 * @returns {string|null} Error message or null if valid
 */
export function validateDescription(value) {
  if (value && value.length > MAX_DESCRIPTION_LENGTH) {
    return `Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters`;
  }
  return null;
}

// ===================
// Enum Validation (Server-Side Defense)
// ===================

/**
 * Validate that currency is a valid enum value
 * @param {string} value - Currency to validate
 * @returns {string|null} Error message or null if valid
 */
export function validateCurrency(value) {
  if (!value) {
    return 'Currency is required';
  }
  if (!CURRENCIES.includes(value)) {
    return `Invalid currency: ${value}. Must be one of: ${CURRENCIES.join(', ')}`;
  }
  return null;
}

/**
 * Validate that category is a valid enum value
 * @param {string} value - Category to validate
 * @returns {string|null} Error message or null if valid
 */
export function validateCategory(value) {
  if (!value) {
    return 'Category is required';
  }
  if (!ALL_CATEGORIES.includes(value)) {
    return `Invalid category: ${value}. Must be one of: ${ALL_CATEGORIES.join(', ')}`;
  }
  return null;
}

/**
 * Validate that payer is a valid enum value (case-insensitive)
 * @param {string} value - Payer to validate
 * @returns {string|null} Error message or null if valid
 */
export function validatePayer(value) {
  if (!value) {
    return 'Payer is required';
  }
  // Case-insensitive comparison
  const normalizedPayers = PAYERS.map((p) => p.toLowerCase());
  const normalizedValue = value.toLowerCase();
  if (!normalizedPayers.includes(normalizedValue)) {
    return `Invalid payer: ${value}. Must be one of: ${PAYERS.join(', ')}`;
  }
  return null;
}

// ===================
// Full Transaction Validation
// ===================

/**
 * Validate a complete transaction object
 * @param {Object} transaction - Transaction to validate
 * @returns {Object} { isValid: boolean, errors: Object }
 */
export function validateTransaction(transaction) {
  const errors = {};

  const dateError = validateDate(transaction.txn_date);
  if (dateError) errors.date = dateError;

  const amountError = validateAmount(
    Math.abs(transaction.amount),
    transaction.currency
  );
  if (amountError) errors.amount = amountError;

  const descError = validateDescription(transaction.description);
  if (descError) errors.description = descError;

  const currencyError = validateCurrency(transaction.currency);
  if (currencyError) errors.currency = currencyError;

  const categoryError = validateCategory(transaction.category);
  if (categoryError) errors.category = categoryError;

  const payerError = validatePayer(transaction.payer);
  if (payerError) errors.payer = payerError;

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Get first error message from validation result
 * @param {Object} validationResult - Result from validateTransaction
 * @returns {string|null} First error message or null
 */
export function getFirstError(validationResult) {
  const errorKeys = Object.keys(validationResult.errors);
  if (errorKeys.length === 0) return null;
  return validationResult.errors[errorKeys[0]];
}

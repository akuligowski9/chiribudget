/**
 * Currency conversion utilities for ChiriBudget
 */

/**
 * Convert an amount from one currency to another
 * @param {number} amount - The amount to convert
 * @param {string} fromCurrency - Source currency ('USD' or 'PEN')
 * @param {string} toCurrency - Target currency ('USD' or 'PEN')
 * @param {number} rate - Conversion rate (1 USD = X PEN)
 * @returns {number} Converted amount
 */
export function convertAmount(amount, fromCurrency, toCurrency, rate) {
  if (fromCurrency === toCurrency) return amount;
  if (toCurrency === 'PEN') return amount * rate; // USD → PEN
  return amount / rate; // PEN → USD
}

/**
 * Format currency amount for display
 * @param {number} amount - The amount to format
 * @param {string} currency - Currency code ('USD' or 'PEN')
 * @param {boolean} isConverted - Whether this is a converted amount (shows ≈)
 * @returns {string} Formatted amount string
 */
export function formatCurrencyAmount(amount, currency, isConverted = false) {
  const prefix = isConverted ? '≈' : '';
  const symbol = currency === 'USD' ? '$' : 'S/.';
  const sign = amount < 0 ? '-' : '';
  const absAmount = Math.abs(amount).toFixed(2);
  return `${prefix}${sign}${symbol}${absAmount}`;
}

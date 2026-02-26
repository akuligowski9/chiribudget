/**
 * Format a number as currency with thousand separators
 * @param {number} amount - The amount to format
 * @param {number} fractionDigits - Number of decimal places (default: 2)
 * @returns {string} Formatted amount string with thousand separators
 */
export function formatCurrency(amount, fractionDigits = 2) {
  if (amount == null || isNaN(amount)) return '0.00';
  return Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

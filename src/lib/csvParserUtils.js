/**
 * CSV Parser utilities for bank statement imports
 */

// Bank CSV column mappings
export const BANK_MAPPINGS = {
  interbank: {
    dateCol: 'Fecha',
    descriptionCol: 'Descripción',
    amountCol: 'Monto',
    dateFormat: 'DD/MM/YYYY',
    currency: 'PEN',
  },
  bcp: {
    dateCol: 'Fecha',
    descriptionCol: 'Descripcion',
    amountCol: 'Importe',
    dateFormat: 'DD/MM/YYYY',
    currency: 'PEN',
  },
  bbva: {
    dateCol: 'Fecha',
    descriptionCol: 'Concepto',
    amountCol: 'Importe',
    dateFormat: 'DD/MM/YYYY',
    currency: 'PEN',
  },
  scotiabank: {
    dateCol: 'Fecha',
    descriptionCol: 'Descripcion',
    amountCol: 'Monto',
    dateFormat: 'DD/MM/YYYY',
    currency: 'PEN',
  },
  pnc: {
    dateCol: 'Date',
    descriptionCol: 'Description',
    amountCol: 'Amount',
    withdrawalCol: 'Withdrawals',
    depositCol: 'Deposits',
    dateFormat: 'MM/DD/YYYY',
    currency: 'USD',
  },
  other: {
    dateCol: 'Date',
    descriptionCol: 'Description',
    amountCol: 'Amount',
    dateFormat: 'MM/DD/YYYY',
    currency: 'USD',
  },
};

export const BANKS = [
  { value: 'interbank', label: 'Interbank' },
  { value: 'bcp', label: 'BCP' },
  { value: 'bbva', label: 'BBVA' },
  { value: 'scotiabank', label: 'Scotiabank' },
  { value: 'pnc', label: 'PNC Bank' },
  { value: 'other', label: 'Other' },
];

export const CURRENT_YEAR = new Date().getFullYear();
export const YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];

/**
 * Parse date string to YYYY-MM-DD format
 */
export function parseDate(dateStr, format, year) {
  if (!dateStr) return null;

  const cleanDate = dateStr.trim();
  let day, month, yearPart;

  if (format === 'DD/MM/YYYY') {
    const parts = cleanDate.split('/');
    if (parts.length >= 2) {
      day = parts[0].padStart(2, '0');
      month = parts[1].padStart(2, '0');
      yearPart = parts[2] || year;
    }
  } else if (format === 'MM/DD/YYYY') {
    const parts = cleanDate.split('/');
    if (parts.length >= 2) {
      month = parts[0].padStart(2, '0');
      day = parts[1].padStart(2, '0');
      yearPart = parts[2] || year;
    }
  }

  if (day && month) {
    const fullYear =
      yearPart?.length === 2 ? `20${yearPart}` : yearPart || year;
    return `${fullYear}-${month}-${day}`;
  }

  return `${year}-01-01`; // Fallback
}

/**
 * Parse amount string to number
 */
export function parseAmount(amountStr) {
  if (!amountStr) return 0;
  // Remove currency symbols, commas, spaces
  const cleaned = amountStr.toString().replace(/[^0-9.-]/g, '');
  return parseFloat(cleaned) || 0;
}

/**
 * Generate fingerprint for deduplication
 */
export function generateFingerprint(
  householdId,
  currency,
  txnDate,
  amount,
  description
) {
  const base = `${householdId}|${currency}|${txnDate}|${Number(amount).toFixed(2)}|${(description || '').toLowerCase().trim()}`;
  let h = 0;
  for (let i = 0; i < base.length; i++) {
    h = (h * 31 + base.charCodeAt(i)) >>> 0;
  }
  return `fp_${h}`;
}

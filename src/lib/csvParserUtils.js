/**
 * CSV Parser utilities for bank statement imports
 */

// Spanish month abbreviations for Interbank date parsing
const SPANISH_MONTHS = {
  ene: '01',
  feb: '02',
  mar: '03',
  abr: '04',
  may: '05',
  jun: '06',
  jul: '07',
  ago: '08',
  sep: '09',
  oct: '10',
  nov: '11',
  dic: '12',
};

// Bank CSV column mappings
export const BANK_MAPPINGS = {
  interbank: {
    dateCol: 'Fecha',
    descriptionCol: 'Comercio',
    penAmountCol: 'S/',
    usdAmountCol: 'US$',
    dateFormat: 'DD-Mon',
    currency: 'PEN',
    isInterbank: true,
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
  // PNC Bank - auto-detected between credit and checking formats
  // Use detectPncFormat() to determine which sub-mapping to use
  pnc: {
    currency: 'USD',
    isPnc: true,
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
  { value: 'pnc', label: 'PNC Bank' },
  { value: 'interbank', label: 'Interbank' },
];

// PNC format sub-mappings (used internally after auto-detection)
export const PNC_FORMATS = {
  credit: {
    dateCol: 'Date',
    descriptionCol: 'Description',
    amountCol: 'Amount',
    dateFormat: 'MM/DD/YYYY',
    currency: 'USD',
    isPncCredit: true,
  },
  checking: {
    dateCol: 'Transaction Date',
    descriptionCol: 'Transaction Description',
    amountCol: 'Amount',
    dateFormat: 'ISO_OR_PENDING',
    currency: 'USD',
    isPncChecking: true,
  },
};

/**
 * Detect PNC format from CSV headers
 * @param {string[]} headers - Array of header names from the CSV
 * @returns {{ format: 'credit' | 'checking', mapping: object } | { error: string }}
 */
export function detectPncFormat(headers) {
  if (!headers || headers.length === 0) {
    return { error: 'No headers found in CSV file' };
  }

  const lowerHeaders = headers.map((h) => h.toLowerCase().trim());

  // Check for Credit Card format: Date, Description, Amount
  const hasCreditHeaders =
    lowerHeaders.includes('date') &&
    lowerHeaders.includes('description') &&
    lowerHeaders.includes('amount');

  // Check for Checking format: Transaction Date, Transaction Description, Amount
  const hasCheckingHeaders =
    lowerHeaders.includes('transaction date') &&
    lowerHeaders.includes('transaction description') &&
    lowerHeaders.includes('amount');

  if (hasCheckingHeaders) {
    return { format: 'checking', mapping: PNC_FORMATS.checking };
  }

  if (hasCreditHeaders) {
    return { format: 'credit', mapping: PNC_FORMATS.credit };
  }

  return {
    error:
      'Unrecognized PNC format. Expected headers: "Date, Description, Amount" (Credit Card) or "Transaction Date, Transaction Description, Amount" (Checking)',
  };
}

export const CURRENT_YEAR = new Date().getFullYear();
export const YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];

/**
 * Parse Interbank date format (DD-Mon with Spanish months)
 * Examples: "21-Sep", "4-Oct", "12-Dic"
 */
export function parseInterbankDate(dateStr, year) {
  if (!dateStr) return null;

  const cleanDate = dateStr.trim();
  const match = cleanDate.match(/^(\d{1,2})-([A-Za-z]{3})$/);

  if (!match) return null;

  const day = match[1].padStart(2, '0');
  const monthAbbr = match[2].toLowerCase();
  const month = SPANISH_MONTHS[monthAbbr];

  if (!month) return null;

  return `${year}-${month}-${day}`;
}

/**
 * Parse date string to YYYY-MM-DD format
 */
export function parseDate(dateStr, format, year) {
  if (!dateStr) return null;

  const cleanDate = dateStr.trim();
  let day, month, yearPart;

  // Handle Interbank DD-Mon format
  if (format === 'DD-Mon') {
    return parseInterbankDate(cleanDate, year);
  }

  // Handle PNC Checking ISO or PENDING format
  // Examples: "2026-01-20" or "PENDING - 01/25/2026"
  if (format === 'ISO_OR_PENDING') {
    // Check for PENDING format
    if (cleanDate.toUpperCase().startsWith('PENDING')) {
      return null; // Skip pending transactions
    }
    // Check for ISO format (YYYY-MM-DD)
    const isoMatch = cleanDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoMatch) {
      return cleanDate; // Already in correct format
    }
    // Fallback to MM/DD/YYYY parsing
    const parts = cleanDate.split('/');
    if (parts.length >= 3) {
      month = parts[0].padStart(2, '0');
      day = parts[1].padStart(2, '0');
      yearPart = parts[2];
      const fullYear = yearPart?.length === 2 ? `20${yearPart}` : yearPart;
      return `${fullYear}-${month}-${day}`;
    }
    return null;
  }

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
 * Parse PNC Credit Card amount format
 * Format: "$24.67" (expense, stored as negative) or "$-172.67" (payment/credit, stored as positive)
 * Credit card expenses are positive in their export but should be negative in our system
 */
export function parsePncCreditAmount(amountStr) {
  if (!amountStr) return 0;
  // Remove $ and whitespace, keep negative sign
  const cleaned = amountStr.toString().replace(/[$,\s]/g, '');
  const value = parseFloat(cleaned) || 0;
  // Invert: positive amounts (purchases) become negative expenses
  // Negative amounts (payments/credits) become positive credits
  return -value;
}

/**
 * Parse PNC Checking/Savings amount format
 * Format: "- $299.76" (withdrawal/expense) or "+ $892.00" (deposit/income)
 */
export function parsePncCheckingAmount(amountStr) {
  if (!amountStr) return 0;
  const str = amountStr.toString().trim();
  // Check for +/- prefix
  const isNegative = str.startsWith('-');
  const isPositive = str.startsWith('+');
  // Remove +/- prefix, $, commas, spaces
  const cleaned = str.replace(/[+\-$,\s]/g, '');
  const value = parseFloat(cleaned) || 0;
  // Apply sign
  if (isNegative) return -value;
  if (isPositive) return value;
  return value;
}

/**
 * Check if a PNC credit card transaction should be skipped
 * Skips: credit card payments (THANK YOU FOR YOUR PMT)
 */
export function shouldSkipPncCreditTransaction(description) {
  if (!description) return false;
  const upper = description.toUpperCase();
  return upper.includes('THANK YOU FOR YOUR PMT');
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

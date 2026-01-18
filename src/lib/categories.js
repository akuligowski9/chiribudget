export const CURRENCIES = ['USD', 'PEN'];

export const EXPENSE_CATEGORIES = [
  'Fixed Expenses',
  'Rent/Mortgages',
  'Food',
  'Dogs',
  'Holidays & Birthdays',
  'Adventure',
  'Unexpected',
];

export const INCOME_CATEGORIES = ['Salary', 'Investments', 'Extra'];

export const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

export const PAYERS = ['Partner 1', 'Partner 2', 'Together'];

// Threshold config (v1)
export const USD_THRESHOLD = 500;
export const FX_USD_TO_PEN = 3.25;
export const PEN_THRESHOLD = Math.round(USD_THRESHOLD * FX_USD_TO_PEN); // 1625

import {
  validateDate,
  validateAmount,
  validateDescription,
  validateCurrency,
  validateCategory,
  validatePayer,
  validateTransaction,
  getFirstError,
} from '../validation';

describe('Form validation', () => {
  describe('Date validation', () => {
    it('requires a date', () => {
      expect(validateDate(null)).toBe('Date is required');
      expect(validateDate(undefined)).toBe('Date is required');
      expect(validateDate('')).toBe('Date is required');
    });

    it('allows today', () => {
      const today = new Date().toISOString().slice(0, 10);
      expect(validateDate(today)).toBeNull();
    });

    it('allows past dates', () => {
      expect(validateDate('2024-01-15')).toBeNull();
      expect(validateDate('2023-06-01')).toBeNull();
    });

    it('rejects future dates', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().slice(0, 10);
      expect(validateDate(tomorrowStr)).toBe('Date cannot be in the future');
    });

    it('rejects far future dates', () => {
      expect(validateDate('2030-12-31')).toBe('Date cannot be in the future');
    });
  });

  describe('Amount validation', () => {
    it('requires amount', () => {
      expect(validateAmount('', 'USD')).toBe('Amount is required');
      expect(validateAmount('  ', 'USD')).toBe('Amount is required');
      expect(validateAmount(null, 'USD')).toBe('Amount is required');
      expect(validateAmount(undefined, 'USD')).toBe('Amount is required');
    });

    it('rejects invalid numbers', () => {
      expect(validateAmount('abc', 'USD')).toBe('Enter a valid number');
      expect(validateAmount('12.34.56', 'USD')).toBe('Enter a valid number');
    });

    it('rejects zero and negative amounts', () => {
      expect(validateAmount('0', 'USD')).toBe('Amount must be greater than 0');
      expect(validateAmount('-50', 'USD')).toBe(
        'Amount must be greater than 0'
      );
    });

    it('allows valid amounts', () => {
      expect(validateAmount('50', 'USD')).toBeNull();
      expect(validateAmount('123.45', 'USD')).toBeNull();
      expect(validateAmount('49999.99', 'USD')).toBeNull();
    });

    it('rejects amounts over USD max', () => {
      expect(validateAmount('50001', 'USD')).toBe(
        'Amount cannot exceed USD 50,000'
      );
      expect(validateAmount('100000', 'USD')).toBe(
        'Amount cannot exceed USD 50,000'
      );
    });

    it('rejects amounts over PEN max', () => {
      expect(validateAmount('162501', 'PEN')).toBe(
        'Amount cannot exceed PEN 162,500'
      );
      expect(validateAmount('200000', 'PEN')).toBe(
        'Amount cannot exceed PEN 162,500'
      );
    });

    it('allows higher amounts in PEN than USD', () => {
      // 100000 is over USD max but under PEN max
      expect(validateAmount('100000', 'USD')).toBe(
        'Amount cannot exceed USD 50,000'
      );
      expect(validateAmount('100000', 'PEN')).toBeNull();
    });
  });

  describe('Description validation', () => {
    it('allows empty description', () => {
      expect(validateDescription('')).toBeNull();
      expect(validateDescription(null)).toBeNull();
      expect(validateDescription(undefined)).toBeNull();
    });

    it('allows description under limit', () => {
      expect(validateDescription('Test description')).toBeNull();
      expect(validateDescription('a'.repeat(200))).toBeNull();
    });

    it('rejects description over limit', () => {
      expect(validateDescription('a'.repeat(201))).toBe(
        'Description cannot exceed 200 characters'
      );
    });
  });
});

describe('Enum validation (Server-Side Defense)', () => {
  describe('Currency validation', () => {
    it('requires currency', () => {
      expect(validateCurrency(null)).toBe('Currency is required');
      expect(validateCurrency(undefined)).toBe('Currency is required');
      expect(validateCurrency('')).toBe('Currency is required');
    });

    it('accepts valid currencies', () => {
      expect(validateCurrency('USD')).toBeNull();
      expect(validateCurrency('PEN')).toBeNull();
    });

    it('rejects invalid currencies', () => {
      expect(validateCurrency('EUR')).toContain('Invalid currency');
      expect(validateCurrency('GBP')).toContain('Invalid currency');
      expect(validateCurrency('usd')).toContain('Invalid currency'); // Case sensitive
    });
  });

  describe('Category validation', () => {
    it('requires category', () => {
      expect(validateCategory(null)).toBe('Category is required');
      expect(validateCategory('')).toBe('Category is required');
    });

    it('accepts valid expense categories', () => {
      expect(validateCategory('Fixed Expenses')).toBeNull();
      expect(validateCategory('Rent/Mortgages')).toBeNull();
      expect(validateCategory('Food')).toBeNull();
      expect(validateCategory('Dogs')).toBeNull();
      expect(validateCategory('Holidays & Birthdays')).toBeNull();
      expect(validateCategory('Adventure')).toBeNull();
      expect(validateCategory('Unexpected')).toBeNull();
    });

    it('accepts valid income categories', () => {
      expect(validateCategory('Salary')).toBeNull();
      expect(validateCategory('Investments')).toBeNull();
      expect(validateCategory('Extra')).toBeNull();
    });

    it('rejects invalid categories', () => {
      expect(validateCategory('Entertainment')).toContain('Invalid category');
      expect(validateCategory('Groceries')).toContain('Invalid category');
      expect(validateCategory('food')).toContain('Invalid category'); // Case sensitive
    });
  });

  describe('Payer validation', () => {
    it('requires payer', () => {
      expect(validatePayer(null)).toBe('Payer is required');
      expect(validatePayer('')).toBe('Payer is required');
    });

    it('accepts valid payers (case-insensitive)', () => {
      expect(validatePayer('Partner 1')).toBeNull();
      expect(validatePayer('Partner 2')).toBeNull();
      expect(validatePayer('Together')).toBeNull();
      expect(validatePayer('partner 1')).toBeNull();
      expect(validatePayer('PARTNER 2')).toBeNull();
      expect(validatePayer('together')).toBeNull();
    });

    it('rejects invalid payers', () => {
      expect(validatePayer('John')).toContain('Invalid payer');
      expect(validatePayer('Both')).toContain('Invalid payer');
      expect(validatePayer('Me')).toContain('Invalid payer');
    });
  });
});

describe('Full transaction validation', () => {
  const validTransaction = {
    txn_date: '2025-01-15',
    amount: -50,
    currency: 'USD',
    category: 'Food',
    payer: 'Partner 1',
    description: 'Groceries',
  };

  it('accepts valid transaction', () => {
    const result = validateTransaction(validTransaction);
    expect(result.isValid).toBe(true);
    expect(Object.keys(result.errors)).toHaveLength(0);
  });

  it('rejects transaction with invalid currency', () => {
    const result = validateTransaction({
      ...validTransaction,
      currency: 'EUR',
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.currency).toContain('Invalid currency');
  });

  it('rejects transaction with invalid category', () => {
    const result = validateTransaction({
      ...validTransaction,
      category: 'InvalidCategory',
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.category).toContain('Invalid category');
  });

  it('rejects transaction with invalid payer', () => {
    const result = validateTransaction({
      ...validTransaction,
      payer: 'InvalidPayer',
    });
    expect(result.isValid).toBe(false);
    expect(result.errors.payer).toContain('Invalid payer');
  });

  it('collects multiple errors', () => {
    const result = validateTransaction({
      txn_date: '2030-12-31',
      amount: 0,
      currency: 'INVALID',
      category: 'INVALID',
      payer: 'INVALID',
      description: 'a'.repeat(201),
    });
    expect(result.isValid).toBe(false);
    expect(Object.keys(result.errors).length).toBeGreaterThan(3);
  });
});

describe('getFirstError helper', () => {
  it('returns null for valid transaction', () => {
    const result = validateTransaction({
      txn_date: '2025-01-15',
      amount: -50,
      currency: 'USD',
      category: 'Food',
      payer: 'Partner 1',
    });
    expect(getFirstError(result)).toBeNull();
  });

  it('returns first error message for invalid transaction', () => {
    const result = validateTransaction({
      txn_date: null,
      amount: -50,
      currency: 'USD',
      category: 'Food',
      payer: 'Partner 1',
    });
    expect(getFirstError(result)).toBe('Date is required');
  });
});

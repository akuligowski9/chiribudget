import {
  CURRENCIES,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  ALL_CATEGORIES,
  PAYERS,
  USD_THRESHOLD,
  FX_USD_TO_PEN,
  PEN_THRESHOLD,
} from '../categories';

describe('CURRENCIES', () => {
  it('includes USD and PEN', () => {
    expect(CURRENCIES).toContain('USD');
    expect(CURRENCIES).toContain('PEN');
  });

  it('has exactly 2 currencies', () => {
    expect(CURRENCIES).toHaveLength(2);
  });
});

describe('EXPENSE_CATEGORIES', () => {
  it('includes expected expense categories', () => {
    expect(EXPENSE_CATEGORIES).toContain('Fixed Expenses');
    expect(EXPENSE_CATEGORIES).toContain('Food');
    expect(EXPENSE_CATEGORIES).toContain('Unexpected');
  });

  it('has 7 expense categories', () => {
    expect(EXPENSE_CATEGORIES).toHaveLength(7);
  });
});

describe('INCOME_CATEGORIES', () => {
  it('includes expected income categories', () => {
    expect(INCOME_CATEGORIES).toContain('Salary');
    expect(INCOME_CATEGORIES).toContain('Investments');
    expect(INCOME_CATEGORIES).toContain('Extra');
  });

  it('has 3 income categories', () => {
    expect(INCOME_CATEGORIES).toHaveLength(3);
  });
});

describe('ALL_CATEGORIES', () => {
  it('combines expense and income categories', () => {
    expect(ALL_CATEGORIES).toHaveLength(
      EXPENSE_CATEGORIES.length + INCOME_CATEGORIES.length
    );
  });

  it('includes all expense categories', () => {
    EXPENSE_CATEGORIES.forEach((cat) => {
      expect(ALL_CATEGORIES).toContain(cat);
    });
  });

  it('includes all income categories', () => {
    INCOME_CATEGORIES.forEach((cat) => {
      expect(ALL_CATEGORIES).toContain(cat);
    });
  });
});

describe('PAYERS', () => {
  it('includes expected payers', () => {
    expect(PAYERS).toContain('Partner 1');
    expect(PAYERS).toContain('Partner 2');
    expect(PAYERS).toContain('Together');
  });

  it('has exactly 3 payers', () => {
    expect(PAYERS).toHaveLength(3);
  });
});

describe('Threshold constants', () => {
  it('has correct USD threshold', () => {
    expect(USD_THRESHOLD).toBe(500);
  });

  it('has correct FX rate', () => {
    expect(FX_USD_TO_PEN).toBe(3.25);
  });

  it('calculates PEN threshold correctly', () => {
    expect(PEN_THRESHOLD).toBe(Math.round(USD_THRESHOLD * FX_USD_TO_PEN));
    expect(PEN_THRESHOLD).toBe(1625);
  });
});

import { toCsv } from '../csv';
import { parseAmount, parseDate, parseInterbankDate } from '../csvParserUtils';

describe('toCsv', () => {
  it('generates CSV with headers', () => {
    const rows = [
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 },
    ];
    const headers = ['name', 'age'];

    const result = toCsv(rows, headers);

    expect(result).toBe('name,age\nAlice,30\nBob,25');
  });

  it('handles empty rows', () => {
    const rows = [];
    const headers = ['name', 'age'];

    const result = toCsv(rows, headers);

    expect(result).toBe('name,age');
  });

  it('escapes values containing commas', () => {
    const rows = [{ desc: 'hello, world', amount: 100 }];
    const headers = ['desc', 'amount'];

    const result = toCsv(rows, headers);

    expect(result).toBe('desc,amount\n"hello, world",100');
  });

  it('escapes values containing quotes', () => {
    const rows = [{ desc: 'say "hello"', amount: 100 }];
    const headers = ['desc', 'amount'];

    const result = toCsv(rows, headers);

    expect(result).toBe('desc,amount\n"say ""hello""",100');
  });

  it('escapes values containing newlines', () => {
    const rows = [{ desc: 'line1\nline2', amount: 100 }];
    const headers = ['desc', 'amount'];

    const result = toCsv(rows, headers);

    expect(result).toBe('desc,amount\n"line1\nline2",100');
  });

  it('handles null and undefined values', () => {
    const rows = [{ name: null, age: undefined }];
    const headers = ['name', 'age'];

    const result = toCsv(rows, headers);

    expect(result).toBe('name,age\n,');
  });

  it('handles missing keys in rows', () => {
    const rows = [{ name: 'Alice' }];
    const headers = ['name', 'age'];

    const result = toCsv(rows, headers);

    expect(result).toBe('name,age\nAlice,');
  });
});

describe('parseInterbankDate', () => {
  it('parses DD-Mon format with Spanish months', () => {
    expect(parseInterbankDate('21-Sep', '2025')).toBe('2025-09-21');
    expect(parseInterbankDate('4-Oct', '2025')).toBe('2025-10-04');
    expect(parseInterbankDate('12-Dic', '2025')).toBe('2025-12-12');
    expect(parseInterbankDate('1-Ene', '2026')).toBe('2026-01-01');
  });

  it('handles all Spanish month abbreviations', () => {
    expect(parseInterbankDate('15-Ene', '2025')).toBe('2025-01-15');
    expect(parseInterbankDate('15-Feb', '2025')).toBe('2025-02-15');
    expect(parseInterbankDate('15-Mar', '2025')).toBe('2025-03-15');
    expect(parseInterbankDate('15-Abr', '2025')).toBe('2025-04-15');
    expect(parseInterbankDate('15-May', '2025')).toBe('2025-05-15');
    expect(parseInterbankDate('15-Jun', '2025')).toBe('2025-06-15');
    expect(parseInterbankDate('15-Jul', '2025')).toBe('2025-07-15');
    expect(parseInterbankDate('15-Ago', '2025')).toBe('2025-08-15');
    expect(parseInterbankDate('15-Sep', '2025')).toBe('2025-09-15');
    expect(parseInterbankDate('15-Oct', '2025')).toBe('2025-10-15');
    expect(parseInterbankDate('15-Nov', '2025')).toBe('2025-11-15');
    expect(parseInterbankDate('15-Dic', '2025')).toBe('2025-12-15');
  });

  it('returns null for empty or invalid input', () => {
    expect(parseInterbankDate('', '2025')).toBeNull();
    expect(parseInterbankDate(null, '2025')).toBeNull();
    expect(parseInterbankDate('invalid', '2025')).toBeNull();
    expect(parseInterbankDate('21/09/2025', '2025')).toBeNull();
  });

  it('handles case-insensitive month abbreviations', () => {
    expect(parseInterbankDate('21-SEP', '2025')).toBe('2025-09-21');
    expect(parseInterbankDate('21-sep', '2025')).toBe('2025-09-21');
  });
});

describe('parseDate with DD-Mon format', () => {
  it('delegates to parseInterbankDate for DD-Mon format', () => {
    expect(parseDate('21-Sep', 'DD-Mon', '2025')).toBe('2025-09-21');
    expect(parseDate('4-Oct', 'DD-Mon', '2025')).toBe('2025-10-04');
  });
});

describe('parseAmount', () => {
  it('parses Interbank S/ format', () => {
    expect(parseAmount('S/ 105.79')).toBe(105.79);
    expect(parseAmount(' S/ 105.79 ')).toBe(105.79);
  });

  it('parses amounts with commas for thousands', () => {
    expect(parseAmount('S/ 3,392.28')).toBe(3392.28);
    expect(parseAmount('S/ 1,234,567.89')).toBe(1234567.89);
  });

  it('handles empty and null values', () => {
    expect(parseAmount('')).toBe(0);
    expect(parseAmount(null)).toBe(0);
    expect(parseAmount(undefined)).toBe(0);
  });

  it('parses plain numbers', () => {
    expect(parseAmount('100.50')).toBe(100.5);
    expect(parseAmount(100.5)).toBe(100.5);
  });

  it('handles negative amounts', () => {
    expect(parseAmount('-50.00')).toBe(-50);
    expect(parseAmount('S/ -50.00')).toBe(-50);
  });
});

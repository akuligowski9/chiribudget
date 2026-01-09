import { yyyyMm, safeNumber, normalizeDesc, toastId } from '../format';

describe('yyyyMm', () => {
  it('extracts year-month from date string', () => {
    expect(yyyyMm('2024-03-15')).toBe('2024-03');
    expect(yyyyMm('2023-12-01')).toBe('2023-12');
  });

  it('handles partial date strings', () => {
    expect(yyyyMm('2024-03')).toBe('2024-03');
    expect(yyyyMm('2024')).toBe('2024');
  });

  it('handles null and undefined', () => {
    expect(yyyyMm(null)).toBe('');
    expect(yyyyMm(undefined)).toBe('');
    expect(yyyyMm('')).toBe('');
  });
});

describe('safeNumber', () => {
  it('converts valid numbers', () => {
    expect(safeNumber(42)).toBe(42);
    expect(safeNumber('123.45')).toBe(123.45);
    expect(safeNumber(-100)).toBe(-100);
    expect(safeNumber(0)).toBe(0);
  });

  it('returns 0 for invalid values', () => {
    expect(safeNumber(null)).toBe(0);
    expect(safeNumber(undefined)).toBe(0);
    expect(safeNumber('abc')).toBe(0);
    expect(safeNumber(NaN)).toBe(0);
    expect(safeNumber(Infinity)).toBe(0);
    expect(safeNumber(-Infinity)).toBe(0);
  });
});

describe('normalizeDesc', () => {
  it('trims and lowercases text', () => {
    expect(normalizeDesc('  Hello World  ')).toBe('hello world');
    expect(normalizeDesc('TEST')).toBe('test');
  });

  it('collapses multiple spaces', () => {
    expect(normalizeDesc('hello   world')).toBe('hello world');
    expect(normalizeDesc('a    b    c')).toBe('a b c');
  });

  it('handles null and undefined', () => {
    expect(normalizeDesc(null)).toBe('');
    expect(normalizeDesc(undefined)).toBe('');
    expect(normalizeDesc('')).toBe('');
  });
});

describe('toastId', () => {
  it('generates unique IDs', () => {
    const id1 = toastId();
    const id2 = toastId();
    expect(id1).not.toBe(id2);
  });

  it('returns a string', () => {
    expect(typeof toastId()).toBe('string');
  });

  it('returns non-empty string', () => {
    expect(toastId().length).toBeGreaterThan(0);
  });
});

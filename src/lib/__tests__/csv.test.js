import { toCsv } from '../csv';

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

import {
  generateRecurringFingerprint,
  formatDateString,
  parseDateString,
  getNextOccurrence,
  shouldGenerateOccurrence,
  calculateOccurrences,
  generateTransactionFromRecurring,
  filterExistingOccurrences,
  getFrequencyOptions,
} from '../recurringUtils';

describe('generateRecurringFingerprint', () => {
  it('generates fingerprint in correct format', () => {
    const result = generateRecurringFingerprint('abc-123', '2024-01-15');
    expect(result).toBe('recurring_abc-123_2024-01-15');
  });

  it('handles UUID-style IDs', () => {
    const result = generateRecurringFingerprint(
      'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      '2024-06-01'
    );
    expect(result).toBe(
      'recurring_f47ac10b-58cc-4372-a567-0e02b2c3d479_2024-06-01'
    );
  });
});

describe('formatDateString', () => {
  it('formats date to YYYY-MM-DD', () => {
    const date = new Date(2024, 0, 15); // Jan 15, 2024
    expect(formatDateString(date)).toBe('2024-01-15');
  });

  it('pads single-digit months', () => {
    const date = new Date(2024, 5, 1); // June 1, 2024
    expect(formatDateString(date)).toBe('2024-06-01');
  });

  it('pads single-digit days', () => {
    const date = new Date(2024, 11, 5); // Dec 5, 2024
    expect(formatDateString(date)).toBe('2024-12-05');
  });

  it('handles year boundaries', () => {
    const date = new Date(2023, 11, 31); // Dec 31, 2023
    expect(formatDateString(date)).toBe('2023-12-31');
  });
});

describe('parseDateString', () => {
  it('parses YYYY-MM-DD to Date', () => {
    const result = parseDateString('2024-01-15');
    expect(result.getFullYear()).toBe(2024);
    expect(result.getMonth()).toBe(0); // January
    expect(result.getDate()).toBe(15);
  });

  it('handles month boundaries', () => {
    const result = parseDateString('2024-02-29'); // Leap year
    expect(result.getMonth()).toBe(1); // February
    expect(result.getDate()).toBe(29);
  });

  it('round-trips with formatDateString', () => {
    const original = '2024-06-15';
    const parsed = parseDateString(original);
    const formatted = formatDateString(parsed);
    expect(formatted).toBe(original);
  });
});

describe('getNextOccurrence', () => {
  describe('daily frequency', () => {
    it('returns next day', () => {
      const recurring = {
        frequency: 'daily',
        start_date: '2024-01-01',
        end_date: null,
      };
      const result = getNextOccurrence(recurring, '2024-01-15');
      expect(result).toBe('2024-01-16');
    });

    it('returns start date if after is before start', () => {
      const recurring = {
        frequency: 'daily',
        start_date: '2024-01-15',
        end_date: null,
      };
      const result = getNextOccurrence(recurring, '2024-01-10');
      expect(result).toBe('2024-01-15');
    });
  });

  describe('weekly frequency', () => {
    it('returns next week', () => {
      const recurring = {
        frequency: 'weekly',
        start_date: '2024-01-01', // Monday
        end_date: null,
      };
      const result = getNextOccurrence(recurring, '2024-01-01');
      expect(result).toBe('2024-01-08');
    });

    it('finds correct week after given date', () => {
      const recurring = {
        frequency: 'weekly',
        start_date: '2024-01-01',
        end_date: null,
      };
      const result = getNextOccurrence(recurring, '2024-01-10');
      expect(result).toBe('2024-01-15');
    });
  });

  describe('biweekly frequency', () => {
    it('returns two weeks later', () => {
      const recurring = {
        frequency: 'biweekly',
        start_date: '2024-01-01',
        end_date: null,
      };
      const result = getNextOccurrence(recurring, '2024-01-01');
      expect(result).toBe('2024-01-15');
    });

    it('maintains biweekly alignment from start date', () => {
      const recurring = {
        frequency: 'biweekly',
        start_date: '2024-01-01',
        end_date: null,
      };
      // Jan 10 is between Jan 1 and Jan 15, so next should be Jan 15
      const result = getNextOccurrence(recurring, '2024-01-10');
      expect(result).toBe('2024-01-15');
    });
  });

  describe('monthly frequency', () => {
    it('returns same day next month', () => {
      const recurring = {
        frequency: 'monthly',
        start_date: '2024-01-15',
        end_date: null,
        day_of_month: null,
      };
      const result = getNextOccurrence(recurring, '2024-01-15');
      expect(result).toBe('2024-02-15');
    });

    it('uses day_of_month when specified', () => {
      // Note: day_of_month affects subsequent months, not the initial occurrence
      // First occurrence is always start_date, subsequent use day_of_month
      const recurring = {
        frequency: 'monthly',
        start_date: '2024-01-20',
        end_date: null,
        day_of_month: 20,
      };
      const result = getNextOccurrence(recurring, '2024-01-15');
      expect(result).toBe('2024-01-20');
    });

    it('advances to day_of_month in subsequent months', () => {
      // day_of_month=15 but start_date is the 1st
      // Subsequent months land on the 15th
      const recurring = {
        frequency: 'monthly',
        start_date: '2024-01-01',
        end_date: null,
        day_of_month: 15,
      };
      const result = getNextOccurrence(recurring, '2024-01-01');
      expect(result).toBe('2024-02-15');
    });

    it('handles month-end edge case (day 31 in February)', () => {
      const recurring = {
        frequency: 'monthly',
        start_date: '2024-01-31',
        end_date: null,
        day_of_month: 31,
      };
      const result = getNextOccurrence(recurring, '2024-01-31');
      // February 2024 has 29 days (leap year), so day 31 → day 29
      expect(result).toBe('2024-02-29');
    });

    it('handles day 31 in 30-day month', () => {
      const recurring = {
        frequency: 'monthly',
        start_date: '2024-03-31',
        end_date: null,
        day_of_month: 31,
      };
      const result = getNextOccurrence(recurring, '2024-03-31');
      // April has 30 days, so day 31 → day 30
      expect(result).toBe('2024-04-30');
    });

    it('handles February 29 in non-leap year', () => {
      const recurring = {
        frequency: 'monthly',
        start_date: '2024-01-29',
        end_date: null,
        day_of_month: 29,
      };
      // After Feb 2024 (leap year), find next Feb 29 equivalent
      const result = getNextOccurrence(recurring, '2025-01-29');
      // Feb 2025 has 28 days, so day 29 → day 28
      expect(result).toBe('2025-02-28');
    });
  });

  describe('yearly frequency', () => {
    it('returns same date next year', () => {
      const recurring = {
        frequency: 'yearly',
        start_date: '2024-06-15',
        end_date: null,
      };
      const result = getNextOccurrence(recurring, '2024-06-15');
      expect(result).toBe('2025-06-15');
    });

    it('handles leap year (Feb 29 → Feb 28)', () => {
      const recurring = {
        frequency: 'yearly',
        start_date: '2024-02-29', // Leap year
        end_date: null,
      };
      const result = getNextOccurrence(recurring, '2024-02-29');
      // 2025 is not a leap year, so Feb 29 → Feb 28
      expect(result).toBe('2025-02-28');
    });

    it('returns to Feb 29 in next leap year', () => {
      const recurring = {
        frequency: 'yearly',
        start_date: '2024-02-29',
        end_date: null,
      };
      // After 2027, next leap year is 2028
      const result = getNextOccurrence(recurring, '2027-02-28');
      expect(result).toBe('2028-02-29');
    });
  });

  describe('end date handling', () => {
    it('returns null when past end date', () => {
      const recurring = {
        frequency: 'monthly',
        start_date: '2024-01-15',
        end_date: '2024-03-15',
      };
      const result = getNextOccurrence(recurring, '2024-03-15');
      expect(result).toBeNull();
    });

    it('returns occurrence up to end date', () => {
      const recurring = {
        frequency: 'monthly',
        start_date: '2024-01-15',
        end_date: '2024-04-15',
      };
      const result = getNextOccurrence(recurring, '2024-02-15');
      expect(result).toBe('2024-03-15');
    });
  });
});

describe('shouldGenerateOccurrence', () => {
  it('returns true when no exceptions', () => {
    const recurring = { id: 'rec-1' };
    const exceptions = [];
    expect(shouldGenerateOccurrence(recurring, '2024-01-15', exceptions)).toBe(
      true
    );
  });

  it('returns false when occurrence is skipped', () => {
    const recurring = { id: 'rec-1' };
    const exceptions = [
      {
        recurring_id: 'rec-1',
        occurrence_date: '2024-01-15',
        exception_type: 'skip',
      },
    ];
    expect(shouldGenerateOccurrence(recurring, '2024-01-15', exceptions)).toBe(
      false
    );
  });

  it('returns true for different date', () => {
    const recurring = { id: 'rec-1' };
    const exceptions = [
      {
        recurring_id: 'rec-1',
        occurrence_date: '2024-01-15',
        exception_type: 'skip',
      },
    ];
    expect(shouldGenerateOccurrence(recurring, '2024-01-16', exceptions)).toBe(
      true
    );
  });

  it('returns true for different recurring_id', () => {
    const recurring = { id: 'rec-1' };
    const exceptions = [
      {
        recurring_id: 'rec-2',
        occurrence_date: '2024-01-15',
        exception_type: 'skip',
      },
    ];
    expect(shouldGenerateOccurrence(recurring, '2024-01-15', exceptions)).toBe(
      true
    );
  });

  it('handles empty exceptions array', () => {
    const recurring = { id: 'rec-1' };
    expect(shouldGenerateOccurrence(recurring, '2024-01-15', [])).toBe(true);
  });

  it('handles undefined exceptions', () => {
    const recurring = { id: 'rec-1' };
    expect(shouldGenerateOccurrence(recurring, '2024-01-15')).toBe(true);
  });
});

describe('calculateOccurrences', () => {
  describe('daily frequency', () => {
    it('returns all days in range', () => {
      const recurring = {
        frequency: 'daily',
        start_date: '2024-01-01',
        end_date: null,
      };
      const result = calculateOccurrences(
        recurring,
        '2024-01-01',
        '2024-01-05'
      );
      expect(result).toEqual([
        '2024-01-01',
        '2024-01-02',
        '2024-01-03',
        '2024-01-04',
        '2024-01-05',
      ]);
    });

    it('starts from recurring start_date, not range start', () => {
      const recurring = {
        frequency: 'daily',
        start_date: '2024-01-03',
        end_date: null,
      };
      const result = calculateOccurrences(
        recurring,
        '2024-01-01',
        '2024-01-05'
      );
      expect(result).toEqual(['2024-01-03', '2024-01-04', '2024-01-05']);
    });
  });

  describe('weekly frequency', () => {
    it('returns weekly occurrences', () => {
      const recurring = {
        frequency: 'weekly',
        start_date: '2024-01-01',
        end_date: null,
      };
      const result = calculateOccurrences(
        recurring,
        '2024-01-01',
        '2024-01-31'
      );
      expect(result).toEqual([
        '2024-01-01',
        '2024-01-08',
        '2024-01-15',
        '2024-01-22',
        '2024-01-29',
      ]);
    });
  });

  describe('biweekly frequency', () => {
    it('returns biweekly occurrences', () => {
      const recurring = {
        frequency: 'biweekly',
        start_date: '2024-01-01',
        end_date: null,
      };
      const result = calculateOccurrences(
        recurring,
        '2024-01-01',
        '2024-02-29'
      );
      expect(result).toEqual([
        '2024-01-01',
        '2024-01-15',
        '2024-01-29',
        '2024-02-12',
        '2024-02-26',
      ]);
    });

    it('maintains alignment even when range starts mid-cycle', () => {
      const recurring = {
        frequency: 'biweekly',
        start_date: '2024-01-01',
        end_date: null,
      };
      // Range starts Jan 10 (between Jan 1 and Jan 15)
      const result = calculateOccurrences(
        recurring,
        '2024-01-10',
        '2024-02-15'
      );
      expect(result).toEqual(['2024-01-15', '2024-01-29', '2024-02-12']);
    });
  });

  describe('monthly frequency', () => {
    it('returns monthly occurrences', () => {
      const recurring = {
        frequency: 'monthly',
        start_date: '2024-01-15',
        end_date: null,
      };
      const result = calculateOccurrences(
        recurring,
        '2024-01-01',
        '2024-04-30'
      );
      expect(result).toEqual([
        '2024-01-15',
        '2024-02-15',
        '2024-03-15',
        '2024-04-15',
      ]);
    });

    it('handles month-end correctly across year', () => {
      const recurring = {
        frequency: 'monthly',
        start_date: '2024-01-31',
        end_date: null,
        day_of_month: 31,
      };
      const result = calculateOccurrences(
        recurring,
        '2024-01-01',
        '2024-05-31'
      );
      expect(result).toEqual([
        '2024-01-31',
        '2024-02-29', // Leap year
        '2024-03-31',
        '2024-04-30', // April has 30 days
        '2024-05-31',
      ]);
    });
  });

  describe('yearly frequency', () => {
    it('returns yearly occurrences', () => {
      const recurring = {
        frequency: 'yearly',
        start_date: '2024-06-15',
        end_date: null,
      };
      const result = calculateOccurrences(
        recurring,
        '2024-01-01',
        '2027-12-31'
      );
      expect(result).toEqual([
        '2024-06-15',
        '2025-06-15',
        '2026-06-15',
        '2027-06-15',
      ]);
    });
  });

  describe('end date handling', () => {
    it('stops at recurring end_date', () => {
      const recurring = {
        frequency: 'monthly',
        start_date: '2024-01-15',
        end_date: '2024-03-15',
      };
      const result = calculateOccurrences(
        recurring,
        '2024-01-01',
        '2024-12-31'
      );
      expect(result).toEqual(['2024-01-15', '2024-02-15', '2024-03-15']);
    });

    it('returns empty when recurring starts after range', () => {
      const recurring = {
        frequency: 'monthly',
        start_date: '2024-06-01',
        end_date: null,
      };
      const result = calculateOccurrences(
        recurring,
        '2024-01-01',
        '2024-05-31'
      );
      expect(result).toEqual([]);
    });

    it('returns empty when recurring ended before range', () => {
      const recurring = {
        frequency: 'monthly',
        start_date: '2024-01-01',
        end_date: '2024-03-01',
      };
      const result = calculateOccurrences(
        recurring,
        '2024-06-01',
        '2024-12-31'
      );
      expect(result).toEqual([]);
    });
  });
});

describe('generateTransactionFromRecurring', () => {
  it('generates transaction with all fields', () => {
    const recurring = {
      id: 'rec-123',
      currency: 'USD',
      description: 'Monthly rent',
      amount: -1500,
      category: 'Fixed Expenses',
      payer: 'Partner 1',
    };

    const result = generateTransactionFromRecurring(
      recurring,
      '2024-01-15',
      'household-456',
      'user-789'
    );

    expect(result.household_id).toBe('household-456');
    expect(result.txn_date).toBe('2024-01-15');
    expect(result.currency).toBe('USD');
    expect(result.description).toBe('Monthly rent');
    expect(result.amount).toBe(-1500);
    expect(result.category).toBe('Fixed Expenses');
    expect(result.payer).toBe('Partner 1');
    expect(result.is_flagged).toBe(false);
    expect(result.flag_reason).toBeNull();
    expect(result.source).toBe('recurring');
    expect(result.fingerprint).toBe('recurring_rec-123_2024-01-15');
    expect(result.recurring_fingerprint).toBe('recurring_rec-123_2024-01-15');
    expect(result.created_by).toBe('user-789');
  });

  it('handles missing description', () => {
    const recurring = {
      id: 'rec-123',
      currency: 'PEN',
      description: null,
      amount: 500,
      category: 'Income',
      payer: 'Together',
    };

    const result = generateTransactionFromRecurring(
      recurring,
      '2024-02-01',
      'hh-1',
      'user-1'
    );

    expect(result.description).toBe('');
  });

  it('converts string amount to number', () => {
    const recurring = {
      id: 'rec-123',
      currency: 'USD',
      description: 'Test',
      amount: '-100.50',
      category: 'Food',
      payer: 'Partner 2',
    };

    const result = generateTransactionFromRecurring(
      recurring,
      '2024-01-01',
      'hh-1',
      'user-1'
    );

    expect(result.amount).toBe(-100.5);
    expect(typeof result.amount).toBe('number');
  });
});

describe('filterExistingOccurrences', () => {
  it('filters out occurrences with existing fingerprints (Set)', () => {
    const occurrences = ['2024-01-15', '2024-02-15', '2024-03-15'];
    const existingFingerprints = new Set([
      'recurring_rec-1_2024-01-15',
      'recurring_rec-1_2024-03-15',
    ]);

    const result = filterExistingOccurrences(
      occurrences,
      'rec-1',
      existingFingerprints
    );

    expect(result).toEqual(['2024-02-15']);
  });

  it('filters out occurrences with existing fingerprints (Array)', () => {
    const occurrences = ['2024-01-15', '2024-02-15', '2024-03-15'];
    const existingFingerprints = ['recurring_rec-1_2024-02-15'];

    const result = filterExistingOccurrences(
      occurrences,
      'rec-1',
      existingFingerprints
    );

    expect(result).toEqual(['2024-01-15', '2024-03-15']);
  });

  it('returns all occurrences when no existing fingerprints', () => {
    const occurrences = ['2024-01-15', '2024-02-15'];
    const existingFingerprints = new Set();

    const result = filterExistingOccurrences(
      occurrences,
      'rec-1',
      existingFingerprints
    );

    expect(result).toEqual(['2024-01-15', '2024-02-15']);
  });

  it('returns empty when all occurrences exist', () => {
    const occurrences = ['2024-01-15'];
    const existingFingerprints = new Set(['recurring_rec-1_2024-01-15']);

    const result = filterExistingOccurrences(
      occurrences,
      'rec-1',
      existingFingerprints
    );

    expect(result).toEqual([]);
  });

  it('does not filter fingerprints from different recurring IDs', () => {
    const occurrences = ['2024-01-15'];
    const existingFingerprints = new Set(['recurring_rec-2_2024-01-15']);

    const result = filterExistingOccurrences(
      occurrences,
      'rec-1',
      existingFingerprints
    );

    expect(result).toEqual(['2024-01-15']);
  });
});

describe('getFrequencyOptions', () => {
  it('returns all frequency options', () => {
    const options = getFrequencyOptions();

    expect(options).toHaveLength(5);
    expect(options.map((o) => o.value)).toEqual([
      'daily',
      'weekly',
      'biweekly',
      'monthly',
      'yearly',
    ]);
  });

  it('includes translation keys', () => {
    const options = getFrequencyOptions();

    options.forEach((opt) => {
      expect(opt.labelKey).toMatch(/^recurring\.frequency\./);
    });
  });
});

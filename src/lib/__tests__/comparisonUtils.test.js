import {
  getPreviousPeriodRange,
  calculateCategoryDelta,
  calculateCategoryComparison,
  isSignificantChange,
  generateInsights,
  formatPreviousPeriodLabel,
} from '../comparisonUtils';

describe('getPreviousPeriodRange', () => {
  describe('day preset', () => {
    it('returns previous day', () => {
      const result = getPreviousPeriodRange('day', '2024-01-15', '2024-01-15');
      expect(result.previousStartDate).toBe('2024-01-14');
      expect(result.previousEndDate).toBe('2024-01-14');
    });
  });

  describe('week preset', () => {
    it('returns previous week', () => {
      const result = getPreviousPeriodRange('week', '2024-01-14', '2024-01-20');
      expect(result.previousStartDate).toBe('2024-01-07');
      expect(result.previousEndDate).toBe('2024-01-13');
    });
  });

  describe('month preset', () => {
    it('returns previous month (full month comparison)', () => {
      const result = getPreviousPeriodRange(
        'month',
        '2024-02-01',
        '2024-02-29'
      );
      expect(result.previousStartDate).toBe('2024-01-01');
      // Feb 29 is last day of February, so previous month end should be last day of January
      expect(result.previousEndDate).toBe('2024-01-31');
    });

    it('handles month-end edge cases (single day at month end)', () => {
      const result = getPreviousPeriodRange(
        'month',
        '2024-01-31',
        '2024-01-31'
      );
      expect(result.previousStartDate).toBe('2023-12-31');
      // Jan 31 is last day of January, so previous should be last day of December
      expect(result.previousEndDate).toBe('2023-12-31');
    });

    it('handles leap year (Feb 29 is last day of month)', () => {
      const result = getPreviousPeriodRange(
        'month',
        '2024-02-29',
        '2024-02-29'
      );
      expect(result.previousStartDate).toBe('2024-01-29');
      // Feb 29 is last day of February, so previous should be last day of January
      expect(result.previousEndDate).toBe('2024-01-31');
    });
  });

  describe('quarter preset', () => {
    it('returns previous quarter', () => {
      const result = getPreviousPeriodRange(
        'quarter',
        '2024-04-01',
        '2024-06-30'
      );
      expect(result.previousStartDate).toBe('2024-01-01');
      expect(result.previousEndDate).toBe('2024-03-31');
    });
  });

  describe('year preset', () => {
    it('returns previous year', () => {
      const result = getPreviousPeriodRange('year', '2024-01-01', '2024-12-31');
      expect(result.previousStartDate).toBe('2023-01-01');
      expect(result.previousEndDate).toBe('2023-12-31');
    });
  });

  describe('custom preset', () => {
    it('shifts backward by range duration', () => {
      const result = getPreviousPeriodRange(
        'custom',
        '2024-01-15',
        '2024-01-24'
      );
      // 10-day range, so should shift back 10 days
      expect(result.previousStartDate).toBe('2024-01-05');
      expect(result.previousEndDate).toBe('2024-01-14');
    });

    it('handles single-day custom range', () => {
      const result = getPreviousPeriodRange(
        'custom',
        '2024-01-15',
        '2024-01-15'
      );
      expect(result.previousStartDate).toBe('2024-01-14');
      expect(result.previousEndDate).toBe('2024-01-14');
    });
  });

  describe('edge cases', () => {
    it('returns null for missing dates', () => {
      const result = getPreviousPeriodRange('month', null, null);
      expect(result).toBeNull();
    });

    it('returns null for unknown preset', () => {
      const result = getPreviousPeriodRange(
        'unknown',
        '2024-01-01',
        '2024-01-31'
      );
      expect(result).toBeNull();
    });
  });
});

describe('calculateCategoryDelta', () => {
  it('calculates normal percentage change', () => {
    const result = calculateCategoryDelta(120, 100);
    expect(result.current).toBe(120);
    expect(result.previous).toBe(100);
    expect(result.delta).toBe(20);
    expect(result.percentChange).toBe(20);
    expect(result.trend).toBe('up');
    expect(result.isNew).toBe(false);
  });

  it('calculates negative percentage change', () => {
    const result = calculateCategoryDelta(80, 100);
    expect(result.delta).toBe(-20);
    expect(result.percentChange).toBe(-20);
    expect(result.trend).toBe('down');
  });

  it('handles new category (previous = 0)', () => {
    const result = calculateCategoryDelta(100, 0);
    expect(result.current).toBe(100);
    expect(result.previous).toBe(0);
    expect(result.delta).toBe(100);
    expect(result.percentChange).toBeNull();
    expect(result.isNew).toBe(true);
  });

  it('handles category dropped to zero', () => {
    const result = calculateCategoryDelta(0, 100);
    expect(result.current).toBe(0);
    expect(result.previous).toBe(100);
    expect(result.delta).toBe(-100);
    expect(result.percentChange).toBe(-100);
    expect(result.trend).toBe('down');
    expect(result.isNew).toBe(false);
  });

  it('handles no spending in both periods', () => {
    const result = calculateCategoryDelta(0, 0);
    expect(result.current).toBe(0);
    expect(result.previous).toBe(0);
    expect(result.delta).toBe(0);
    expect(result.percentChange).toBe(0);
    expect(result.trend).toBe('stable');
    expect(result.isNew).toBe(false);
  });

  it('handles decimal percentages correctly', () => {
    const result = calculateCategoryDelta(105, 100);
    expect(result.percentChange).toBe(5);
  });

  it('rounds percentage to 1 decimal place', () => {
    const result = calculateCategoryDelta(106.66, 100);
    expect(result.percentChange).toBe(6.7);
  });
});

describe('calculateCategoryComparison', () => {
  it('compares all categories from both periods', () => {
    const current = { Food: 450, Dogs: 120, Adventure: 0 };
    const previous = { Food: 400, Dogs: 150, Unexpected: 50 };

    const result = calculateCategoryComparison(current, previous);

    expect(result.Food.current).toBe(450);
    expect(result.Food.previous).toBe(400);
    expect(result.Food.percentChange).toBe(12.5);

    expect(result.Dogs.current).toBe(120);
    expect(result.Dogs.previous).toBe(150);
    expect(result.Dogs.percentChange).toBe(-20);

    expect(result.Adventure.current).toBe(0);
    expect(result.Adventure.previous).toBe(0);

    expect(result.Unexpected.current).toBe(0);
    expect(result.Unexpected.previous).toBe(50);
    expect(result.Unexpected.percentChange).toBe(-100);
  });

  it('handles empty objects', () => {
    const result = calculateCategoryComparison({}, {});
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('handles categories only in current', () => {
    const current = { Food: 100 };
    const previous = {};

    const result = calculateCategoryComparison(current, previous);

    expect(result.Food.current).toBe(100);
    expect(result.Food.previous).toBe(0);
    expect(result.Food.isNew).toBe(true);
  });

  it('handles categories only in previous', () => {
    const current = {};
    const previous = { Food: 100 };

    const result = calculateCategoryComparison(current, previous);

    expect(result.Food.current).toBe(0);
    expect(result.Food.previous).toBe(100);
    expect(result.Food.percentChange).toBe(-100);
  });
});

describe('isSignificantChange', () => {
  it('returns true for changes above threshold', () => {
    expect(isSignificantChange(10, 100, 5)).toBe(true);
    expect(isSignificantChange(-10, -100, 5)).toBe(true);
  });

  it('returns false for changes below threshold', () => {
    expect(isSignificantChange(3, 30, 5)).toBe(false);
    expect(isSignificantChange(-3, -30, 5)).toBe(false);
  });

  it('returns true for exactly threshold', () => {
    expect(isSignificantChange(5, 50, 5)).toBe(true);
    expect(isSignificantChange(-5, -50, 5)).toBe(true);
  });

  it('returns true for new categories (null percent)', () => {
    expect(isSignificantChange(null, 100, 5)).toBe(true);
  });

  it('uses default threshold of 5%', () => {
    expect(isSignificantChange(6, 60)).toBe(true);
    expect(isSignificantChange(4, 40)).toBe(false);
  });
});

describe('generateInsights', () => {
  it('generates insights for significant increases', () => {
    const comparisonData = {
      Food: {
        current: 550,
        previous: 500,
        delta: 50,
        percentChange: 10,
        trend: 'up',
        isNew: false,
      },
      Dogs: {
        current: 240,
        previous: 200,
        delta: 40,
        percentChange: 20,
        trend: 'up',
        isNew: false,
      },
    };

    const insights = generateInsights(comparisonData, 'expense', 10);

    expect(insights).toHaveLength(2);
    expect(insights[0].category).toBe('Dogs'); // 20% is larger
    expect(insights[0].change).toBe('increased');
    expect(insights[0].type).toBe('increase');
    expect(insights[0].percentChange).toBe(20);

    expect(insights[1].category).toBe('Food');
    expect(insights[1].percentChange).toBe(10);
  });

  it('generates insights for significant decreases', () => {
    const comparisonData = {
      Food: {
        current: 400,
        previous: 500,
        delta: -100,
        percentChange: -20,
        trend: 'down',
        isNew: false,
      },
    };

    const insights = generateInsights(comparisonData, 'expense', 10);

    expect(insights).toHaveLength(1);
    expect(insights[0].change).toBe('decreased');
    expect(insights[0].type).toBe('decrease');
    expect(insights[0].percentChange).toBe(20); // Absolute value
  });

  it('generates insights for new categories', () => {
    const comparisonData = {
      Adventure: {
        current: 300,
        previous: 0,
        delta: 300,
        percentChange: null,
        trend: 'up',
        isNew: true,
      },
    };

    const insights = generateInsights(comparisonData, 'expense', 10);

    expect(insights).toHaveLength(1);
    expect(insights[0].category).toBe('Adventure');
    expect(insights[0].change).toBe('new');
    expect(insights[0].type).toBe('new');
    expect(insights[0].percentChange).toBeNull();
  });

  it('excludes changes below threshold', () => {
    const comparisonData = {
      Food: {
        current: 505,
        previous: 500,
        delta: 5,
        percentChange: 1,
        trend: 'up',
        isNew: false,
      },
      Dogs: {
        current: 120,
        previous: 100,
        delta: 20,
        percentChange: 20,
        trend: 'up',
        isNew: false,
      },
    };

    const insights = generateInsights(comparisonData, 'expense', 10);

    expect(insights).toHaveLength(1);
    expect(insights[0].category).toBe('Dogs');
  });

  it('returns empty array for no significant changes', () => {
    const comparisonData = {
      Food: {
        current: 502,
        previous: 500,
        delta: 2,
        percentChange: 0.4,
        trend: 'up',
        isNew: false,
      },
    };

    const insights = generateInsights(comparisonData, 'expense', 10);

    expect(insights).toHaveLength(0);
  });

  it('sorts insights by absolute percentage change (descending)', () => {
    const comparisonData = {
      Food: {
        current: 550,
        previous: 500,
        percentChange: 10,
        trend: 'up',
        isNew: false,
      },
      Dogs: {
        current: 150,
        previous: 100,
        percentChange: 50,
        trend: 'up',
        isNew: false,
      },
      Adventure: {
        current: 420,
        previous: 400,
        percentChange: 5,
        trend: 'up',
        isNew: false,
      },
    };

    // Set threshold low so all are included
    const insights = generateInsights(comparisonData, 'expense', 5);

    expect(insights).toHaveLength(3);
    expect(insights[0].category).toBe('Dogs'); // 50%
    expect(insights[1].category).toBe('Food'); // 10%
    expect(insights[2].category).toBe('Adventure'); // 5%
  });
});

describe('formatPreviousPeriodLabel', () => {
  it('formats same-day range', () => {
    const label = formatPreviousPeriodLabel('2024-01-15', '2024-01-15');
    expect(label).toBe('Jan 15, 2024');
  });

  it('formats same-month range', () => {
    const label = formatPreviousPeriodLabel('2024-01-01', '2024-01-31');
    expect(label).toBe('Jan 1-31, 2024');
  });

  it('formats different-month range', () => {
    const label = formatPreviousPeriodLabel('2024-01-15', '2024-02-15');
    expect(label).toBe('Jan 15, 2024 - Feb 15, 2024');
  });

  it('formats year-boundary range', () => {
    const label = formatPreviousPeriodLabel('2023-12-20', '2024-01-10');
    expect(label).toBe('Dec 20, 2023 - Jan 10, 2024');
  });

  it('returns empty string for missing dates', () => {
    expect(formatPreviousPeriodLabel(null, null)).toBe('');
    expect(formatPreviousPeriodLabel('2024-01-01', null)).toBe('');
    expect(formatPreviousPeriodLabel(null, '2024-01-31')).toBe('');
  });
});

'use client';

import { render, screen, fireEvent } from '@testing-library/react';
import PeriodComparisonSection from '../PeriodComparisonSection';

// Mock the comparisonUtils
jest.mock('@/lib/comparisonUtils', () => ({
  calculateCategoryComparison: jest.fn((currentByCat, previousByCat) => {
    const comparison = {};
    const allCategories = new Set([
      ...Object.keys(currentByCat),
      ...Object.keys(previousByCat),
    ]);

    for (const category of allCategories) {
      const current = currentByCat[category] || 0;
      const previous = previousByCat[category] || 0;
      const delta = current - previous;

      let percentChange = null;
      let isNew = false;

      if (previous === 0 && current > 0) {
        isNew = true;
      } else if (previous > 0) {
        percentChange = parseFloat(((delta / previous) * 100).toFixed(1));
      }

      const trend = delta > 0 ? 'up' : delta < 0 ? 'down' : 'stable';

      comparison[category] = {
        current,
        previous,
        delta,
        percentChange,
        trend,
        isNew,
      };
    }

    return comparison;
  }),
  generateInsights: jest.fn((comparisonData, type, threshold) => {
    const insights = [];
    for (const [category, metrics] of Object.entries(comparisonData)) {
      if (metrics.isNew) {
        insights.push({
          category,
          change: 'new',
          type: 'new',
          percentChange: null,
        });
      } else if (
        metrics.percentChange !== null &&
        Math.abs(metrics.percentChange) >= threshold
      ) {
        insights.push({
          category,
          change: metrics.trend === 'up' ? 'increased' : 'decreased',
          type: metrics.trend === 'up' ? 'increase' : 'decrease',
          percentChange: Math.abs(metrics.percentChange),
        });
      }
    }
    return insights.sort((a, b) => {
      if (a.percentChange === null) return 1;
      if (b.percentChange === null) return -1;
      return b.percentChange - a.percentChange;
    });
  }),
}));

// Mock the categories
jest.mock('@/lib/categories', () => ({
  EXPENSE_CATEGORIES: ['Food', 'Dogs', 'Fixed Expenses'],
  INCOME_CATEGORIES: ['Salary', 'Investments'],
}));

// Mock the format utilities
jest.mock('@/lib/format', () => ({
  formatCurrency: (amount, currency) => {
    return `${currency} ${amount.toFixed(2)}`;
  },
}));

describe('PeriodComparisonSection', () => {
  const mockCurrentData = {
    incomeByCat: { Salary: 3000, Investments: 100 },
    expenseByCat: { Food: 450, Dogs: 120, 'Fixed Expenses': 1200 },
    totalIncome: 3100,
    totalExpenses: 1770,
    net: 1330,
  };

  const mockPreviousData = {
    incomeByCat: { Salary: 3000, Investments: 80 },
    expenseByCat: { Food: 400, Dogs: 150, 'Fixed Expenses': 1200 },
    totalIncome: 3080,
    totalExpenses: 1750,
    net: 1330,
  };

  const defaultProps = {
    currentData: mockCurrentData,
    previousData: mockPreviousData,
    previousPeriodLabel: 'Dec 1-31, 2025',
    currency: 'USD',
  };

  describe('rendering', () => {
    it('renders collapsed by default', () => {
      render(<PeriodComparisonSection {...defaultProps} />);

      expect(screen.getByText('Period Comparison')).toBeInTheDocument();
      expect(
        screen.getByText('Comparing to: Dec 1-31, 2025')
      ).toBeInTheDocument();

      // Content should not be visible
      expect(screen.queryByText('Expenses')).not.toBeInTheDocument();
    });

    it('does not render without previous data', () => {
      const { container } = render(
        <PeriodComparisonSection {...defaultProps} previousData={null} />
      );

      expect(container.firstChild).toBeNull();
    });

    it('expands when clicked', () => {
      render(<PeriodComparisonSection {...defaultProps} />);

      const header = screen.getByText('Period Comparison').closest('button');
      fireEvent.click(header);

      // Content should now be visible
      expect(screen.getByText('Expenses')).toBeInTheDocument();
      expect(screen.getByText('Income')).toBeInTheDocument();
    });

    it('collapses when clicked again', () => {
      render(<PeriodComparisonSection {...defaultProps} />);

      const header = screen.getByText('Period Comparison').closest('button');

      // Expand
      fireEvent.click(header);
      expect(screen.getByText('Expenses')).toBeInTheDocument();

      // Collapse
      fireEvent.click(header);
      expect(screen.queryByText('Expenses')).not.toBeInTheDocument();
    });
  });

  describe('expense comparison table', () => {
    beforeEach(() => {
      render(<PeriodComparisonSection {...defaultProps} />);
      const header = screen.getByText('Period Comparison').closest('button');
      fireEvent.click(header);
    });

    it('shows all expense categories with spending', () => {
      expect(screen.getByText('categories.food')).toBeInTheDocument();
      expect(screen.getByText('categories.dogs')).toBeInTheDocument();
      expect(screen.getByText('categories.fixedExpenses')).toBeInTheDocument();
    });

    it('displays current amounts', () => {
      expect(screen.getByText('USD 450.00')).toBeInTheDocument(); // Food
      expect(screen.getByText('USD 120.00')).toBeInTheDocument(); // Dogs
      expect(screen.getByText('USD 1200.00')).toBeInTheDocument(); // Fixed Expenses
    });

    it('displays previous amounts', () => {
      expect(screen.getByText('USD 400.00')).toBeInTheDocument(); // Food previous
      expect(screen.getByText('USD 150.00')).toBeInTheDocument(); // Dogs previous
    });

    it('displays percentage changes', () => {
      // Food: 450 vs 400 = +12.5%
      expect(screen.getByText('+13%')).toBeInTheDocument();

      // Dogs: 120 vs 150 = -20%
      expect(screen.getByText('-20%')).toBeInTheDocument();

      // Fixed Expenses: 1200 vs 1200 = 0%
      expect(screen.getByText('—')).toBeInTheDocument();
    });
  });

  describe('income comparison table', () => {
    beforeEach(() => {
      render(<PeriodComparisonSection {...defaultProps} />);
      const header = screen.getByText('Period Comparison').closest('button');
      fireEvent.click(header);
    });

    it('shows all income categories with earnings', () => {
      expect(screen.getByText('categories.salary')).toBeInTheDocument();
      expect(screen.getByText('categories.investments')).toBeInTheDocument();
    });

    it('displays current income amounts', () => {
      expect(screen.getByText('USD 3000.00')).toBeInTheDocument(); // Salary
      expect(screen.getByText('USD 100.00')).toBeInTheDocument(); // Investments
    });

    it('displays previous income amounts', () => {
      expect(screen.getByText('USD 80.00')).toBeInTheDocument(); // Investments previous
    });
  });

  describe('key insights', () => {
    it('displays insights for significant changes', () => {
      render(<PeriodComparisonSection {...defaultProps} />);
      const header = screen.getByText('Period Comparison').closest('button');
      fireEvent.click(header);

      expect(screen.getByText('Key Insights')).toBeInTheDocument();

      // Should show insights generated by mocked generateInsights
      const insightsSection = screen.getByText('Key Insights').parentElement;
      expect(insightsSection).toBeInTheDocument();
    });

    it('shows "no significant changes" when no insights', () => {
      const stableData = {
        currentData: {
          incomeByCat: { Salary: 3000 },
          expenseByCat: { Food: 400 },
          totalIncome: 3000,
          totalExpenses: 400,
          net: 2600,
        },
        previousData: {
          incomeByCat: { Salary: 3000 },
          expenseByCat: { Food: 400 },
          totalIncome: 3000,
          totalExpenses: 400,
          net: 2600,
        },
        previousPeriodLabel: 'Dec 1-31, 2025',
        currency: 'USD',
      };

      render(<PeriodComparisonSection {...stableData} />);
      const header = screen.getByText('Period Comparison').closest('button');
      fireEvent.click(header);

      expect(screen.getByText('No significant changes')).toBeInTheDocument();
    });

    it('limits insights to top 5', () => {
      const manyChangesData = {
        currentData: {
          incomeByCat: {},
          expenseByCat: {
            Food: 450,
            Dogs: 120,
            'Fixed Expenses': 1200,
            Adventure: 500,
            Unexpected: 200,
            'Holidays & Birthdays': 150,
            'Rent/Mortgages': 1000,
          },
          totalIncome: 0,
          totalExpenses: 3620,
          net: -3620,
        },
        previousData: {
          incomeByCat: {},
          expenseByCat: {
            Food: 400,
            Dogs: 100,
            'Fixed Expenses': 1100,
            Adventure: 400,
            Unexpected: 150,
            'Holidays & Birthdays': 100,
            'Rent/Mortgages': 900,
          },
          totalIncome: 0,
          totalExpenses: 3150,
          net: -3150,
        },
        previousPeriodLabel: 'Dec 1-31, 2025',
        currency: 'USD',
      };

      render(<PeriodComparisonSection {...manyChangesData} />);
      const header = screen.getByText('Period Comparison').closest('button');
      fireEvent.click(header);

      const insights = screen.getByText('Key Insights').parentElement;
      const insightItems = insights.querySelectorAll('li');

      // Should only show 5 insights max
      expect(insightItems.length).toBeLessThanOrEqual(5);
    });
  });

  describe('new categories', () => {
    it('displays NEW for categories that did not exist previously', () => {
      const dataWithNewCategory = {
        currentData: {
          incomeByCat: { Salary: 3000 },
          expenseByCat: { Food: 450, Adventure: 300 },
          totalIncome: 3000,
          totalExpenses: 750,
          net: 2250,
        },
        previousData: {
          incomeByCat: { Salary: 3000 },
          expenseByCat: { Food: 400 },
          totalIncome: 3000,
          totalExpenses: 400,
          net: 2600,
        },
        previousPeriodLabel: 'Dec 1-31, 2025',
        currency: 'USD',
      };

      render(<PeriodComparisonSection {...dataWithNewCategory} />);
      const header = screen.getByText('Period Comparison').closest('button');
      fireEvent.click(header);

      expect(screen.getByText('NEW')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has aria-expanded attribute', () => {
      render(<PeriodComparisonSection {...defaultProps} />);

      const header = screen.getByText('Period Comparison').closest('button');
      expect(header).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(header);
      expect(header).toHaveAttribute('aria-expanded', 'true');
    });

    it('shows chevron icons for expand/collapse state', () => {
      const { container } = render(
        <PeriodComparisonSection {...defaultProps} />
      );

      // Should show ChevronDown when collapsed
      let chevronDown = container.querySelector(
        '[class*="lucide-chevron-down"]'
      );
      expect(chevronDown).toBeInTheDocument();

      // Click to expand
      const header = screen.getByText('Period Comparison').closest('button');
      fireEvent.click(header);

      // Should show ChevronUp when expanded
      let chevronUp = container.querySelector('[class*="lucide-chevron-up"]');
      expect(chevronUp).toBeInTheDocument();
    });
  });

  describe('mobile responsiveness', () => {
    it('uses grid layout for comparison rows', () => {
      render(<PeriodComparisonSection {...defaultProps} />);
      const header = screen.getByText('Period Comparison').closest('button');
      fireEvent.click(header);

      // Check that comparison rows use grid layout
      const rows = screen.getByText('categories.food').closest('div');
      expect(rows).toHaveClass('grid');
    });
  });
});

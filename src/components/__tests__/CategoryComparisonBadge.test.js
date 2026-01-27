'use client';

import { render, screen } from '@testing-library/react';
import CategoryComparisonBadge from '../CategoryComparisonBadge';

describe('CategoryComparisonBadge', () => {
  describe('rendering logic', () => {
    it('does not render for insignificant changes (<5%)', () => {
      const { container } = render(
        <CategoryComparisonBadge
          current={102}
          previous={100}
          type="expense"
          currency="USD"
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('renders for significant increase (>5%)', () => {
      render(
        <CategoryComparisonBadge
          current={120}
          previous={100}
          type="expense"
          currency="USD"
        />
      );

      expect(screen.getByText('20%')).toBeInTheDocument();
    });

    it('renders for significant decrease (>5%)', () => {
      render(
        <CategoryComparisonBadge
          current={80}
          previous={100}
          type="expense"
          currency="USD"
        />
      );

      expect(screen.getByText('20%')).toBeInTheDocument();
    });

    it('renders NEW badge for new categories', () => {
      render(
        <CategoryComparisonBadge
          current={100}
          previous={0}
          type="expense"
          currency="USD"
        />
      );

      expect(screen.getByText('NEW')).toBeInTheDocument();
    });

    it('does not render for zero in both periods', () => {
      const { container } = render(
        <CategoryComparisonBadge
          current={0}
          previous={0}
          type="expense"
          currency="USD"
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('percentage display', () => {
    it('shows absolute value of percentage (no minus sign)', () => {
      render(
        <CategoryComparisonBadge
          current={80}
          previous={100}
          type="expense"
          currency="USD"
        />
      );

      expect(screen.getByText('20%')).toBeInTheDocument();
      expect(screen.queryByText('-20%')).not.toBeInTheDocument();
    });

    it('handles 100% decrease correctly', () => {
      render(
        <CategoryComparisonBadge
          current={0}
          previous={100}
          type="expense"
          currency="USD"
        />
      );

      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('rounds to nearest integer', () => {
      render(
        <CategoryComparisonBadge
          current={115}
          previous={100}
          type="expense"
          currency="USD"
        />
      );

      expect(screen.getByText('15%')).toBeInTheDocument();
    });

    it('displays large increases correctly', () => {
      render(
        <CategoryComparisonBadge
          current={250}
          previous={100}
          type="expense"
          currency="USD"
        />
      );

      expect(screen.getByText('150%')).toBeInTheDocument();
    });
  });

  describe('custom threshold', () => {
    it('respects custom threshold - does not render below threshold', () => {
      const { container } = render(
        <CategoryComparisonBadge
          current={107}
          previous={100}
          type="expense"
          threshold={10}
          currency="USD"
        />
      );

      // 7% change is below 10% threshold
      expect(container.firstChild).toBeNull();
    });

    it('respects custom threshold - renders when at threshold', () => {
      render(
        <CategoryComparisonBadge
          current={110}
          previous={100}
          type="expense"
          threshold={10}
          currency="USD"
        />
      );

      expect(screen.getByText('10%')).toBeInTheDocument();
    });

    it('respects custom threshold - renders when above threshold', () => {
      render(
        <CategoryComparisonBadge
          current={115}
          previous={100}
          type="expense"
          threshold={10}
          currency="USD"
        />
      );

      expect(screen.getByText('15%')).toBeInTheDocument();
    });
  });

  describe('icon presence', () => {
    it('renders an icon for increases', () => {
      const { container } = render(
        <CategoryComparisonBadge
          current={120}
          previous={100}
          type="expense"
          currency="USD"
        />
      );

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('renders an icon for decreases', () => {
      const { container } = render(
        <CategoryComparisonBadge
          current={80}
          previous={100}
          type="expense"
          currency="USD"
        />
      );

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('does not render an icon for NEW badges', () => {
      const { container } = render(
        <CategoryComparisonBadge
          current={100}
          previous={0}
          type="expense"
          currency="USD"
        />
      );

      const newBadge = screen.getByText('NEW');
      expect(newBadge).toBeInTheDocument();

      // NEW badge should not have an icon
      const icon = newBadge.parentElement.querySelector('svg');
      expect(icon).not.toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('handles very small amounts', () => {
      render(
        <CategoryComparisonBadge
          current={1.06}
          previous={1}
          type="expense"
          currency="USD"
        />
      );

      expect(screen.getByText('6%')).toBeInTheDocument();
    });

    it('handles very large amounts', () => {
      render(
        <CategoryComparisonBadge
          current={12000}
          previous={10000}
          type="income"
          currency="USD"
        />
      );

      expect(screen.getByText('20%')).toBeInTheDocument();
    });

    it('handles decimal percentages correctly', () => {
      render(
        <CategoryComparisonBadge
          current={106.66}
          previous={100}
          type="expense"
          currency="USD"
        />
      );

      // Should round to 7%
      expect(screen.getByText('7%')).toBeInTheDocument();
    });
  });
});

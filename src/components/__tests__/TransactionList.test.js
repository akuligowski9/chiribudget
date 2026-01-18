'use client';

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TransactionList from '../TransactionList';

// Mock useDemo hook
jest.mock('@/hooks/useDemo', () => ({
  useDemo: () => ({ isDemoMode: true }),
}));

// Mock supabase client
jest.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(() => Promise.resolve({ data: { user: null } })),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          maybeSingle: jest.fn(() => Promise.resolve({ data: null })),
        })),
      })),
    })),
  },
}));

let mockTransactions = [];

jest.mock('@/lib/demoStore', () => ({
  getDemoTransactions: jest.fn(() => mockTransactions),
}));

describe('TransactionList', () => {
  const defaultProps = {
    startDate: '2026-01-01',
    endDate: '2026-01-31',
    currency: 'USD',
    onTransactionUpdate: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockTransactions = [
      {
        id: 'tx-1',
        txn_date: '2026-01-15',
        description: 'Groceries',
        amount: -50,
        currency: 'USD',
        category: 'Food',
        payer: 'together',
        is_flagged: false,
      },
      {
        id: 'tx-2',
        txn_date: '2026-01-16',
        description: 'Paycheck',
        amount: 3000,
        currency: 'USD',
        category: 'Salary',
        payer: 'alex',
        is_flagged: true,
        flag_reason: 'over_threshold_income',
      },
      {
        id: 'tx-3',
        txn_date: '2026-01-10',
        description: 'Gas',
        amount: -45,
        currency: 'USD',
        category: 'Fixed Expenses',
        payer: 'alex',
        is_flagged: false,
      },
    ];
  });

  it('renders transactions title', async () => {
    render(<TransactionList {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Transactions')).toBeInTheDocument();
    });
  });

  it('displays transaction descriptions', async () => {
    render(<TransactionList {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Groceries')).toBeInTheDocument();
      expect(screen.getByText('Paycheck')).toBeInTheDocument();
      expect(screen.getByText('Gas')).toBeInTheDocument();
    });
  });

  it('shows summary totals', async () => {
    render(<TransactionList {...defaultProps} />);

    await waitFor(() => {
      // Should show transaction count
      expect(screen.getByText('3 transactions')).toBeInTheDocument();
    });
  });

  describe('Search functionality', () => {
    it('renders search input', async () => {
      render(<TransactionList {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
      });
    });

    it('filters transactions by search query', async () => {
      const user = userEvent.setup();
      render(<TransactionList {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Groceries')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search...');
      await user.type(searchInput, 'Groceries');

      await waitFor(() => {
        expect(screen.getByText('Groceries')).toBeInTheDocument();
        expect(screen.queryByText('Paycheck')).not.toBeInTheDocument();
        expect(screen.queryByText('Gas')).not.toBeInTheDocument();
      });
    });
  });

  describe('Sort functionality', () => {
    it('renders sort buttons', async () => {
      render(<TransactionList {...defaultProps} />);

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /Date/i })
        ).toBeInTheDocument();
        expect(
          screen.getByRole('button', { name: /Amount/i })
        ).toBeInTheDocument();
      });
    });

    it('toggles sort direction when clicking date button', async () => {
      const user = userEvent.setup();
      render(<TransactionList {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Transactions')).toBeInTheDocument();
      });

      const dateButton = screen.getByRole('button', { name: /Date/i });

      // Default is descending (arrow down)
      expect(dateButton).toHaveTextContent('↓');

      await user.click(dateButton);

      // After click should be ascending
      await waitFor(() => {
        expect(dateButton).toHaveTextContent('↑');
      });
    });
  });

  describe('ConfirmDialog interaction', () => {
    it('opens confirm dialog when delete button is clicked', async () => {
      const user = userEvent.setup();
      render(<TransactionList {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Groceries')).toBeInTheDocument();
      });

      // Find and click the delete button (trash icon)
      const deleteButtons = screen
        .getAllByRole('button')
        .filter((btn) => btn.querySelector('svg.lucide-trash-2'));
      expect(deleteButtons.length).toBeGreaterThan(0);

      await user.click(deleteButtons[0]);

      // Confirm dialog should appear
      await waitFor(() => {
        expect(screen.getByText('Delete Transaction')).toBeInTheDocument();
        expect(
          screen.getByText(/Are you sure you want to delete/)
        ).toBeInTheDocument();
      });
    });

    it('closes confirm dialog when cancel is clicked', async () => {
      const user = userEvent.setup();
      render(<TransactionList {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Groceries')).toBeInTheDocument();
      });

      // Open dialog
      const deleteButtons = screen
        .getAllByRole('button')
        .filter((btn) => btn.querySelector('svg.lucide-trash-2'));
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Delete Transaction')).toBeInTheDocument();
      });

      // Click cancel
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);

      // Dialog should close
      await waitFor(() => {
        expect(
          screen.queryByText('Delete Transaction')
        ).not.toBeInTheDocument();
      });
    });

    it('deletes transaction when confirm is clicked', async () => {
      const user = userEvent.setup();
      const onUpdate = jest.fn();
      render(
        <TransactionList {...defaultProps} onTransactionUpdate={onUpdate} />
      );

      await waitFor(() => {
        expect(screen.getByText('Groceries')).toBeInTheDocument();
      });

      // Open dialog
      const deleteButtons = screen
        .getAllByRole('button')
        .filter((btn) => btn.querySelector('svg.lucide-trash-2'));
      await user.click(deleteButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Delete Transaction')).toBeInTheDocument();
      });

      // Click delete
      const confirmButton = screen.getByRole('button', { name: 'Delete' });
      await user.click(confirmButton);

      // Dialog should close and callback should be called
      await waitFor(() => {
        expect(
          screen.queryByText('Delete Transaction')
        ).not.toBeInTheDocument();
        expect(onUpdate).toHaveBeenCalled();
      });
    });
  });

  describe('Flag toggle', () => {
    it('renders flag buttons for each transaction', async () => {
      render(<TransactionList {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Groceries')).toBeInTheDocument();
      });

      // Should have flag buttons (one per transaction)
      const flagButtons = screen
        .getAllByRole('button')
        .filter((btn) => btn.querySelector('svg.lucide-flag'));
      expect(flagButtons.length).toBe(3);
    });

    it('updates flag when clicked', async () => {
      const user = userEvent.setup();
      const onUpdate = jest.fn();
      render(
        <TransactionList {...defaultProps} onTransactionUpdate={onUpdate} />
      );

      await waitFor(() => {
        expect(screen.getByText('Groceries')).toBeInTheDocument();
      });

      const flagButtons = screen
        .getAllByRole('button')
        .filter((btn) => btn.querySelector('svg.lucide-flag'));

      await user.click(flagButtons[0]);

      await waitFor(() => {
        expect(onUpdate).toHaveBeenCalled();
      });
    });
  });

  describe('Editing', () => {
    it('allows editing description on click', async () => {
      const user = userEvent.setup();
      render(<TransactionList {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Groceries')).toBeInTheDocument();
      });

      // Click on description to edit
      const descButton = screen.getByRole('button', { name: 'Groceries' });
      await user.click(descButton);

      // Should show input field
      await waitFor(() => {
        const input = screen.getByDisplayValue('Groceries');
        expect(input).toBeInTheDocument();
        expect(input.tagName).toBe('INPUT');
      });
    });
  });

  describe('Empty state', () => {
    it('shows empty message when no transactions', async () => {
      mockTransactions = [];

      render(<TransactionList {...defaultProps} />);

      await waitFor(() => {
        expect(
          screen.getByText('No transactions for this period.')
        ).toBeInTheDocument();
      });
    });
  });
});

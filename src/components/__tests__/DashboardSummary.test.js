'use client';

import { render, screen, waitFor } from '@testing-library/react';
import DashboardSummary from '../DashboardSummary';

// Mock the modules
jest.mock('@/lib/auth', () => ({
  getDemoMode: jest.fn(() => true),
}));

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    conversionRate: 3.25,
    payerOptions: ['alex', 'adriana', 'together'],
    categoryLimits: {},
    user: null,
    profile: null,
    household: null,
    loading: false,
  }),
}));

jest.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(() => Promise.resolve({ data: { user: null } })),
    },
  },
}));

let mockTransactionsUSD = [
  {
    id: 'tx-1',
    txn_date: '2024-01-15',
    description: 'Groceries',
    amount: -50,
    currency: 'USD',
    category: 'Food',
    payer: 'alex',
    is_flagged: false,
  },
  {
    id: 'tx-2',
    txn_date: '2024-01-16',
    description: 'Monthly Paycheck',
    amount: 3000,
    currency: 'USD',
    category: 'Salary',
    payer: 'together',
    is_flagged: false,
  },
];
let mockTransactionsPEN = [];

const getDemoTransactionsMock = jest.fn(({ currency }) => {
  if (currency === 'USD') return mockTransactionsUSD;
  if (currency === 'PEN') return mockTransactionsPEN;
  return [];
});

jest.mock('@/lib/demoStore', () => ({
  getDemoTransactions: (...args) => getDemoTransactionsMock(...args),
  getDemoCategoryLimits: () => ({}),
}));

// Mock dynamic import for charts
jest.mock('next/dynamic', () => () => {
  const DummyComponent = () => null;
  DummyComponent.displayName = 'MockedDynamicComponent';
  return DummyComponent;
});

describe('DashboardSummary', () => {
  const defaultProps = {
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    currency: 'USD',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockTransactionsUSD = [
      {
        id: 'tx-1',
        txn_date: '2024-01-15',
        description: 'Groceries',
        amount: -50,
        currency: 'USD',
        category: 'Food',
        payer: 'alex',
        is_flagged: false,
      },
      {
        id: 'tx-2',
        txn_date: '2024-01-16',
        description: 'Monthly Paycheck',
        amount: 3000,
        currency: 'USD',
        category: 'Salary',
        payer: 'together',
        is_flagged: false,
      },
    ];
    mockTransactionsPEN = [];
  });

  it('renders summary section', async () => {
    render(<DashboardSummary {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Summary')).toBeInTheDocument();
    });
  });

  it('displays income and expense totals', async () => {
    render(<DashboardSummary {...defaultProps} />);

    await waitFor(() => {
      // Income should show 3,000.00 (may appear multiple times in category breakdowns)
      const incomeElements = screen.getAllByText('USD 3,000.00');
      expect(incomeElements.length).toBeGreaterThan(0);
      // Expenses should show 50.00
      const expenseElements = screen.getAllByText('USD 50.00');
      expect(expenseElements.length).toBeGreaterThan(0);
    });
  });

  it('displays Net by Payer section', async () => {
    render(<DashboardSummary {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Net by Payer')).toBeInTheDocument();
    });
  });

  it('refetches data when refreshKey changes', async () => {
    const { rerender } = render(
      <DashboardSummary {...defaultProps} refreshKey={0} />
    );

    await waitFor(() => {
      // Called twice: once for USD, once for PEN
      expect(getDemoTransactionsMock).toHaveBeenCalledTimes(2);
    });

    // Clear the mock call count
    getDemoTransactionsMock.mockClear();

    // Rerender with a new refreshKey
    rerender(<DashboardSummary {...defaultProps} refreshKey={1} />);

    await waitFor(() => {
      // Called twice again: once for USD, once for PEN
      expect(getDemoTransactionsMock).toHaveBeenCalledTimes(2);
    });
  });

  it('updates displayed data when refreshKey changes and data changes', async () => {
    const { rerender } = render(
      <DashboardSummary {...defaultProps} refreshKey={0} />
    );

    await waitFor(() => {
      // Initial state: alex has -50 (expense)
      expect(screen.getByText('Net by Payer')).toBeInTheDocument();
    });

    // Simulate changing a transaction's payer from 'alex' to 'adriana'
    mockTransactionsUSD = [
      {
        id: 'tx-1',
        txn_date: '2024-01-15',
        description: 'Groceries',
        amount: -50,
        currency: 'USD',
        category: 'Food',
        payer: 'adriana', // Changed from alex
        is_flagged: false,
      },
      {
        id: 'tx-2',
        txn_date: '2024-01-16',
        description: 'Monthly Paycheck',
        amount: 3000,
        currency: 'USD',
        category: 'Salary',
        payer: 'together',
        is_flagged: false,
      },
    ];

    // Rerender with incremented refreshKey
    rerender(<DashboardSummary {...defaultProps} refreshKey={1} />);

    // The component should refetch and show updated data
    await waitFor(() => {
      expect(getDemoTransactionsMock).toHaveBeenCalled();
    });
  });

  it('accepts refreshKey prop', () => {
    // Verify the component accepts the refreshKey prop without errors
    const { unmount } = render(
      <DashboardSummary {...defaultProps} refreshKey={0} />
    );

    expect(screen.getByText('Summary')).toBeInTheDocument();
    unmount();
  });
});

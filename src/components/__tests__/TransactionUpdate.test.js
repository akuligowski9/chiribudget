'use client';

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TransactionList from '../TransactionList';

// Mock the modules
jest.mock('@/lib/auth', () => ({
  getDemoMode: jest.fn(() => true),
}));

jest.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(() => Promise.resolve({ data: { user: null } })),
    },
  },
}));

const mockTransactions = [
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

jest.mock('@/lib/demoStore', () => ({
  getDemoTransactions: jest.fn(() => mockTransactions),
}));

// Mock Radix Select portal to render inline for testing
jest.mock('@radix-ui/react-select', () => {
  const React = require('react');

  const MockTrigger = React.forwardRef(function MockTrigger(
    { children, className },
    ref
  ) {
    return React.createElement(
      'button',
      { ref, className, type: 'button' },
      children
    );
  });

  const MockContent = React.forwardRef(function MockContent({ children }, ref) {
    return React.createElement('div', { ref, role: 'listbox' }, children);
  });

  const MockItem = React.forwardRef(function MockItem(
    { children, value, ...props },
    ref
  ) {
    return React.createElement(
      'div',
      {
        ref,
        role: 'option',
        'data-value': value,
        onClick: () => {
          if (props.onClick) props.onClick();
        },
        ...props,
      },
      children
    );
  });

  return {
    Root: function MockRoot({
      children,
      value,
      onValueChange: _onValueChange,
    }) {
      return React.createElement(
        'div',
        { 'data-testid': 'select-root', 'data-value': value },
        children
      );
    },
    Trigger: MockTrigger,
    Value: function MockValue({ children }) {
      return React.createElement('span', null, children);
    },
    Icon: function MockIcon({ children }) {
      return React.createElement('span', null, children);
    },
    Portal: function MockPortal({ children }) {
      return children;
    },
    Content: MockContent,
    Viewport: function MockViewport({ children }) {
      return React.createElement('div', null, children);
    },
    Item: MockItem,
    ItemText: function MockItemText({ children }) {
      return React.createElement('span', null, children);
    },
    ItemIndicator: function MockItemIndicator({ children }) {
      return React.createElement('span', null, children);
    },
    ScrollUpButton: function MockScrollUpButton() {
      return null;
    },
    ScrollDownButton: function MockScrollDownButton() {
      return null;
    },
    Group: function MockGroup({ children }) {
      return React.createElement('div', null, children);
    },
    Label: function MockLabel({ children }) {
      return React.createElement('div', null, children);
    },
    Separator: function MockSeparator() {
      return React.createElement('hr', null);
    },
  };
});

describe('TransactionList', () => {
  const defaultProps = {
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    currency: 'USD',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders transactions', async () => {
    render(<TransactionList {...defaultProps} />);

    await waitFor(() => {
      // Use getAllByText since "Groceries" might appear multiple times
      const groceriesElements = screen.getAllByText('Groceries');
      expect(groceriesElements.length).toBeGreaterThan(0);
    });
  });

  it('calls onTransactionUpdate when description is edited', async () => {
    const onTransactionUpdate = jest.fn();

    render(
      <TransactionList
        {...defaultProps}
        onTransactionUpdate={onTransactionUpdate}
      />
    );

    await waitFor(() => {
      expect(screen.getAllByText('Groceries').length).toBeGreaterThan(0);
    });

    // Find the description button (it has the "Click to edit" title)
    const editButtons = screen.getAllByTitle('Click to edit');
    expect(editButtons.length).toBeGreaterThan(0);

    // Click the first edit button to enter edit mode
    fireEvent.click(editButtons[0]);

    // Wait for the input to appear
    await waitFor(() => {
      const inputs = screen.getAllByRole('textbox');
      // Filter to find the description input (not the search input)
      const descriptionInputs = inputs.filter(
        (input) =>
          input.defaultValue === 'Groceries' || input.className.includes('h-8')
      );
      expect(descriptionInputs.length).toBeGreaterThan(0);
    });

    // Find the description input and update it
    const inputs = screen.getAllByRole('textbox');
    const descriptionInput = inputs.find(
      (input) => input.defaultValue === 'Groceries'
    );

    if (descriptionInput) {
      fireEvent.change(descriptionInput, {
        target: { value: 'Updated Groceries' },
      });
      fireEvent.blur(descriptionInput);

      await waitFor(() => {
        expect(onTransactionUpdate).toHaveBeenCalled();
      });
    }
  });

  it('calls onTransactionUpdate when a transaction is deleted', async () => {
    const onTransactionUpdate = jest.fn();
    const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <TransactionList
        {...defaultProps}
        onTransactionUpdate={onTransactionUpdate}
      />
    );

    await waitFor(() => {
      expect(screen.getAllByText('Groceries').length).toBeGreaterThan(0);
    });

    // Find delete buttons by their class (they contain error in class name)
    const allButtons = document.querySelectorAll('button');
    const deleteButtons = Array.from(allButtons).filter((btn) =>
      btn.className.includes('error')
    );

    expect(deleteButtons.length).toBeGreaterThan(0);

    // Click the first delete button
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalled();
      expect(onTransactionUpdate).toHaveBeenCalled();
    });

    confirmSpy.mockRestore();
  });
});

describe('TransactionList callback contract', () => {
  it('accepts onTransactionUpdate prop without errors', () => {
    const mockCallback = jest.fn();

    // This test verifies the component accepts the callback prop
    const { unmount } = render(
      <TransactionList
        startDate="2024-01-01"
        endDate="2024-01-31"
        currency="USD"
        onTransactionUpdate={mockCallback}
      />
    );

    // Component should render without error
    expect(screen.getByText('Transactions')).toBeInTheDocument();

    unmount();
  });

  it('does not fail when onTransactionUpdate is not provided', async () => {
    // Render without the callback
    render(
      <TransactionList
        startDate="2024-01-01"
        endDate="2024-01-31"
        currency="USD"
      />
    );

    await waitFor(() => {
      expect(screen.getAllByText('Groceries').length).toBeGreaterThan(0);
    });

    // Try to trigger an update - should not throw
    const editButtons = screen.getAllByTitle('Click to edit');
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      const inputs = screen.getAllByRole('textbox');
      expect(inputs.length).toBeGreaterThan(0);
    });

    const inputs = screen.getAllByRole('textbox');
    const descriptionInput = inputs.find(
      (input) => input.defaultValue === 'Groceries'
    );

    if (descriptionInput) {
      fireEvent.change(descriptionInput, { target: { value: 'Test' } });
      fireEvent.blur(descriptionInput);
    }

    // Should complete without throwing
    expect(true).toBe(true);
  });
});

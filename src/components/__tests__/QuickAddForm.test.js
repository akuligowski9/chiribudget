'use client';

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuickAddForm from '../QuickAddForm';

// Mock useDemo hook
jest.mock('@/hooks/useDemo', () => ({
  useDemo: () => ({ isDemoMode: true }),
}));

// Mock useAuth hook
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id' },
    profile: { household_id: 'test-household', default_currency: 'USD' },
  }),
}));

// Mock supabase client
jest.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn(() => Promise.resolve({ error: null })),
    })),
  },
}));

// Mock Radix Select to render inline for testing
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
      { ref, role: 'option', 'data-value': value, ...props },
      children
    );
  });

  return {
    Root: function MockRoot({ children }) {
      return React.createElement(
        'div',
        { 'data-testid': 'select-root' },
        children
      );
    },
    Trigger: MockTrigger,
    Value: function MockValue({ children, placeholder }) {
      return React.createElement('span', null, children || placeholder);
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

// Helper to get form elements
function getDateInput() {
  return screen.getByDisplayValue(new Date().toISOString().slice(0, 10));
}

function getAmountInput() {
  return screen.getByPlaceholderText('e.g. 75.20');
}

function getDescriptionInput() {
  // Find by the maxLength attribute or nearby text
  const inputs = screen.getAllByRole('textbox');
  return inputs.find((input) => input.getAttribute('maxLength'));
}

function getSubmitButton() {
  return screen.getByRole('button', { name: 'Save Transaction' });
}

describe('QuickAddForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the form with all fields', () => {
    render(<QuickAddForm />);

    expect(screen.getByText('Date')).toBeInTheDocument();
    expect(screen.getByText('Currency')).toBeInTheDocument();
    expect(screen.getByText('Amount')).toBeInTheDocument();
    expect(screen.getByText(/Description/)).toBeInTheDocument();
    expect(getSubmitButton()).toBeInTheDocument();
  });

  describe('Date validation', () => {
    it('shows error for future date', async () => {
      const user = userEvent.setup();
      render(<QuickAddForm />);

      const dateInput = getDateInput();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      const futureDateStr = futureDate.toISOString().slice(0, 10);

      await user.clear(dateInput);
      await user.type(dateInput, futureDateStr);

      await waitFor(() => {
        expect(
          screen.getByText('Date cannot be in the future')
        ).toBeInTheDocument();
      });
    });

    it('accepts today date', async () => {
      const user = userEvent.setup();
      render(<QuickAddForm />);

      const dateInput = getDateInput();
      const today = new Date().toISOString().slice(0, 10);

      await user.clear(dateInput);
      await user.type(dateInput, today);

      await waitFor(() => {
        expect(
          screen.queryByText('Date cannot be in the future')
        ).not.toBeInTheDocument();
      });
    });

    it('accepts past date', async () => {
      const user = userEvent.setup();
      render(<QuickAddForm />);

      const dateInput = getDateInput();

      await user.clear(dateInput);
      await user.type(dateInput, '2025-01-15');

      await waitFor(() => {
        expect(
          screen.queryByText('Date cannot be in the future')
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('Amount validation', () => {
    it('shows error when amount is empty on submit', async () => {
      const user = userEvent.setup();
      render(<QuickAddForm />);

      await user.click(getSubmitButton());

      await waitFor(() => {
        expect(screen.getByText('Amount is required')).toBeInTheDocument();
      });
    });

    it('shows error for non-numeric amount', async () => {
      const user = userEvent.setup();
      render(<QuickAddForm />);

      await user.type(getAmountInput(), 'abc');

      await waitFor(() => {
        expect(screen.getByText('Enter a valid number')).toBeInTheDocument();
      });
    });

    it('shows error for zero amount', async () => {
      const user = userEvent.setup();
      render(<QuickAddForm />);

      await user.type(getAmountInput(), '0');

      await waitFor(() => {
        expect(
          screen.getByText('Amount must be greater than 0')
        ).toBeInTheDocument();
      });
    });

    it('shows error for negative amount', async () => {
      const user = userEvent.setup();
      render(<QuickAddForm />);

      await user.type(getAmountInput(), '-50');

      await waitFor(() => {
        expect(
          screen.getByText('Amount must be greater than 0')
        ).toBeInTheDocument();
      });
    });

    it('shows error when amount exceeds USD max', async () => {
      const user = userEvent.setup();
      render(<QuickAddForm />);

      await user.type(getAmountInput(), '60000');

      await waitFor(() => {
        expect(
          screen.getByText('Amount cannot exceed USD 50,000')
        ).toBeInTheDocument();
      });
    });

    it('accepts valid amount', async () => {
      const user = userEvent.setup();
      render(<QuickAddForm />);

      await user.type(getAmountInput(), '125.50');

      await waitFor(() => {
        expect(
          screen.queryByText('Amount is required')
        ).not.toBeInTheDocument();
        expect(
          screen.queryByText('Enter a valid number')
        ).not.toBeInTheDocument();
        expect(
          screen.queryByText('Amount must be greater than 0')
        ).not.toBeInTheDocument();
      });
    });

    it('accepts decimal amounts', async () => {
      const user = userEvent.setup();
      render(<QuickAddForm />);

      await user.type(getAmountInput(), '99.99');

      await waitFor(() => {
        expect(
          screen.queryByText('Enter a valid number')
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('Description validation', () => {
    it('shows error when description exceeds max length', async () => {
      const user = userEvent.setup();
      render(<QuickAddForm />);

      const descInput = getDescriptionInput();
      const longDescription = 'a'.repeat(201);

      await user.type(descInput, longDescription);

      await waitFor(() => {
        expect(
          screen.getByText('Description cannot exceed 200 characters')
        ).toBeInTheDocument();
      });
    });

    it('shows character count', () => {
      render(<QuickAddForm />);

      expect(screen.getByText('0/200')).toBeInTheDocument();
    });

    it('updates character count as user types', async () => {
      const user = userEvent.setup();
      render(<QuickAddForm />);

      const descInput = getDescriptionInput();
      await user.type(descInput, 'Groceries');

      await waitFor(() => {
        expect(screen.getByText('9/200')).toBeInTheDocument();
      });
    });

    it('accepts description at max length', async () => {
      const user = userEvent.setup();
      render(<QuickAddForm />);

      const descInput = getDescriptionInput();
      const maxDescription = 'a'.repeat(200);

      await user.type(descInput, maxDescription);

      await waitFor(() => {
        expect(
          screen.queryByText('Description cannot exceed 200 characters')
        ).not.toBeInTheDocument();
        expect(screen.getByText('200/200')).toBeInTheDocument();
      });
    });

    it('allows empty description', async () => {
      const user = userEvent.setup();
      render(<QuickAddForm />);

      // Fill required field
      await user.type(getAmountInput(), '50');

      // Submit without description
      await user.click(getSubmitButton());

      await waitFor(() => {
        // Should show success, not description error
        expect(
          screen.queryByText('Description cannot exceed 200 characters')
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('Form submission', () => {
    it('shows error toast when validation fails', async () => {
      const user = userEvent.setup();
      render(<QuickAddForm />);

      // Submit without filling required fields
      await user.click(getSubmitButton());

      await waitFor(() => {
        expect(screen.getByText('Please fix errors')).toBeInTheDocument();
      });
    });

    it('calls onSuccess callback after successful submission in demo mode', async () => {
      const user = userEvent.setup();
      const onSuccess = jest.fn();
      render(<QuickAddForm onSuccess={onSuccess} />);

      // Fill valid data
      await user.type(getAmountInput(), '50');

      // Submit
      await user.click(getSubmitButton());

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalled();
        expect(screen.getByText('Saved (demo)')).toBeInTheDocument();
      });
    });

    it('clears form after successful submission', async () => {
      const user = userEvent.setup();
      render(<QuickAddForm />);

      // Fill form
      const amountInput = getAmountInput();
      const descInput = getDescriptionInput();

      await user.type(amountInput, '75.50');
      await user.type(descInput, 'Test transaction');

      // Submit
      await user.click(getSubmitButton());

      await waitFor(() => {
        expect(amountInput).toHaveValue('');
        expect(descInput).toHaveValue('');
      });
    });

    it('clears validation errors after successful submission', async () => {
      const user = userEvent.setup();
      render(<QuickAddForm />);

      // First, trigger a validation error
      await user.click(getSubmitButton());

      await waitFor(() => {
        expect(screen.getByText('Amount is required')).toBeInTheDocument();
      });

      // Now fill in valid data and submit
      await user.type(getAmountInput(), '100');
      await user.click(getSubmitButton());

      await waitFor(() => {
        expect(
          screen.queryByText('Amount is required')
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('Threshold display', () => {
    it('shows USD threshold by default', () => {
      render(<QuickAddForm />);

      expect(screen.getByText(/Threshold: USD 500/)).toBeInTheDocument();
    });

    it('shows max amount info', () => {
      render(<QuickAddForm />);

      expect(screen.getByText(/Max: USD 50,000/)).toBeInTheDocument();
    });
  });
});

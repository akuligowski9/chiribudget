-- Migration: Add recurring transactions support
-- CB-035: Recurring Transactions

-- Create recurrence frequency enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recurrence_freq_t') THEN
        CREATE TYPE recurrence_freq_t AS ENUM ('daily', 'weekly', 'biweekly', 'monthly', 'yearly');
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Recurring transaction definitions
CREATE TABLE IF NOT EXISTS recurring_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,

  -- Transaction template
  amount NUMERIC(12,2) NOT NULL,
  currency currency_t NOT NULL,
  category category_t NOT NULL,
  payer TEXT NOT NULL,
  description TEXT,

  -- Recurrence configuration
  frequency recurrence_freq_t NOT NULL DEFAULT 'monthly',
  start_date DATE NOT NULL,
  end_date DATE,  -- NULL = no end date
  day_of_month INTEGER,  -- For monthly: 1-31, NULL uses start_date day
  day_of_week INTEGER,   -- For weekly/biweekly: 0-6 (Sunday=0)

  -- Metadata
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE recurring_transactions IS 'Definitions for recurring transactions (rent, subscriptions, salary, etc.)';
COMMENT ON COLUMN recurring_transactions.frequency IS 'How often the transaction recurs: daily, weekly, biweekly, monthly, yearly';
COMMENT ON COLUMN recurring_transactions.day_of_month IS 'For monthly recurrence: day of month (1-31). NULL uses start_date day. Handles month-end edge cases.';
COMMENT ON COLUMN recurring_transactions.day_of_week IS 'For weekly/biweekly: day of week (0=Sunday, 6=Saturday)';

-- Exceptions for skipped occurrences
CREATE TABLE IF NOT EXISTS recurring_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_id UUID NOT NULL REFERENCES recurring_transactions(id) ON DELETE CASCADE,
  occurrence_date DATE NOT NULL,
  exception_type TEXT NOT NULL CHECK (exception_type IN ('skip')),
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (recurring_id, occurrence_date)
);

COMMENT ON TABLE recurring_exceptions IS 'Tracks skipped occurrences for recurring transactions';
COMMENT ON COLUMN recurring_exceptions.exception_type IS 'Type of exception: skip (do not generate this occurrence)';

-- Add source column to transactions table to track recurring-generated transactions
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS source TEXT;

ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS recurring_fingerprint TEXT;

COMMENT ON COLUMN transactions.source IS 'Origin of transaction: null (manual), recurring (auto-generated from recurring definition)';
COMMENT ON COLUMN transactions.recurring_fingerprint IS 'Unique fingerprint for recurring transactions: recurring_{recurringId}_{YYYY-MM-DD}';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_household
ON recurring_transactions(household_id);

CREATE INDEX IF NOT EXISTS idx_recurring_transactions_active
ON recurring_transactions(household_id, is_active)
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_recurring_exceptions_recurring
ON recurring_exceptions(recurring_id, occurrence_date);

CREATE INDEX IF NOT EXISTS idx_transactions_recurring_fingerprint
ON transactions(recurring_fingerprint)
WHERE recurring_fingerprint IS NOT NULL;

-- RLS Policies for recurring_transactions
ALTER TABLE recurring_transactions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'recurring_transactions_select') THEN
    CREATE POLICY recurring_transactions_select ON recurring_transactions
      FOR SELECT
      USING (
        household_id IN (
          SELECT household_id FROM profiles WHERE id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'recurring_transactions_insert') THEN
    CREATE POLICY recurring_transactions_insert ON recurring_transactions
      FOR INSERT
      WITH CHECK (
        household_id IN (
          SELECT household_id FROM profiles WHERE id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'recurring_transactions_update') THEN
    CREATE POLICY recurring_transactions_update ON recurring_transactions
      FOR UPDATE
      USING (
        household_id IN (
          SELECT household_id FROM profiles WHERE id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'recurring_transactions_delete') THEN
    CREATE POLICY recurring_transactions_delete ON recurring_transactions
      FOR DELETE
      USING (
        household_id IN (
          SELECT household_id FROM profiles WHERE id = auth.uid()
        )
      );
  END IF;
END $$;

-- RLS Policies for recurring_exceptions
ALTER TABLE recurring_exceptions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'recurring_exceptions_select') THEN
    CREATE POLICY recurring_exceptions_select ON recurring_exceptions
      FOR SELECT
      USING (
        recurring_id IN (
          SELECT id FROM recurring_transactions WHERE household_id IN (
            SELECT household_id FROM profiles WHERE id = auth.uid()
          )
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'recurring_exceptions_insert') THEN
    CREATE POLICY recurring_exceptions_insert ON recurring_exceptions
      FOR INSERT
      WITH CHECK (
        recurring_id IN (
          SELECT id FROM recurring_transactions WHERE household_id IN (
            SELECT household_id FROM profiles WHERE id = auth.uid()
          )
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'recurring_exceptions_update') THEN
    CREATE POLICY recurring_exceptions_update ON recurring_exceptions
      FOR UPDATE
      USING (
        recurring_id IN (
          SELECT id FROM recurring_transactions WHERE household_id IN (
            SELECT household_id FROM profiles WHERE id = auth.uid()
          )
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'recurring_exceptions_delete') THEN
    CREATE POLICY recurring_exceptions_delete ON recurring_exceptions
      FOR DELETE
      USING (
        recurring_id IN (
          SELECT id FROM recurring_transactions WHERE household_id IN (
            SELECT household_id FROM profiles WHERE id = auth.uid()
          )
        )
      );
  END IF;
END $$;

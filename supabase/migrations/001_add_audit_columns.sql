-- Migration: Add audit columns to transactions table
-- CB-020: Add updated_by and updated_at for tracking who edited transactions

-- Add the new columns (idempotent with IF NOT EXISTS simulation)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'updated_by'
  ) THEN
    ALTER TABLE transactions ADD COLUMN updated_by uuid;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE transactions ADD COLUMN updated_at timestamptz;
  END IF;
END $$;

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION set_transaction_updated()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  new.updated_at := now();
  new.updated_by := auth.uid();
  RETURN new;
END;
$$;

-- Drop and recreate the trigger
DROP TRIGGER IF EXISTS trg_transaction_updated ON transactions;
CREATE TRIGGER trg_transaction_updated
BEFORE UPDATE ON transactions
FOR EACH ROW EXECUTE FUNCTION set_transaction_updated();

-- Add comments for documentation
COMMENT ON COLUMN transactions.updated_by IS 'User ID who last modified this transaction';
COMMENT ON COLUMN transactions.updated_at IS 'Timestamp of last modification';

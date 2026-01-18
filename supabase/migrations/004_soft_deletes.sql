-- Migration: Add soft deletes for transactions
-- CB-012: Soft Deletes

-- Add deleted_at column for soft deletes
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
ADD COLUMN IF NOT EXISTS deleted_by uuid;

-- Add index for efficient filtering of non-deleted rows
CREATE INDEX IF NOT EXISTS idx_txn_deleted_at ON transactions (deleted_at)
WHERE deleted_at IS NULL;

-- Update RLS policy to exclude soft-deleted transactions from normal reads
-- Users can still see their deleted items via explicit query
DROP POLICY IF EXISTS tx_read ON transactions;
CREATE POLICY tx_read ON transactions
FOR SELECT USING (
  is_household_member(household_id)
  AND (deleted_at IS NULL OR deleted_at > now() - interval '30 days')
);

-- Add comment for documentation
COMMENT ON COLUMN transactions.deleted_at IS 'Soft delete timestamp. NULL = active, non-NULL = deleted';
COMMENT ON COLUMN transactions.deleted_by IS 'User who deleted the transaction';

-- Function to soft delete a transaction
CREATE OR REPLACE FUNCTION soft_delete_transaction(p_transaction_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE transactions
  SET deleted_at = now(),
      deleted_by = auth.uid()
  WHERE id = p_transaction_id
    AND is_household_member(household_id)
    AND deleted_at IS NULL;

  RETURN FOUND;
END;
$$;

-- Function to restore a soft-deleted transaction
CREATE OR REPLACE FUNCTION restore_transaction(p_transaction_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE transactions
  SET deleted_at = NULL,
      deleted_by = NULL
  WHERE id = p_transaction_id
    AND is_household_member(household_id)
    AND deleted_at IS NOT NULL;

  RETURN FOUND;
END;
$$;

-- Function to permanently delete old soft-deleted transactions (cleanup job)
CREATE OR REPLACE FUNCTION purge_old_deleted_transactions(p_days_old int DEFAULT 30)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count int;
BEGIN
  DELETE FROM transactions
  WHERE deleted_at IS NOT NULL
    AND deleted_at < now() - (p_days_old || ' days')::interval;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION soft_delete_transaction(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION restore_transaction(uuid) TO authenticated;

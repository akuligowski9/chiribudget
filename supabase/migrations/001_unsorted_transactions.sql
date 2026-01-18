-- =========================
-- Migration: Unsorted Transactions Feature
-- =========================

-- Add transaction status enum
DO $$ BEGIN
  CREATE TYPE transaction_status_t AS ENUM ('pending', 'confirmed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add source bank enum (extendable for future banks)
DO $$ BEGIN
  CREATE TYPE source_bank_t AS ENUM ('interbank', 'bcp', 'bbva', 'scotiabank', 'pnc', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add source type enum
DO $$ BEGIN
  CREATE TYPE source_type_t AS ENUM ('screenshot', 'pdf', 'csv', 'manual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -------------------------
-- Enhance import_batches table
-- -------------------------

-- Source file URL (stored in Supabase Storage)
ALTER TABLE import_batches
ADD COLUMN IF NOT EXISTS source_file_url text;

-- Type of source document
ALTER TABLE import_batches
ADD COLUMN IF NOT EXISTS source_type source_type_t DEFAULT 'screenshot';

-- Which bank the statement is from
ALTER TABLE import_batches
ADD COLUMN IF NOT EXISTS source_bank source_bank_t DEFAULT 'other';

-- Default payer for transactions in this batch
ALTER TABLE import_batches
ADD COLUMN IF NOT EXISTS default_payer payer_t DEFAULT 'adriana';

-- Year for transactions (when not explicitly in dates)
ALTER TABLE import_batches
ADD COLUMN IF NOT EXISTS txn_year integer;

-- Date range extracted from the import
ALTER TABLE import_batches
ADD COLUMN IF NOT EXISTS date_range_start date;
ALTER TABLE import_batches
ADD COLUMN IF NOT EXISTS date_range_end date;

-- Display name for the import (for UI grouping)
ALTER TABLE import_batches
ADD COLUMN IF NOT EXISTS display_name text;

COMMENT ON COLUMN import_batches.source_file_url IS 'URL to source file in Supabase Storage';
COMMENT ON COLUMN import_batches.source_type IS 'Type of source: screenshot, pdf, csv, manual';
COMMENT ON COLUMN import_batches.source_bank IS 'Bank the statement is from';
COMMENT ON COLUMN import_batches.default_payer IS 'Default payer for transactions in this batch';
COMMENT ON COLUMN import_batches.txn_year IS 'Year for transactions when dates dont include year';
COMMENT ON COLUMN import_batches.date_range_start IS 'Earliest transaction date in batch';
COMMENT ON COLUMN import_batches.date_range_end IS 'Latest transaction date in batch';
COMMENT ON COLUMN import_batches.display_name IS 'Human-readable name for the import batch';

-- -------------------------
-- Add status to transactions
-- -------------------------

ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS status transaction_status_t DEFAULT 'confirmed';

-- Index for filtering pending transactions
CREATE INDEX IF NOT EXISTS idx_transactions_status
ON transactions (household_id, status)
WHERE status = 'pending';

COMMENT ON COLUMN transactions.status IS 'pending = needs categorization, confirmed = ready for dashboard';

-- -------------------------
-- Update import_status_t enum to include 'processing'
-- -------------------------

-- Add 'processing' status for when OCR is running
ALTER TYPE import_status_t ADD VALUE IF NOT EXISTS 'processing' BEFORE 'staged';

-- -------------------------
-- RLS policy for transactions to allow filtering by status
-- -------------------------

-- Already covered by existing tx_read policy, but ensure pending transactions are visible
-- (no changes needed - existing policies work for all statuses)

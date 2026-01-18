-- Migration: Remove unused 'rejected' value from import_status_t enum
-- CB-021: The 'rejected' value was never used in the application

-- PostgreSQL doesn't support removing enum values directly.
-- We need to create a new type, migrate the column, and drop the old type.

-- Step 1: Create the new enum type without 'rejected'
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'import_status_t_new') THEN
    CREATE TYPE import_status_t_new AS ENUM ('staged', 'confirmed');
  END IF;
END $$;

-- Step 2: Alter the column to use the new type
-- This will fail if any rows have 'rejected' status (which shouldn't exist)
ALTER TABLE import_batches
  ALTER COLUMN status TYPE import_status_t_new
  USING status::text::import_status_t_new;

-- Step 3: Drop the old type
DROP TYPE IF EXISTS import_status_t;

-- Step 4: Rename the new type to the original name
ALTER TYPE import_status_t_new RENAME TO import_status_t;

-- Add comment documenting the change
COMMENT ON TYPE import_status_t IS 'Import batch status: staged (pending confirmation) or confirmed (saved to transactions)';

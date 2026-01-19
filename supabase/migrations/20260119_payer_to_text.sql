-- Migration: Change payer columns from enum to text for dynamic household member names
-- This allows payer names to come from profiles.display_name instead of hardcoded values

-- Step 1: Alter transactions.payer to text
ALTER TABLE transactions
  ALTER COLUMN payer TYPE text;

-- Step 2: Alter import_batches.default_payer to text
ALTER TABLE import_batches
  ALTER COLUMN default_payer TYPE text,
  ALTER COLUMN default_payer SET DEFAULT NULL;

-- Step 3: Drop the old enum type (optional, but clean)
DROP TYPE IF EXISTS payer_t;

-- Note: Existing data with 'alex', 'adriana', 'together' values will remain as text
-- The app will now use display_name from profiles for payer options

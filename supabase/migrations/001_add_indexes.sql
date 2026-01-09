-- Performance indexes for common queries
-- Run this migration after initial schema setup

-- Index for dashboard and export queries (filter by household, currency, date range)
CREATE INDEX IF NOT EXISTS idx_transactions_household_currency_date
ON transactions (household_id, currency, txn_date);

-- Index for flagged transaction review queries
CREATE INDEX IF NOT EXISTS idx_transactions_household_flagged
ON transactions (household_id, is_flagged)
WHERE is_flagged = true;

-- Index for month_status lookups (dashboard discussion panel)
CREATE INDEX IF NOT EXISTS idx_month_status_household_month_currency
ON month_status (household_id, month, currency);

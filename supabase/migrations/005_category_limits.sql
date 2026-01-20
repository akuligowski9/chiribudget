-- Migration: Add category spending limits
-- CB-036: Category Spending Limits

-- Add category_limits column to budget_config
-- Structure: { "Food": { "limit": 800, "flagMode": "off" }, ... }
-- flagMode values: 'off', 'crossing', 'all_after'
ALTER TABLE budget_config
ADD COLUMN IF NOT EXISTS category_limits jsonb DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN budget_config.category_limits IS 'Per-category spending limits. JSON object with category names as keys, containing limit (number) and flagMode (off|crossing|all_after)';

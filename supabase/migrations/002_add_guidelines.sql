-- Add guidelines columns to budget_config
ALTER TABLE budget_config
ADD COLUMN IF NOT EXISTS guidelines text,
ADD COLUMN IF NOT EXISTS guidelines_updated_at timestamptz,
ADD COLUMN IF NOT EXISTS guidelines_updated_by uuid;

-- Add comment for documentation
COMMENT ON COLUMN budget_config.guidelines IS 'Household rules and guidelines markdown/text';
COMMENT ON COLUMN budget_config.guidelines_updated_at IS 'When guidelines were last edited';
COMMENT ON COLUMN budget_config.guidelines_updated_by IS 'User ID who last edited guidelines';

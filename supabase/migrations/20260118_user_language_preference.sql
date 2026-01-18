-- Add preferred_language column to profiles table
-- Allows each user to have their own language preference (en or es)

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS preferred_language text NOT NULL DEFAULT 'es';

COMMENT ON COLUMN profiles.preferred_language IS 'User preferred language code (en or es)';

-- Set Alex's preference to English (update the display_name if different)
UPDATE profiles SET preferred_language = 'en' WHERE display_name ILIKE '%alex%';

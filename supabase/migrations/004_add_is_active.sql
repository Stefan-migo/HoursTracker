-- Migration: Add is_active field to profiles
-- Allows admin to activate/deactivate employees

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;  -- Cache email for easier queries

-- Update email column with data from auth.users
UPDATE profiles SET email = u.email 
FROM auth.users u 
WHERE profiles.id = u.id;

-- Make email NOT NULL after update (assuming all users have email)
ALTER TABLE profiles ALTER COLUMN email SET NOT NULL;

-- Create index for faster queries by active status
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Add check constraint for is_active
ALTER TABLE profiles ADD CONSTRAINT check_is_active CHECK (is_active IN (true, false));

-- Add updated_at trigger if not exists
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

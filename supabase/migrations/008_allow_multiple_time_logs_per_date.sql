-- Migration: Allow multiple time logs per date (personal and official)
-- Description: Change unique constraint to allow one personal and one official record per date per user
-- Date: 2026-03-22

-- ============================================
-- STEP 1: Check for existing data conflicts
-- ============================================

DO $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Check how many users have potential conflicts
  SELECT COUNT(*) INTO v_count
  FROM (
    SELECT user_id, date, COUNT(*) as cnt
    FROM time_logs
    GROUP BY user_id, date
    HAVING COUNT(*) > 1
  ) conflicts;
  
  IF v_count > 0 THEN
    RAISE NOTICE 'WARNING: There are % user/date combinations with multiple records.', v_count;
    RAISE NOTICE 'These records must be reviewed before applying migration.';
    RAISE NOTICE 'Query to see conflicts:';
    RAISE NOTICE 'SELECT user_id, date, COUNT(*) FROM time_logs GROUP BY user_id, date HAVING COUNT(*) > 1;';
  ELSE
    RAISE NOTICE 'No data conflicts found. Proceeding with migration...';
  END IF;
END $$;

-- ============================================
-- STEP 2: Remove old unique constraint
-- ============================================

-- Drop the unique constraint if it exists
ALTER TABLE time_logs 
DROP CONSTRAINT IF EXISTS time_logs_user_id_date_key;

-- Also drop any other potential unique constraints on user_id + date
DO $$
BEGIN
  EXECUTE (
    SELECT 'ALTER TABLE time_logs DROP CONSTRAINT IF EXISTS ' || constraint_name || ';'
    FROM information_schema.table_constraints
    WHERE table_name = 'time_logs'
    AND constraint_type = 'UNIQUE'
    AND constraint_name LIKE '%user%date%'
  );
EXCEPTION WHEN OTHERS THEN
  -- Constraint might not exist, continue
  NULL;
END $$;

-- ============================================
-- STEP 3: Add new unique constraint
-- ============================================

-- This allows:
-- - 1 personal record (is_official = false) per date
-- - 1 official record (is_official = true) per date
-- - Per user

ALTER TABLE time_logs 
ADD CONSTRAINT time_logs_user_date_official_unique 
UNIQUE (user_id, date, is_official);

-- ============================================
-- STEP 4: Add additional indexes for performance
-- ============================================

-- Index for filtered searches by type
CREATE INDEX IF NOT EXISTS idx_time_logs_user_date_official 
ON time_logs(user_id, date, is_official);

-- Partial index for official records (frequent queries)
CREATE INDEX IF NOT EXISTS idx_time_logs_official_only 
ON time_logs(user_id, date) 
WHERE is_official = true;

-- Partial index for personal records
CREATE INDEX IF NOT EXISTS idx_time_logs_personal_only 
ON time_logs(user_id, date) 
WHERE is_official = false;

-- ============================================
-- STEP 5: Add columns to disputes for linking specific records
-- ============================================

-- Add optional FKs to time_logs to link specific records
ALTER TABLE disputes 
ADD COLUMN IF NOT EXISTS personal_time_log_id UUID REFERENCES time_logs(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS official_time_log_id UUID REFERENCES time_logs(id) ON DELETE SET NULL;

-- Indexes for the new FKs
CREATE INDEX IF NOT EXISTS idx_disputes_personal_log ON disputes(personal_time_log_id);
CREATE INDEX IF NOT EXISTS idx_disputes_official_log ON disputes(official_time_log_id);

-- ============================================
-- STEP 6: Create helper function for checking conflicts
-- ============================================

CREATE OR REPLACE FUNCTION has_time_log_conflict(
  p_user_id UUID,
  p_date DATE,
  p_is_official BOOLEAN
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM time_logs
    WHERE user_id = p_user_id
      AND date = p_date
      AND is_official = p_is_official
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 7: Create trigger function for validation
-- ============================================

CREATE OR REPLACE FUNCTION validate_time_log_insert()
RETURNS TRIGGER AS $$
DECLARE
  is_admin_import BOOLEAN;
BEGIN
  -- Check if this is an admin import (set by the import function)
  is_admin_import := COALESCE(current_setting('app.is_admin_import', true)::BOOLEAN, false);
  
  -- Check that employees don't try to create official records
  -- Skip this check if is_admin_import is true (admin import bypass)
  IF NEW.is_official = true AND NOT is_admin_import THEN
    IF NOT EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = COALESCE(auth.uid(), NEW.marked_by)
      AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Only administrators can create official records';
    END IF;
  END IF;
  
  -- Check that a duplicate doesn't exist
  IF EXISTS (
    SELECT 1 FROM time_logs
    WHERE user_id = NEW.user_id
      AND date = NEW.date
      AND is_official = NEW.is_official
      AND (TG_OP = 'INSERT' OR id != NEW.id)
  ) THEN
    RAISE EXCEPTION 'A % record already exists for this date',
      CASE WHEN NEW.is_official THEN 'official' ELSE 'personal' END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS validate_time_log_insert_trigger ON time_logs;

-- Create trigger
CREATE TRIGGER validate_time_log_insert_trigger
  BEFORE INSERT OR UPDATE ON time_logs
  FOR EACH ROW
  EXECUTE FUNCTION validate_time_log_insert();

-- ============================================
-- STEP 8: Update comments
-- ============================================

COMMENT ON CONSTRAINT time_logs_user_date_official_unique ON time_logs 
IS 'Allows maximum 1 personal and 1 official record per date per user';

COMMENT ON COLUMN time_logs.is_official 
IS 'FALSE = employee personal record, TRUE = admin official record';

-- ============================================
-- STEP 9: Verify migration
-- ============================================

DO $$
DECLARE
  v_constraint_exists BOOLEAN;
  v_index_count INTEGER;
BEGIN
  -- Check if constraint exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'time_logs'
    AND constraint_name = 'time_logs_user_date_official_unique'
  ) INTO v_constraint_exists;
  
  -- Count indexes on time_logs
  SELECT COUNT(*) INTO v_index_count
  FROM pg_indexes
  WHERE tablename = 'time_logs';
  
  RAISE NOTICE 'Migration verification:';
  RAISE NOTICE '- New unique constraint exists: %', v_constraint_exists;
  RAISE NOTICE '- Total indexes on time_logs: %', v_index_count;
  
  IF v_constraint_exists THEN
    RAISE NOTICE 'Migration completed successfully!';
  ELSE
    RAISE EXCEPTION 'Migration failed: constraint not created';
  END IF;
END $$;

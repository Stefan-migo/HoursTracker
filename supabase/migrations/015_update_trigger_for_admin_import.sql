-- Migration: Update validate_time_log_insert trigger to support admin import bypass
-- Adds support for admin import through app.is_admin_import setting

-- Recreate the trigger function with admin import support
DROP TRIGGER IF EXISTS validate_time_log_insert_trigger ON time_logs;
DROP FUNCTION IF EXISTS validate_time_log_insert();

CREATE FUNCTION validate_time_log_insert()
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

CREATE TRIGGER validate_time_log_insert_trigger
  BEFORE INSERT OR UPDATE ON time_logs
  FOR EACH ROW
  EXECUTE FUNCTION validate_time_log_insert();

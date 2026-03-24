-- Migration: Add additional fields to time_logs
-- Adds is_manual, is_official, marked_by, record_type columns

-- Add is_manual column (true if manually entered, false if automatic)
ALTER TABLE time_logs ADD COLUMN IF NOT EXISTS is_manual BOOLEAN DEFAULT false;

-- Add is_official column (true if marked by admin as official record)
ALTER TABLE time_logs ADD COLUMN IF NOT EXISTS is_official BOOLEAN DEFAULT false;

-- Add marked_by column (user who recorded this log)
ALTER TABLE time_logs ADD COLUMN IF NOT EXISTS marked_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Add record_type column (deprecated: use is_official instead)
-- This is for backwards compatibility
ALTER TABLE time_logs ADD COLUMN IF NOT EXISTS record_type TEXT DEFAULT 'personal' CHECK (record_type IN ('official', 'personal'));

-- Create foreign key for marked_by
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'time_logs_marked_by_fkey' 
    AND table_name = 'time_logs'
  ) THEN
    ALTER TABLE time_logs ADD CONSTRAINT time_logs_marked_by_fkey 
    FOREIGN KEY (marked_by) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_time_logs_is_official ON time_logs(is_official);
CREATE INDEX IF NOT EXISTS idx_time_logs_marked_by ON time_logs(marked_by);
CREATE INDEX IF NOT EXISTS idx_time_logs_record_type ON time_logs(record_type);

-- Update existing records to set default values
UPDATE time_logs SET is_manual = false WHERE is_manual IS NULL;
UPDATE time_logs SET is_official = false WHERE is_official IS NULL;
UPDATE time_logs SET record_type = 'personal' WHERE record_type IS NULL;

-- Add trigger to auto-set record_type based on is_official
CREATE OR REPLACE FUNCTION update_record_type()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_official = true THEN
    NEW.record_type := 'official';
  ELSE
    NEW.record_type := 'personal';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_time_logs_record_type ON time_logs;
CREATE TRIGGER update_time_logs_record_type
  BEFORE INSERT OR UPDATE OF is_official ON time_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_record_type();
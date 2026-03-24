-- Migration: Row Level Security Policies for HoursTracker
-- RLS policies for profiles and time_logs tables

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;

-- Policies for profiles table

-- Users can view their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can insert their own profile (via trigger)
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Admins can view all profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins can update any profile
DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Policies for time_logs table

-- Employees can view their own time logs
DROP POLICY IF EXISTS "Employees can view own time logs" ON time_logs;
CREATE POLICY "Employees can view own time logs"
  ON time_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Employees can create their own time logs
DROP POLICY IF EXISTS "Employees can create own time logs" ON time_logs;
CREATE POLICY "Employees can create own time logs"
  ON time_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Employees can update their own time logs
DROP POLICY IF EXISTS "Employees can update own time logs" ON time_logs;
CREATE POLICY "Employees can update own time logs"
  ON time_logs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- No delete for employees
DROP POLICY IF EXISTS "No delete for employees" ON time_logs;
CREATE POLICY "No delete for employees"
  ON time_logs FOR DELETE
  USING (false);

-- Admins can view all time logs
DROP POLICY IF EXISTS "Admins can view all time logs" ON time_logs;
CREATE POLICY "Admins can view all time logs"
  ON time_logs FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins can create any time log
DROP POLICY IF EXISTS "Admins can create any time log" ON time_logs;
CREATE POLICY "Admins can create any time log"
  ON time_logs FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins can update any time log
DROP POLICY IF EXISTS "Admins can update any time log" ON time_logs;
CREATE POLICY "Admins can update any time log"
  ON time_logs FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins can delete time logs (for bulk operations)
DROP POLICY IF EXISTS "Admins can delete time logs" ON time_logs;
CREATE POLICY "Admins can delete time logs"
  ON time_logs FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Migration: Update RLS policies for multiple time logs per date
-- Description: Update Row Level Security policies to allow independent personal and official records
-- Date: 2026-03-22

-- ============================================
-- STEP 1: Drop existing policies that need updating
-- ============================================

-- Drop employee policies
DROP POLICY IF EXISTS "Employees can view own time logs" ON time_logs;
DROP POLICY IF EXISTS "Employees can create own time logs" ON time_logs;
DROP POLICY IF EXISTS "Employees can update own time logs" ON time_logs;
DROP POLICY IF EXISTS "No delete for employees" ON time_logs;
DROP POLICY IF EXISTS "Employees view own time logs" ON time_logs;
DROP POLICY IF EXISTS "Employees create personal time logs" ON time_logs;
DROP POLICY IF EXISTS "Employees update own personal logs" ON time_logs;
DROP POLICY IF EXISTS "Employees cannot delete logs" ON time_logs;
DROP POLICY IF EXISTS "Employees can delete own personal logs" ON time_logs;

-- Drop admin policies
DROP POLICY IF EXISTS "Admins can view all time logs" ON time_logs;
DROP POLICY IF EXISTS "Admins can create any time log" ON time_logs;
DROP POLICY IF EXISTS "Admins can update any time log" ON time_logs;
DROP POLICY IF EXISTS "Admins can delete time logs" ON time_logs;

-- ============================================
-- STEP 2: Create helper function for checking admin role
-- ============================================

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 3: Create employee policies
-- ============================================

-- Policy 1: Employees can VIEW their own records (all sources: personal and official)
CREATE POLICY "Employees can view own time logs"
  ON time_logs FOR SELECT
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND (is_active = true OR is_active IS NULL)
    )
  );

-- Policy 2: Employees can CREATE only personal records (is_official = false)
CREATE POLICY "Employees can create personal time logs"
  ON time_logs FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    AND is_official = false
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND (is_active = true OR is_active IS NULL)
    )
  );

-- Policy 3: Employees can UPDATE only their personal records
CREATE POLICY "Employees can update own personal logs"
  ON time_logs FOR UPDATE
  USING (
    auth.uid() = user_id 
    AND is_official = false
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND (is_active = true OR is_active IS NULL)
    )
  )
  WITH CHECK (
    auth.uid() = user_id 
    AND is_official = false
  );

-- Policy 4: Employees can DELETE only their own personal records (is_official = false)
CREATE POLICY "Employees can delete own personal logs"
  ON time_logs FOR DELETE
  USING (
    auth.uid() = user_id 
    AND is_official = false
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND (is_active = true OR is_active IS NULL)
    )
  );

-- ============================================
-- STEP 4: Create admin policies
-- ============================================

-- Policy 5: Admins can VIEW all records
CREATE POLICY "Admins can view all time logs"
  ON time_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Policy 6: Admins can CREATE records for any user (personal or official)
CREATE POLICY "Admins can create any time log"
  ON time_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Policy 7: Admins can UPDATE any record
CREATE POLICY "Admins can update any time log"
  ON time_logs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Policy 8: Admins can DELETE any record
CREATE POLICY "Admins can delete time logs"
  ON time_logs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- ============================================
-- STEP 5: Create dispute policies for linking records
-- ============================================

-- Allow employees to update disputes with time log IDs
DROP POLICY IF EXISTS "Employees can update disputes" ON disputes;

CREATE POLICY "Employees can update dispute time log references"
  ON disputes FOR UPDATE
  USING (
    auth.uid() = employee_id
    AND status = 'pending'
  )
  WITH CHECK (
    auth.uid() = employee_id
    AND status = 'pending'
  );

-- Allow admins to update any dispute
DROP POLICY IF EXISTS "Admins can update disputes" ON disputes;

CREATE POLICY "Admins can update disputes"
  ON disputes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- ============================================
-- STEP 6: Verify policies
-- ============================================

DO $$
DECLARE
  v_employee_select BOOLEAN;
  v_employee_insert BOOLEAN;
  v_employee_update BOOLEAN;
  v_admin_select BOOLEAN;
  v_admin_insert BOOLEAN;
BEGIN
  -- Check if policies exist
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'time_logs'
    AND policyname = 'Employees can view own time logs'
  ) INTO v_employee_select;
  
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'time_logs'
    AND policyname = 'Employees can create personal time logs'
  ) INTO v_employee_insert;
  
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'time_logs'
    AND policyname = 'Employees can update own personal logs'
  ) INTO v_employee_update;
  
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'time_logs'
    AND policyname = 'Admins can view all time logs'
  ) INTO v_admin_select;
  
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'time_logs'
    AND policyname = 'Admins can create any time log'
  ) INTO v_admin_insert;
  
  RAISE NOTICE 'RLS Policies verification:';
  RAISE NOTICE '- Employee SELECT policy: %', v_employee_select;
  RAISE NOTICE '- Employee INSERT policy: %', v_employee_insert;
  RAISE NOTICE '- Employee UPDATE policy: %', v_employee_update;
  RAISE NOTICE '- Admin SELECT policy: %', v_admin_select;
  RAISE NOTICE '- Admin INSERT policy: %', v_admin_insert;
  
  IF v_employee_select AND v_employee_insert AND v_employee_update AND v_admin_select AND v_admin_insert THEN
    RAISE NOTICE 'All RLS policies created successfully!';
  ELSE
    RAISE WARNING 'Some policies may not have been created properly';
  END IF;
END $$;

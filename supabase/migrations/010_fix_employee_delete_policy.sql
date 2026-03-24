-- Migration: Fix RLS policies to allow employees delete their own non-official time logs
-- Created: 2024-03-22
-- Author: debug-master

-- Drop the restrictive policy that prevents all deletes for employees
DROP POLICY IF EXISTS "No delete for employees" ON time_logs;

-- Create new policy: Employees can delete their own NON-OFFICIAL time logs
CREATE POLICY "Employees can delete own non-official time logs"
  ON time_logs FOR DELETE
  USING (
    auth.uid() = user_id 
    AND is_official = false
  );

-- Note: Admins can still delete any time log (policy already exists from 002_rls_policies.sql)
-- Note: Official records cannot be deleted by employees (protected by is_official check)

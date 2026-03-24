-- Migration: Allow employees to cancel their pending disputes
-- Created: 2026-03-22

-- Remove the restrictive delete policy
DROP POLICY IF EXISTS "No delete disputes" ON disputes;

-- Allow employees to delete their own pending disputes
CREATE POLICY "Employees can delete own pending disputes"
  ON disputes FOR DELETE
  USING (
    auth.uid() = employee_id 
    AND status = 'pending'
  );

-- Allow admins to delete any dispute
CREATE POLICY "Admins can delete any dispute"
  ON disputes FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

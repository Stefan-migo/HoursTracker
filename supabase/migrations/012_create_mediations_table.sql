-- Migration: Create mediations table
-- Replaces disputes with collaborative mediation system
-- Created: 2026-03-22

-- Create custom ENUM types for mediation
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'mediation_status') THEN
    CREATE TYPE mediation_status AS ENUM (
      'pending_review',      -- Initial state, waiting for first action
      'in_discussion',       -- Active conversation/editing
      'agreement_reached',   -- Both parties agreed on values
      'resolved',           -- Admin approved and applied changes
      'closed_no_changes'   -- Closed without applying changes
    );
  END IF;
END $$;

-- Create mediations table
CREATE TABLE IF NOT EXISTS mediations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- References to actual time_log records
  admin_time_log_id UUID REFERENCES time_logs(id) ON DELETE SET NULL,
  employee_time_log_id UUID REFERENCES time_logs(id) ON DELETE SET NULL,
  
  -- Snapshots at creation (for audit trail)
  admin_clock_in_snap TIMESTAMPTZ,
  admin_clock_out_snap TIMESTAMPTZ,
  admin_total_hours_snap DECIMAL(5,2),
  
  employee_clock_in_snap TIMESTAMPTZ,
  employee_clock_out_snap TIMESTAMPTZ,
  employee_total_hours_snap DECIMAL(5,2),
  
  -- Current values being negotiated (editable)
  proposed_clock_in TIMESTAMPTZ,
  proposed_clock_out TIMESTAMPTZ,
  proposed_total_hours DECIMAL(5,2),
  proposed_by UUID REFERENCES profiles(id),
  proposed_at TIMESTAMPTZ,
  
  -- Proposed values from the other party (for comparison)
  counter_clock_in TIMESTAMPTZ,
  counter_clock_out TIMESTAMPTZ,
  counter_total_hours DECIMAL(5,2),
  counter_by UUID REFERENCES profiles(id),
  counter_at TIMESTAMPTZ,
  
  -- Mediation metadata
  initial_reason TEXT NOT NULL,
  status mediation_status NOT NULL DEFAULT 'pending_review',
  
  -- Conversation thread (JSONB for flexibility)
  notes JSONB DEFAULT '[]'::jsonb,
  
  -- Timestamps and tracking
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES profiles(id),
  
  -- Activity tracking for "contact suggestion"
  admin_last_activity_at TIMESTAMPTZ,
  employee_last_activity_at TIMESTAMPTZ,
  last_activity_by UUID REFERENCES profiles(id),
  
  -- Resolution details
  resolution_notes TEXT,
  
  -- Soft delete for audit trail
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES profiles(id),
  is_active BOOLEAN DEFAULT true,
  
  -- Constraints
  CONSTRAINT valid_dates CHECK (date <= CURRENT_DATE),
  CONSTRAINT valid_proposed_hours CHECK (
    proposed_total_hours IS NULL OR proposed_total_hours >= 0
  ),
  CONSTRAINT valid_counter_hours CHECK (
    counter_total_hours IS NULL OR counter_total_hours >= 0
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_mediations_employee_id ON mediations(employee_id);
CREATE INDEX IF NOT EXISTS idx_mediations_date ON mediations(date);
CREATE INDEX IF NOT EXISTS idx_mediations_status ON mediations(status);
CREATE INDEX IF NOT EXISTS idx_mediations_employee_date ON mediations(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_mediations_active ON mediations(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_mediations_created_at ON mediations(created_at);
CREATE INDEX IF NOT EXISTS idx_mediations_notes ON mediations USING GIN (notes);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_mediations_updated_at ON mediations;
CREATE TRIGGER update_mediations_updated_at
  BEFORE UPDATE ON mediations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies for mediations
ALTER TABLE mediations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Employees can view own mediations" ON mediations;
DROP POLICY IF EXISTS "Admins can view all mediations" ON mediations;
DROP POLICY IF EXISTS "Employees can create mediations" ON mediations;
DROP POLICY IF EXISTS "Participants can update mediations" ON mediations;
DROP POLICY IF EXISTS "Participants can delete mediations" ON mediations;

-- Employees can view their own mediations
CREATE POLICY "Employees can view own mediations"
  ON mediations FOR SELECT
  USING (auth.uid() = employee_id);

-- Admins can view all mediations
CREATE POLICY "Admins can view all mediations"
  ON mediations FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Employees can create mediations
CREATE POLICY "Employees can create mediations"
  ON mediations FOR INSERT
  WITH CHECK (auth.uid() = employee_id);

-- Admins can also create mediations
CREATE POLICY "Admins can create mediations"
  ON mediations FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Both participants can update mediations (employee or admin)
CREATE POLICY "Participants can update mediations"
  ON mediations FOR UPDATE
  USING (
    auth.uid() = employee_id 
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Participants can soft delete their own mediations
CREATE POLICY "Participants can delete mediations"
  ON mediations FOR DELETE
  USING (
    (auth.uid() = employee_id AND status IN ('pending_review', 'in_discussion'))
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Add mediation_id to time_logs table
ALTER TABLE time_logs 
  ADD COLUMN IF NOT EXISTS mediation_id UUID REFERENCES mediations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS edited_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS edit_reason TEXT;

-- Create index for efficient mediation lookups
CREATE INDEX IF NOT EXISTS idx_time_logs_mediation ON time_logs(mediation_id) 
  WHERE mediation_id IS NOT NULL;

-- View: Active mediations with calculated fields
CREATE OR REPLACE VIEW active_mediations_view AS
SELECT 
  m.*,
  p.full_name as employee_name,
  p.email as employee_email,
  admin_log.clock_in as admin_current_clock_in,
  admin_log.clock_out as admin_current_clock_out,
  admin_log.total_hours as admin_current_total_hours,
  employee_log.clock_in as employee_current_clock_in,
  employee_log.clock_out as employee_current_clock_out,
  employee_log.total_hours as employee_current_total_hours,
  -- Calculate if mediation is stale (48 hours = 172800 seconds)
  EXTRACT(EPOCH FROM (NOW() - GREATEST(
    COALESCE(m.admin_last_activity_at, m.created_at),
    COALESCE(m.employee_last_activity_at, m.created_at)
  ))) > 172800 as is_stale,
  GREATEST(
    COALESCE(m.admin_last_activity_at, m.created_at),
    COALESCE(m.employee_last_activity_at, m.created_at)
  ) as last_activity_at,
  -- Calculate differences
  CASE 
    WHEN admin_log.clock_in IS NOT NULL AND employee_log.clock_in IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (admin_log.clock_in - employee_log.clock_in)) / 60
    ELSE NULL 
  END as clock_in_diff_minutes,
  CASE 
    WHEN admin_log.clock_out IS NOT NULL AND employee_log.clock_out IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (admin_log.clock_out - employee_log.clock_out)) / 60
    ELSE NULL 
  END as clock_out_diff_minutes,
  CASE 
    WHEN admin_log.total_hours IS NOT NULL AND employee_log.total_hours IS NOT NULL 
    THEN admin_log.total_hours - employee_log.total_hours
    ELSE NULL 
  END as hours_diff
FROM mediations m
LEFT JOIN profiles p ON m.employee_id = p.id
LEFT JOIN time_logs admin_log ON m.admin_time_log_id = admin_log.id
LEFT JOIN time_logs employee_log ON m.employee_time_log_id = employee_log.id
WHERE m.is_active = true 
  AND m.status IN ('pending_review', 'in_discussion', 'agreement_reached');

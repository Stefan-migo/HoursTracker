-- Migration: Create disputes table
-- Stores disputes between employee records and official records

CREATE TABLE IF NOT EXISTS disputes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- Admin's official record
  admin_clock_in TIMESTAMPTZ,
  admin_clock_out TIMESTAMPTZ,
  admin_total_hours DECIMAL(5,2),
  
  -- Employee's personal record
  employee_clock_in TIMESTAMPTZ,
  employee_clock_out TIMESTAMPTZ,
  employee_total_hours DECIMAL(5,2),
  
  -- Dispute details
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'rejected')),
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_dispute_status CHECK (status IN ('pending', 'resolved', 'rejected'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_disputes_employee_id ON disputes(employee_id);
CREATE INDEX IF NOT EXISTS idx_disputes_date ON disputes(date);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_employee_date ON disputes(employee_id, date);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_disputes_updated_at ON disputes;
CREATE TRIGGER update_disputes_updated_at
  BEFORE UPDATE ON disputes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies for disputes
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "Employees can view own disputes" ON disputes;
DROP POLICY IF EXISTS "Admins can view all disputes" ON disputes;
DROP POLICY IF EXISTS "Employees can create disputes" ON disputes;
DROP POLICY IF EXISTS "Admins can update disputes" ON disputes;
DROP POLICY IF EXISTS "No delete disputes" ON disputes;

-- Employees can view their own disputes
CREATE POLICY "Employees can view own disputes"
  ON disputes FOR SELECT
  USING (auth.uid() = employee_id);

-- Admins can view all disputes
CREATE POLICY "Admins can view all disputes"
  ON disputes FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Employees can create disputes
CREATE POLICY "Employees can create disputes"
  ON disputes FOR INSERT
  WITH CHECK (auth.uid() = employee_id);

-- Admins can update disputes (resolve/reject)
CREATE POLICY "Admins can update disputes"
  ON disputes FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- No one can delete disputes (for audit trail)
CREATE POLICY "No delete disputes"
  ON disputes FOR DELETE
  USING (false);
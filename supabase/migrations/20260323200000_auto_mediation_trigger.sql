-- Migration: Create automatic mediation trigger (final version)
-- Automatically creates mediations when discrepancies > 10 minutes are detected
-- Created: 2026-03-23 (this version)

-- Function to check for discrepancies and create mediation automatically
CREATE OR REPLACE FUNCTION check_and_create_mediation()
RETURNS TRIGGER AS $$
DECLARE
  v_employee_id UUID;
  v_official_record RECORD;
  v_personal_record RECORD;
  v_clock_in_diff INTEGER;
  v_clock_out_diff INTEGER;
  v_total_hours_diff DECIMAL(5,2);
  v_existing_mediation UUID;
  v_discrepancy_threshold INTEGER := 10; -- 10 minutes threshold
BEGIN
  -- Get employee_id from the time log
  v_employee_id := NEW.user_id;
  
  -- Skip if no date
  IF NEW.date IS NULL THEN
    RETURN NEW;
  END IF;

  -- Find the counterpart record (official if personal, personal if official)
  -- Note: time_logs does not have is_active column, only mediations does
  IF NEW.is_official THEN
    -- This is an official record, look for personal
    SELECT * INTO v_personal_record
    FROM time_logs
    WHERE user_id = v_employee_id
      AND date = NEW.date
      AND is_official = false
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- If no personal record exists, nothing to compare
    IF v_personal_record IS NULL THEN
      RETURN NEW;
    END IF;
    
    v_official_record := NEW;
  ELSE
    -- This is a personal record, look for official
    SELECT * INTO v_official_record
    FROM time_logs
    WHERE user_id = v_employee_id
      AND date = NEW.date
      AND is_official = true
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- If no official record exists, nothing to compare
    IF v_official_record IS NULL THEN
      RETURN NEW;
    END IF;
    
    v_personal_record := NEW;
  END IF;

  -- Calculate differences
  v_clock_in_diff := 0;
  v_clock_out_diff := 0;
  v_total_hours_diff := 0;

  IF v_official_record.clock_in IS NOT NULL AND v_personal_record.clock_in IS NOT NULL THEN
    v_clock_in_diff := ABS(EXTRACT(EPOCH FROM (v_official_record.clock_in - v_personal_record.clock_in)) / 60);
  END IF;

  IF v_official_record.clock_out IS NOT NULL AND v_personal_record.clock_out IS NOT NULL THEN
    v_clock_out_diff := ABS(EXTRACT(EPOCH FROM (v_official_record.clock_out - v_personal_record.clock_out)) / 60);
  END IF;

  IF v_official_record.total_hours IS NOT NULL AND v_personal_record.total_hours IS NOT NULL THEN
    v_total_hours_diff := ABS(v_official_record.total_hours - v_personal_record.total_hours);
  END IF;

  -- Check if discrepancy exceeds threshold (10 minutes or 0.17 hours)
  IF v_clock_in_diff > v_discrepancy_threshold 
     OR v_clock_out_diff > v_discrepancy_threshold 
     OR v_total_hours_diff > 0.17 THEN
    
    -- Check if mediation already exists for this date
    SELECT id INTO v_existing_mediation
    FROM mediations
    WHERE employee_id = v_employee_id
      AND date = NEW.date
      AND is_active = true
      AND status IN ('pending_review', 'in_discussion', 'agreement_reached')
    LIMIT 1;

    -- Only create if no existing active mediation
    IF v_existing_mediation IS NULL THEN
      INSERT INTO mediations (
        employee_id,
        date,
        admin_time_log_id,
        employee_time_log_id,
        admin_clock_in_snap,
        admin_clock_out_snap,
        admin_total_hours_snap,
        employee_clock_in_snap,
        employee_clock_out_snap,
        employee_total_hours_snap,
        initial_reason,
        status,
        created_at,
        updated_at,
        admin_last_activity_at,
        last_activity_by,
        is_active
      ) VALUES (
        v_employee_id,
        NEW.date,
        v_official_record.id,
        v_personal_record.id,
        v_official_record.clock_in,
        v_official_record.clock_out,
        v_official_record.total_hours,
        v_personal_record.clock_in,
        v_personal_record.clock_out,
        v_personal_record.total_hours,
        'Discrepancia automática detectada: ' || 
          CASE 
            WHEN v_clock_in_diff > v_discrepancy_threshold THEN 'Entrada difiere en ' || v_clock_in_diff || ' minutos. '
            ELSE ''
          END ||
          CASE 
            WHEN v_clock_out_diff > v_discrepancy_threshold THEN 'Salida difiere en ' || v_clock_out_diff || ' minutos. '
            ELSE ''
          END ||
          CASE 
            WHEN v_total_hours_diff > 0.17 THEN 'Total de horas difiere en ' || ROUND(v_total_hours_diff::numeric, 2) || ' horas.'
            ELSE ''
          END,
        'pending_review',
        NOW(),
        NOW(),
        CASE WHEN NEW.is_official THEN NOW() ELSE NULL END,
        CASE WHEN NEW.is_official THEN NEW.marked_by ELSE v_official_record.marked_by END,
        true
      );

      -- Update time_logs to reference the new mediation
      UPDATE time_logs 
      SET mediation_id = (
        SELECT id FROM mediations 
        WHERE employee_id = v_employee_id 
          AND date = NEW.date 
          AND is_active = true
        ORDER BY created_at DESC
        LIMIT 1
      )
      WHERE id IN (v_official_record.id, v_personal_record.id);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS auto_mediation_trigger ON time_logs;
DROP TRIGGER IF EXISTS auto_mediation_update_trigger ON time_logs;

-- Create trigger for INSERT
CREATE TRIGGER auto_mediation_trigger
  AFTER INSERT ON time_logs
  FOR EACH ROW
  EXECUTE FUNCTION check_and_create_mediation();

-- Create trigger for UPDATE (when clock_in, clock_out, or total_hours changes)
CREATE TRIGGER auto_mediation_update_trigger
  AFTER UPDATE ON time_logs
  FOR EACH ROW
  WHEN (
    OLD.clock_in IS DISTINCT FROM NEW.clock_in OR
    OLD.clock_out IS DISTINCT FROM NEW.clock_out OR
    OLD.total_hours IS DISTINCT FROM NEW.total_hours
  )
  EXECUTE FUNCTION check_and_create_mediation();

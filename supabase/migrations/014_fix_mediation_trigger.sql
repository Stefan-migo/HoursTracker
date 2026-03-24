-- Migration: Fix check_and_create_mediation function
-- Removes invalid is_active reference from time_logs query
-- The time_logs table does not have is_active column, only mediations does

-- Fix the function to remove is_active check on time_logs
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
  v_discrepancy_threshold INTEGER := 10;
BEGIN
  v_employee_id := NEW.user_id;
  
  IF NEW.date IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.is_official THEN
    SELECT * INTO v_personal_record
    FROM time_logs
    WHERE user_id = v_employee_id
      AND date = NEW.date
      AND is_official = false
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF v_personal_record IS NULL THEN
      RETURN NEW;
    END IF;
    
    v_official_record := NEW;
  ELSE
    SELECT * INTO v_official_record
    FROM time_logs
    WHERE user_id = v_employee_id
      AND date = NEW.date
      AND is_official = true
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF v_official_record IS NULL THEN
      RETURN NEW;
    END IF;
    
    v_personal_record := NEW;
  END IF;

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

  IF v_clock_in_diff > v_discrepancy_threshold 
     OR v_clock_out_diff > v_discrepancy_threshold 
     OR v_total_hours_diff > 0.17 THEN
     
    SELECT id INTO v_existing_mediation
    FROM mediations
    WHERE employee_id = v_employee_id
      AND date = NEW.date
      AND is_active = true
      AND status IN ('pending_review', 'in_discussion', 'agreement_reached')
    LIMIT 1;

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

-- Recreate triggers
DROP TRIGGER IF EXISTS auto_mediation_trigger ON time_logs;
DROP TRIGGER IF EXISTS auto_mediation_update_trigger ON time_logs;

CREATE TRIGGER auto_mediation_trigger
  AFTER INSERT ON time_logs
  FOR EACH ROW
  EXECUTE FUNCTION check_and_create_mediation();

CREATE TRIGGER auto_mediation_update_trigger
  AFTER UPDATE ON time_logs
  FOR EACH ROW
  WHEN (
    OLD.clock_in IS DISTINCT FROM NEW.clock_in OR
    OLD.clock_out IS DISTINCT FROM NEW.clock_out OR
    OLD.total_hours IS DISTINCT FROM NEW.total_hours
  )
  EXECUTE FUNCTION check_and_create_mediation();

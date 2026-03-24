-- Migration: Add helper function to insert official time logs bypassing RLS trigger
-- This allows admin import functionality to work correctly

-- Create a function with SECURITY DEFINER to bypass the validate_time_log_insert trigger
CREATE OR REPLACE FUNCTION public.insert_official_time_logs(time_logs_array JSONB)
RETURNS SETOF time_logs AS $$
DECLARE
  log_entry JSONB;
BEGIN
  -- Set admin import flag to bypass trigger validation
  PERFORM set_config('app.is_admin_import', 'true', true);
  
  FOR log_entry IN SELECT * FROM jsonb_array_elements(time_logs_array)
  LOOP
    INSERT INTO time_logs (
      user_id,
      date,
      clock_in,
      clock_out,
      total_hours,
      is_official,
      is_manual,
      marked_by
    ) VALUES (
      (log_entry->>'user_id')::UUID,
      (log_entry->>'date')::DATE,
      (log_entry->>'clock_in')::TIMESTAMPTZ,
      (log_entry->>'clock_out')::TIMESTAMPTZ,
      (log_entry->>'total_hours')::DECIMAL,
      TRUE,
      COALESCE((log_entry->>'is_manual')::BOOLEAN, FALSE),
      COALESCE((log_entry->>'marked_by')::UUID, auth.uid())
    ) ON CONFLICT (user_id, date, is_official) DO NOTHING;
  END LOOP;
  
  -- Reset admin import flag
  PERFORM set_config('app.is_admin_import', 'false', true);
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.insert_official_time_logs(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_official_time_logs(JSONB) TO service_role;

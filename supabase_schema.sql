


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."mediation_status" AS ENUM (
    'pending_review',
    'in_discussion',
    'agreement_reached',
    'resolved',
    'closed_no_changes'
);


ALTER TYPE "public"."mediation_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_total_hours"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.clock_out IS NOT NULL AND NEW.clock_in IS NOT NULL THEN
    -- Calcular horas y redondear a 2 decimales
    NEW.total_hours := ROUND(
      EXTRACT(EPOCH FROM (NEW.clock_out - NEW.clock_in)) / 3600,
      2
    );
  ELSE
    NEW.total_hours := NULL;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."calculate_total_hours"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_and_create_mediation"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."check_and_create_mediation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_employees_summary"("p_start_date" "date", "p_end_date" "date") RETURNS TABLE("user_id" "uuid", "full_name" "text", "email" "text", "total_hours" numeric, "days_worked" bigint, "avg_hours" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.full_name,
    p.email,
    COALESCE(SUM(t.total_hours), 0)::DECIMAL as total_hours,
    COUNT(t.id)::BIGINT as days_worked,
    COALESCE(AVG(t.total_hours), 0)::DECIMAL as avg_hours
  FROM profiles p
  LEFT JOIN time_logs t ON p.id = t.user_id 
    AND t.date >= p_start_date 
    AND t.date <= p_end_date
    AND t.clock_out IS NOT NULL
  WHERE p.role = 'employee' AND p.is_active = true
  GROUP BY p.id, p.full_name, p.email
  ORDER BY p.full_name;
END;
$$;


ALTER FUNCTION "public"."get_employees_summary"("p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_employees_summary"("p_start_date" "date", "p_end_date" "date") IS 'Retorna resumen de todos los empleados activos';



CREATE OR REPLACE FUNCTION "public"."get_monthly_report"("p_user_id" "uuid", "p_year" integer, "p_month" integer) RETURNS TABLE("total_hours" numeric, "days_worked" bigint, "avg_hours" numeric, "expected_hours" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_expected_hours DECIMAL;
BEGIN
  -- Calcular horas esperadas (8 horas × días laborables del mes)
  SELECT COUNT(*) * 8 INTO v_expected_hours
  FROM generate_series(
    make_date(p_year, p_month, 1),
    (make_date(p_year, p_month, 1) + INTERVAL '1 month - 1 day')::DATE,
    INTERVAL '1 day'
  ) AS d
  WHERE EXTRACT(DOW FROM d) NOT IN (0, 6); -- Excluir domingos (0) y sábados (6)
  
  RETURN QUERY
  SELECT 
    COALESCE(SUM(t.total_hours), 0)::DECIMAL as total_hours,
    COUNT(*)::BIGINT as days_worked,
    COALESCE(AVG(t.total_hours), 0)::DECIMAL as avg_hours,
    v_expected_hours
  FROM time_logs t
  WHERE t.user_id = p_user_id
    AND EXTRACT(YEAR FROM t.date) = p_year
    AND EXTRACT(MONTH FROM t.date) = p_month
    AND t.clock_out IS NOT NULL;
END;
$$;


ALTER FUNCTION "public"."get_monthly_report"("p_user_id" "uuid", "p_year" integer, "p_month" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_monthly_report"("p_user_id" "uuid", "p_year" integer, "p_month" integer) IS 'Retorna estadísticas mensuales para un empleado';



CREATE OR REPLACE FUNCTION "public"."get_week_stats"("p_user_id" "uuid") RETURNS TABLE("week_start" "date", "week_end" "date", "total_hours" numeric, "days_worked" bigint, "expected_hours" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_week_start DATE;
  v_week_end DATE;
BEGIN
  -- Semana empieza en lunes (ISO week)
  v_week_start := DATE_TRUNC('week', CURRENT_DATE)::DATE;
  v_week_end := (v_week_start + INTERVAL '6 days')::DATE;
  
  RETURN QUERY
  SELECT 
    v_week_start,
    v_week_end,
    COALESCE(SUM(t.total_hours), 0)::DECIMAL,
    COUNT(*)::BIGINT,
    (5 * 8)::DECIMAL  -- 5 días laborables × 8 horas
  FROM time_logs t
  WHERE t.user_id = p_user_id
    AND t.date >= v_week_start
    AND t.date <= v_week_end
    AND t.clock_out IS NOT NULL;
END;
$$;


ALTER FUNCTION "public"."get_week_stats"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_week_stats"("p_user_id" "uuid") IS 'Retorna estadísticas de la semana actual';



CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'employee'
  );
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_time_log_conflict"("p_user_id" "uuid", "p_date" "date", "p_is_official" boolean) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM time_logs
    WHERE user_id = p_user_id
      AND date = p_date
      AND is_official = p_is_official
  );
END;
$$;


ALTER FUNCTION "public"."has_time_log_conflict"("p_user_id" "uuid", "p_date" "date", "p_is_official" boolean) OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."time_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "clock_in" timestamp with time zone NOT NULL,
    "clock_out" timestamp with time zone,
    "total_hours" numeric(5,2),
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_official" boolean DEFAULT false,
    "is_manual" boolean DEFAULT false,
    "marked_by" "uuid",
    "record_type" "text" DEFAULT 'personal'::"text",
    "mediation_id" "uuid",
    "edited_by" "uuid",
    "edited_at" timestamp with time zone,
    "edit_reason" "text",
    CONSTRAINT "time_logs_record_type_check" CHECK (("record_type" = ANY (ARRAY['official'::"text", 'personal'::"text"]))),
    CONSTRAINT "valid_clock_out" CHECK ((("clock_out" IS NULL) OR ("clock_out" > "clock_in"))),
    CONSTRAINT "valid_total_hours" CHECK ((("total_hours" IS NULL) OR ("total_hours" >= (0)::numeric)))
);


ALTER TABLE "public"."time_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."time_logs" IS 'Registros de entrada/salida de empleados';



COMMENT ON COLUMN "public"."time_logs"."user_id" IS 'ID del usuario (FK a profiles)';



COMMENT ON COLUMN "public"."time_logs"."date" IS 'Fecha del registro (YYYY-MM-DD)';



COMMENT ON COLUMN "public"."time_logs"."clock_in" IS 'Hora de entrada';



COMMENT ON COLUMN "public"."time_logs"."clock_out" IS 'Hora de salida (NULL si aún no sale)';



COMMENT ON COLUMN "public"."time_logs"."total_hours" IS 'Total de horas calculado automáticamente';



COMMENT ON COLUMN "public"."time_logs"."is_official" IS 'FALSE = employee personal record, TRUE = admin official record';



COMMENT ON COLUMN "public"."time_logs"."is_manual" IS 'TRUE si fue ingresado manualmente por admin';



COMMENT ON COLUMN "public"."time_logs"."marked_by" IS 'ID del usuario que creó el registro';



CREATE OR REPLACE FUNCTION "public"."insert_official_time_logs"("time_logs_array" "jsonb") RETURNS SETOF "public"."time_logs"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
    ) ON CONFLICT (user_id, date, is_official) DO NOTHING
    RETURNING *;
  END LOOP;
  
  -- Reset admin import flag
  PERFORM set_config('app.is_admin_import', 'false', true);
  
  RETURN;
END;
$$;


ALTER FUNCTION "public"."insert_official_time_logs"("time_logs_array" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_record_type"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.is_official = true THEN
    NEW.record_type := 'official';
  ELSE
    NEW.record_type := 'personal';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_record_type"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_time_log_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  is_admin_import BOOLEAN;
BEGIN
  -- Check if this is an admin import (set by the import function)
  is_admin_import := COALESCE(current_setting('app.is_admin_import', true)::BOOLEAN, false);
  
  -- Check that employees don't try to create official records
  -- Skip this check if is_admin_import is true (admin import bypass)
  IF NEW.is_official = true AND NOT is_admin_import THEN
    IF NOT EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = COALESCE(auth.uid(), NEW.marked_by)
      AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Only administrators can create official records';
    END IF;
  END IF;
  
  -- Check that a duplicate doesn't exist
  IF EXISTS (
    SELECT 1 FROM time_logs
    WHERE user_id = NEW.user_id
      AND date = NEW.date
      AND is_official = NEW.is_official
      AND (TG_OP = 'INSERT' OR id != NEW.id)
  ) THEN
    RAISE EXCEPTION 'A % record already exists for this date',
      CASE WHEN NEW.is_official THEN 'official' ELSE 'personal' END;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."validate_time_log_insert"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."mediations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "admin_time_log_id" "uuid",
    "employee_time_log_id" "uuid",
    "admin_clock_in_snap" timestamp with time zone,
    "admin_clock_out_snap" timestamp with time zone,
    "admin_total_hours_snap" numeric(5,2),
    "employee_clock_in_snap" timestamp with time zone,
    "employee_clock_out_snap" timestamp with time zone,
    "employee_total_hours_snap" numeric(5,2),
    "proposed_clock_in" timestamp with time zone,
    "proposed_clock_out" timestamp with time zone,
    "proposed_total_hours" numeric(5,2),
    "proposed_by" "uuid",
    "proposed_at" timestamp with time zone,
    "counter_clock_in" timestamp with time zone,
    "counter_clock_out" timestamp with time zone,
    "counter_total_hours" numeric(5,2),
    "counter_by" "uuid",
    "counter_at" timestamp with time zone,
    "initial_reason" "text" NOT NULL,
    "status" "public"."mediation_status" DEFAULT 'pending_review'::"public"."mediation_status" NOT NULL,
    "notes" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "resolved_at" timestamp with time zone,
    "resolved_by" "uuid",
    "admin_last_activity_at" timestamp with time zone,
    "employee_last_activity_at" timestamp with time zone,
    "last_activity_by" "uuid",
    "resolution_notes" "text",
    "deleted_at" timestamp with time zone,
    "deleted_by" "uuid",
    "is_active" boolean DEFAULT true,
    CONSTRAINT "valid_counter_hours" CHECK ((("counter_total_hours" IS NULL) OR ("counter_total_hours" >= (0)::numeric))),
    CONSTRAINT "valid_dates" CHECK (("date" <= CURRENT_DATE)),
    CONSTRAINT "valid_proposed_hours" CHECK ((("proposed_total_hours" IS NULL) OR ("proposed_total_hours" >= (0)::numeric)))
);


ALTER TABLE "public"."mediations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "full_name" "text" NOT NULL,
    "role" "text" DEFAULT 'employee'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true,
    "email" "text",
    "invitation_status" character varying(20) DEFAULT 'pending'::character varying,
    "invitation_sent_at" timestamp with time zone,
    "registered_at" timestamp with time zone,
    CONSTRAINT "check_is_active" CHECK (("is_active" = ANY (ARRAY[true, false]))),
    CONSTRAINT "profiles_invitation_status_check" CHECK ((("invitation_status")::"text" = ANY ((ARRAY['pending'::character varying, 'invited'::character varying, 'active'::character varying])::"text"[]))),
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['employee'::"text", 'admin'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."active_mediations_view" AS
 SELECT "m"."id",
    "m"."employee_id",
    "m"."date",
    "m"."admin_time_log_id",
    "m"."employee_time_log_id",
    "m"."admin_clock_in_snap",
    "m"."admin_clock_out_snap",
    "m"."admin_total_hours_snap",
    "m"."employee_clock_in_snap",
    "m"."employee_clock_out_snap",
    "m"."employee_total_hours_snap",
    "m"."proposed_clock_in",
    "m"."proposed_clock_out",
    "m"."proposed_total_hours",
    "m"."proposed_by",
    "m"."proposed_at",
    "m"."counter_clock_in",
    "m"."counter_clock_out",
    "m"."counter_total_hours",
    "m"."counter_by",
    "m"."counter_at",
    "m"."initial_reason",
    "m"."status",
    "m"."notes",
    "m"."created_at",
    "m"."updated_at",
    "m"."resolved_at",
    "m"."resolved_by",
    "m"."admin_last_activity_at",
    "m"."employee_last_activity_at",
    "m"."last_activity_by",
    "m"."resolution_notes",
    "m"."deleted_at",
    "m"."deleted_by",
    "m"."is_active",
    "p"."full_name" AS "employee_name",
    "p"."email" AS "employee_email",
    "admin_log"."clock_in" AS "admin_current_clock_in",
    "admin_log"."clock_out" AS "admin_current_clock_out",
    "admin_log"."total_hours" AS "admin_current_total_hours",
    "employee_log"."clock_in" AS "employee_current_clock_in",
    "employee_log"."clock_out" AS "employee_current_clock_out",
    "employee_log"."total_hours" AS "employee_current_total_hours",
    (EXTRACT(epoch FROM ("now"() - GREATEST(COALESCE("m"."admin_last_activity_at", "m"."created_at"), COALESCE("m"."employee_last_activity_at", "m"."created_at")))) > (172800)::numeric) AS "is_stale",
    GREATEST(COALESCE("m"."admin_last_activity_at", "m"."created_at"), COALESCE("m"."employee_last_activity_at", "m"."created_at")) AS "last_activity_at",
        CASE
            WHEN (("admin_log"."clock_in" IS NOT NULL) AND ("employee_log"."clock_in" IS NOT NULL)) THEN (EXTRACT(epoch FROM ("admin_log"."clock_in" - "employee_log"."clock_in")) / (60)::numeric)
            ELSE NULL::numeric
        END AS "clock_in_diff_minutes",
        CASE
            WHEN (("admin_log"."clock_out" IS NOT NULL) AND ("employee_log"."clock_out" IS NOT NULL)) THEN (EXTRACT(epoch FROM ("admin_log"."clock_out" - "employee_log"."clock_out")) / (60)::numeric)
            ELSE NULL::numeric
        END AS "clock_out_diff_minutes",
        CASE
            WHEN (("admin_log"."total_hours" IS NOT NULL) AND ("employee_log"."total_hours" IS NOT NULL)) THEN ("admin_log"."total_hours" - "employee_log"."total_hours")
            ELSE NULL::numeric
        END AS "hours_diff"
   FROM ((("public"."mediations" "m"
     LEFT JOIN "public"."profiles" "p" ON (("m"."employee_id" = "p"."id")))
     LEFT JOIN "public"."time_logs" "admin_log" ON (("m"."admin_time_log_id" = "admin_log"."id")))
     LEFT JOIN "public"."time_logs" "employee_log" ON (("m"."employee_time_log_id" = "employee_log"."id")))
  WHERE (("m"."is_active" = true) AND ("m"."status" = ANY (ARRAY['pending_review'::"public"."mediation_status", 'in_discussion'::"public"."mediation_status", 'agreement_reached'::"public"."mediation_status"])));


ALTER VIEW "public"."active_mediations_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."disputes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "date" "date" NOT NULL,
    "admin_clock_in" timestamp with time zone,
    "admin_clock_out" timestamp with time zone,
    "admin_total_hours" numeric,
    "employee_clock_in" timestamp with time zone,
    "employee_clock_out" timestamp with time zone,
    "employee_total_hours" numeric,
    "reason" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "resolved_at" timestamp with time zone,
    "resolution_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "personal_time_log_id" "uuid",
    "official_time_log_id" "uuid",
    CONSTRAINT "disputes_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'resolved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."disputes" OWNER TO "postgres";


COMMENT ON TABLE "public"."disputes" IS 'Disputas entre registros de admin y empleado';



COMMENT ON COLUMN "public"."disputes"."employee_id" IS 'ID del empleado que creó la disputa';



COMMENT ON COLUMN "public"."disputes"."status" IS 'Estado: pending, resolved, rejected';



ALTER TABLE ONLY "public"."disputes"
    ADD CONSTRAINT "disputes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."mediations"
    ADD CONSTRAINT "mediations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."time_logs"
    ADD CONSTRAINT "time_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."time_logs"
    ADD CONSTRAINT "time_logs_user_date_official_unique" UNIQUE ("user_id", "date", "is_official");



COMMENT ON CONSTRAINT "time_logs_user_date_official_unique" ON "public"."time_logs" IS 'Allows maximum 1 personal and 1 official record per date per user';



CREATE INDEX "idx_disputes_date" ON "public"."disputes" USING "btree" ("date");



CREATE INDEX "idx_disputes_employee_date" ON "public"."disputes" USING "btree" ("employee_id", "date");



CREATE INDEX "idx_disputes_employee_id" ON "public"."disputes" USING "btree" ("employee_id");



CREATE INDEX "idx_disputes_official_log" ON "public"."disputes" USING "btree" ("official_time_log_id");



CREATE INDEX "idx_disputes_personal_log" ON "public"."disputes" USING "btree" ("personal_time_log_id");



CREATE INDEX "idx_disputes_status" ON "public"."disputes" USING "btree" ("status");



CREATE INDEX "idx_disputes_status_created" ON "public"."disputes" USING "btree" ("status", "created_at" DESC);



CREATE INDEX "idx_mediations_active" ON "public"."mediations" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_mediations_created_at" ON "public"."mediations" USING "btree" ("created_at");



CREATE INDEX "idx_mediations_date" ON "public"."mediations" USING "btree" ("date");



CREATE INDEX "idx_mediations_employee_date" ON "public"."mediations" USING "btree" ("employee_id", "date");



CREATE INDEX "idx_mediations_employee_id" ON "public"."mediations" USING "btree" ("employee_id");



CREATE INDEX "idx_mediations_notes" ON "public"."mediations" USING "gin" ("notes");



CREATE INDEX "idx_mediations_status" ON "public"."mediations" USING "btree" ("status");



CREATE INDEX "idx_profiles_active_employees" ON "public"."profiles" USING "btree" ("id", "full_name") WHERE (("role" = 'employee'::"text") AND ("is_active" = true));



CREATE INDEX "idx_profiles_email" ON "public"."profiles" USING "btree" ("email");



CREATE UNIQUE INDEX "idx_profiles_email_unique" ON "public"."profiles" USING "btree" ("email") WHERE ("email" IS NOT NULL);



CREATE INDEX "idx_profiles_invitation_status" ON "public"."profiles" USING "btree" ("invitation_status");



CREATE INDEX "idx_profiles_is_active" ON "public"."profiles" USING "btree" ("is_active");



CREATE INDEX "idx_profiles_role" ON "public"."profiles" USING "btree" ("role");



CREATE INDEX "idx_time_logs_date" ON "public"."time_logs" USING "btree" ("date");



CREATE INDEX "idx_time_logs_date_user" ON "public"."time_logs" USING "btree" ("date" DESC, "user_id");



CREATE INDEX "idx_time_logs_is_official" ON "public"."time_logs" USING "btree" ("is_official");



CREATE INDEX "idx_time_logs_marked_by" ON "public"."time_logs" USING "btree" ("marked_by");



CREATE INDEX "idx_time_logs_mediation" ON "public"."time_logs" USING "btree" ("mediation_id") WHERE ("mediation_id" IS NOT NULL);



CREATE INDEX "idx_time_logs_official" ON "public"."time_logs" USING "btree" ("user_id", "date") WHERE ("is_official" = true);



CREATE INDEX "idx_time_logs_official_only" ON "public"."time_logs" USING "btree" ("user_id", "date") WHERE ("is_official" = true);



CREATE INDEX "idx_time_logs_pending" ON "public"."time_logs" USING "btree" ("user_id", "date") WHERE ("clock_out" IS NULL);



CREATE INDEX "idx_time_logs_personal_only" ON "public"."time_logs" USING "btree" ("user_id", "date") WHERE ("is_official" = false);



CREATE INDEX "idx_time_logs_record_type" ON "public"."time_logs" USING "btree" ("record_type");



CREATE INDEX "idx_time_logs_user_date" ON "public"."time_logs" USING "btree" ("user_id", "date");



CREATE INDEX "idx_time_logs_user_date_official" ON "public"."time_logs" USING "btree" ("user_id", "date", "is_official");



CREATE INDEX "idx_time_logs_user_id" ON "public"."time_logs" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "auto_mediation_trigger" AFTER INSERT ON "public"."time_logs" FOR EACH ROW EXECUTE FUNCTION "public"."check_and_create_mediation"();



CREATE OR REPLACE TRIGGER "auto_mediation_update_trigger" AFTER UPDATE ON "public"."time_logs" FOR EACH ROW WHEN ((("old"."clock_in" IS DISTINCT FROM "new"."clock_in") OR ("old"."clock_out" IS DISTINCT FROM "new"."clock_out") OR ("old"."total_hours" IS DISTINCT FROM "new"."total_hours"))) EXECUTE FUNCTION "public"."check_and_create_mediation"();



CREATE OR REPLACE TRIGGER "trigger_calculate_total_hours" BEFORE INSERT OR UPDATE OF "clock_in", "clock_out" ON "public"."time_logs" FOR EACH ROW EXECUTE FUNCTION "public"."calculate_total_hours"();



CREATE OR REPLACE TRIGGER "update_disputes_updated_at" BEFORE UPDATE ON "public"."disputes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_mediations_updated_at" BEFORE UPDATE ON "public"."mediations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_time_logs_record_type" BEFORE INSERT OR UPDATE OF "is_official" ON "public"."time_logs" FOR EACH ROW EXECUTE FUNCTION "public"."update_record_type"();



CREATE OR REPLACE TRIGGER "update_time_logs_updated_at" BEFORE UPDATE ON "public"."time_logs" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "validate_time_log_insert_trigger" BEFORE INSERT OR UPDATE ON "public"."time_logs" FOR EACH ROW EXECUTE FUNCTION "public"."validate_time_log_insert"();



ALTER TABLE ONLY "public"."disputes"
    ADD CONSTRAINT "disputes_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."disputes"
    ADD CONSTRAINT "disputes_official_time_log_id_fkey" FOREIGN KEY ("official_time_log_id") REFERENCES "public"."time_logs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."disputes"
    ADD CONSTRAINT "disputes_personal_time_log_id_fkey" FOREIGN KEY ("personal_time_log_id") REFERENCES "public"."time_logs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."mediations"
    ADD CONSTRAINT "mediations_admin_time_log_id_fkey" FOREIGN KEY ("admin_time_log_id") REFERENCES "public"."time_logs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."mediations"
    ADD CONSTRAINT "mediations_counter_by_fkey" FOREIGN KEY ("counter_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."mediations"
    ADD CONSTRAINT "mediations_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."mediations"
    ADD CONSTRAINT "mediations_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mediations"
    ADD CONSTRAINT "mediations_employee_time_log_id_fkey" FOREIGN KEY ("employee_time_log_id") REFERENCES "public"."time_logs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."mediations"
    ADD CONSTRAINT "mediations_last_activity_by_fkey" FOREIGN KEY ("last_activity_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."mediations"
    ADD CONSTRAINT "mediations_proposed_by_fkey" FOREIGN KEY ("proposed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."mediations"
    ADD CONSTRAINT "mediations_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."time_logs"
    ADD CONSTRAINT "time_logs_edited_by_fkey" FOREIGN KEY ("edited_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."time_logs"
    ADD CONSTRAINT "time_logs_marked_by_fkey" FOREIGN KEY ("marked_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."time_logs"
    ADD CONSTRAINT "time_logs_mediation_id_fkey" FOREIGN KEY ("mediation_id") REFERENCES "public"."mediations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."time_logs"
    ADD CONSTRAINT "time_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can create any time log" ON "public"."time_logs" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can create any time_log" ON "public"."time_logs" FOR INSERT WITH CHECK ("public"."is_admin"());



CREATE POLICY "Admins can create mediations" ON "public"."mediations" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can delete any dispute" ON "public"."disputes" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can delete time logs" ON "public"."time_logs" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can delete time_logs" ON "public"."time_logs" FOR DELETE USING ("public"."is_admin"());



CREATE POLICY "Admins can update any profile" ON "public"."profiles" FOR UPDATE USING ("public"."is_admin"());



CREATE POLICY "Admins can update any time log" ON "public"."time_logs" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can update any time_log" ON "public"."time_logs" FOR UPDATE USING ("public"."is_admin"());



CREATE POLICY "Admins can update disputes" ON "public"."disputes" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view all disputes" ON "public"."disputes" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "Admins can view all mediations" ON "public"."mediations" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view all profiles" ON "public"."profiles" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "Admins can view all time logs" ON "public"."time_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view all time_logs" ON "public"."time_logs" FOR SELECT USING ("public"."is_admin"());



CREATE POLICY "Employees can create disputes" ON "public"."disputes" FOR INSERT WITH CHECK (("auth"."uid"() = "employee_id"));



CREATE POLICY "Employees can create mediations" ON "public"."mediations" FOR INSERT WITH CHECK (("auth"."uid"() = "employee_id"));



CREATE POLICY "Employees can create own disputes" ON "public"."disputes" FOR INSERT WITH CHECK ((("auth"."uid"() = "employee_id") AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_active" = true))))));



CREATE POLICY "Employees can create personal time logs" ON "public"."time_logs" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND ("is_official" = false) AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."is_active" = true) OR ("profiles"."is_active" IS NULL)))))));



CREATE POLICY "Employees can delete own non-official time logs" ON "public"."time_logs" FOR DELETE USING ((("auth"."uid"() = "user_id") AND ("is_official" = false)));



CREATE POLICY "Employees can delete own pending disputes" ON "public"."disputes" FOR DELETE USING ((("auth"."uid"() = "employee_id") AND ("status" = 'pending'::"text")));



CREATE POLICY "Employees can update dispute time log references" ON "public"."disputes" FOR UPDATE USING ((("auth"."uid"() = "employee_id") AND ("status" = 'pending'::"text"))) WITH CHECK ((("auth"."uid"() = "employee_id") AND ("status" = 'pending'::"text")));



CREATE POLICY "Employees can update own personal logs" ON "public"."time_logs" FOR UPDATE USING ((("auth"."uid"() = "user_id") AND ("is_official" = false) AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."is_active" = true) OR ("profiles"."is_active" IS NULL))))))) WITH CHECK ((("auth"."uid"() = "user_id") AND ("is_official" = false)));



CREATE POLICY "Employees can view own disputes" ON "public"."disputes" FOR SELECT USING ((("auth"."uid"() = "employee_id") AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_active" = true))))));



CREATE POLICY "Employees can view own mediations" ON "public"."mediations" FOR SELECT USING (("auth"."uid"() = "employee_id"));



CREATE POLICY "Employees can view own time logs" ON "public"."time_logs" FOR SELECT USING ((("auth"."uid"() = "user_id") AND (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."is_active" = true) OR ("profiles"."is_active" IS NULL)))))));



CREATE POLICY "Employees cannot delete logs" ON "public"."time_logs" FOR DELETE USING (false);



CREATE POLICY "Participants can delete mediations" ON "public"."mediations" FOR DELETE USING (((("auth"."uid"() = "employee_id") AND ("status" = ANY (ARRAY['pending_review'::"public"."mediation_status", 'in_discussion'::"public"."mediation_status"]))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))));



CREATE POLICY "Participants can update mediations" ON "public"."mediations" FOR UPDATE USING ((("auth"."uid"() = "employee_id") OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))));



CREATE POLICY "Users can insert own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING ((("auth"."uid"() = "id") OR "public"."is_admin"()));



ALTER TABLE "public"."disputes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mediations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."time_logs" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."calculate_total_hours"() TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_total_hours"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_total_hours"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_and_create_mediation"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_and_create_mediation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_and_create_mediation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_employees_summary"("p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_employees_summary"("p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_employees_summary"("p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_monthly_report"("p_user_id" "uuid", "p_year" integer, "p_month" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_monthly_report"("p_user_id" "uuid", "p_year" integer, "p_month" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_monthly_report"("p_user_id" "uuid", "p_year" integer, "p_month" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_week_stats"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_week_stats"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_week_stats"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_time_log_conflict"("p_user_id" "uuid", "p_date" "date", "p_is_official" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."has_time_log_conflict"("p_user_id" "uuid", "p_date" "date", "p_is_official" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_time_log_conflict"("p_user_id" "uuid", "p_date" "date", "p_is_official" boolean) TO "service_role";



GRANT ALL ON TABLE "public"."time_logs" TO "anon";
GRANT ALL ON TABLE "public"."time_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."time_logs" TO "service_role";



GRANT ALL ON FUNCTION "public"."insert_official_time_logs"("time_logs_array" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."insert_official_time_logs"("time_logs_array" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."insert_official_time_logs"("time_logs_array" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_record_type"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_record_type"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_record_type"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_time_log_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_time_log_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_time_log_insert"() TO "service_role";


















GRANT ALL ON TABLE "public"."mediations" TO "anon";
GRANT ALL ON TABLE "public"."mediations" TO "authenticated";
GRANT ALL ON TABLE "public"."mediations" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."active_mediations_view" TO "anon";
GRANT ALL ON TABLE "public"."active_mediations_view" TO "authenticated";
GRANT ALL ON TABLE "public"."active_mediations_view" TO "service_role";



GRANT ALL ON TABLE "public"."disputes" TO "anon";
GRANT ALL ON TABLE "public"."disputes" TO "authenticated";
GRANT ALL ON TABLE "public"."disputes" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";
































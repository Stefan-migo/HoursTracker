-- Migration: 007_fixes_and_optimizations
-- Optimizaciones de performance, constraints y funciones auxiliares

-- ============================================
-- 1. CONSTRAINTS DE UNICIDAD
-- ============================================

-- Verificar si existen duplicados antes de agregar constraint
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT user_id, date
    FROM time_logs
    GROUP BY user_id, date
    HAVING COUNT(*) > 1
  ) dups;
  
  IF duplicate_count > 0 THEN
    RAISE NOTICE 'ADVERTENCIA: Existen % registros duplicados en time_logs (mismo usuario, misma fecha).', duplicate_count;
    RAISE NOTICE 'Se recomienda ejecutar la siguiente query para limpiarlos antes de aplicar esta migración:';
    RAISE NOTICE 'DELETE FROM time_logs a USING time_logs b WHERE a.user_id = b.user_id AND a.date = b.date AND a.id < b.id;';
  END IF;
END $$;

-- Agregar constraint UNIQUE para evitar duplicados
-- Usamos un nombre específico para evitar conflictos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'time_logs_user_id_date_unique' 
    AND table_name = 'time_logs'
  ) THEN
    ALTER TABLE time_logs 
    ADD CONSTRAINT time_logs_user_id_date_unique 
    UNIQUE (user_id, date);
  END IF;
END $$;

-- ============================================
-- 2. ÍNDICES DE PERFORMANCE
-- ============================================

-- Índice para entradas pendientes (sin clock_out)
CREATE INDEX IF NOT EXISTS idx_time_logs_pending 
ON time_logs(user_id, date) 
WHERE clock_out IS NULL;

-- Índice para reportes por rango de fechas (más eficiente para ORDER BY date)
CREATE INDEX IF NOT EXISTS idx_time_logs_date_user 
ON time_logs(date DESC, user_id);

-- Índice para registros oficiales
CREATE INDEX IF NOT EXISTS idx_time_logs_official 
ON time_logs(user_id, date) 
WHERE is_official = true;

-- Índice para disputes por estado (para dashboards)
CREATE INDEX IF NOT EXISTS idx_disputes_status_created 
ON disputes(status, created_at DESC);

-- Índice para perfiles de empleados activos
CREATE INDEX IF NOT EXISTS idx_profiles_active_employees 
ON profiles(id, full_name) 
WHERE role = 'employee' AND is_active = true;

-- Índice compuesto para búsquedas por email
CREATE INDEX IF NOT EXISTS idx_profiles_email 
ON profiles(email);

-- ============================================
-- 3. TRIGGER PARA CÁLCULO AUTOMÁTICO DE HORAS
-- ============================================

-- Función para calcular total_hours automáticamente
CREATE OR REPLACE FUNCTION calculate_total_hours()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Aplicar trigger a time_logs
DROP TRIGGER IF EXISTS trigger_calculate_total_hours ON time_logs;
CREATE TRIGGER trigger_calculate_total_hours
  BEFORE INSERT OR UPDATE OF clock_in, clock_out ON time_logs
  FOR EACH ROW
  EXECUTE FUNCTION calculate_total_hours();

-- ============================================
-- 4. FUNCIÓN RPC PARA REPORTES MENSUALES
-- ============================================

CREATE OR REPLACE FUNCTION get_monthly_report(
  p_user_id UUID,
  p_year INTEGER,
  p_month INTEGER
)
RETURNS TABLE (
  total_hours DECIMAL,
  days_worked BIGINT,
  avg_hours DECIMAL,
  expected_hours DECIMAL
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. FUNCIÓN RPC PARA ESTADÍSTICAS SEMANALES
-- ============================================

CREATE OR REPLACE FUNCTION get_week_stats(p_user_id UUID)
RETURNS TABLE (
  week_start DATE,
  week_end DATE,
  total_hours DECIMAL,
  days_worked BIGINT,
  expected_hours DECIMAL
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. FUNCIÓN PARA RESUMEN DE EMPLEADOS
-- ============================================

CREATE OR REPLACE FUNCTION get_employees_summary(
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  email TEXT,
  total_hours DECIMAL,
  days_worked BIGINT,
  avg_hours DECIMAL
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. OPTIMIZAR POLÍTICAS RLS CON is_admin()
-- ============================================

-- Asegurar que is_admin() existe (ya creado en migración 003)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Actualizar políticas de time_logs para usar is_admin()
DROP POLICY IF EXISTS "Admins can view all time_logs" ON time_logs;
CREATE POLICY "Admins can view all time_logs"
  ON time_logs FOR SELECT
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can create any time_log" ON time_logs;
CREATE POLICY "Admins can create any time_log"
  ON time_logs FOR INSERT
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can update any time_log" ON time_logs;
CREATE POLICY "Admins can update any time_log"
  ON time_logs FOR UPDATE
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can delete time_logs" ON time_logs;
CREATE POLICY "Admins can delete time_logs"
  ON time_logs FOR DELETE
  USING (is_admin());

-- ============================================
-- 8. POLÍTICAS RLS PARA DISPUTES
-- ============================================

-- Verificar que RLS está habilitado
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

-- Admins pueden ver todas las disputes
DROP POLICY IF EXISTS "Admins can view all disputes" ON disputes;
CREATE POLICY "Admins can view all disputes"
  ON disputes FOR SELECT
  USING (is_admin());

-- Admins pueden actualizar disputes
DROP POLICY IF EXISTS "Admins can update disputes" ON disputes;
CREATE POLICY "Admins can update disputes"
  ON disputes FOR UPDATE
  USING (is_admin());

-- Empleados pueden ver sus propias disputes (solo si están activos)
DROP POLICY IF EXISTS "Employees can view own disputes" ON disputes;
CREATE POLICY "Employees can view own disputes"
  ON disputes FOR SELECT
  USING (
    auth.uid() = employee_id 
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- Empleados pueden crear disputes para sí mismos
DROP POLICY IF EXISTS "Employees can create own disputes" ON disputes;
CREATE POLICY "Employees can create own disputes"
  ON disputes FOR INSERT
  WITH CHECK (
    auth.uid() = employee_id
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND is_active = true
    )
  );

-- ============================================
-- 9. COMENTARIOS DE DOCUMENTACIÓN
-- ============================================

COMMENT ON TABLE time_logs IS 'Registros de entrada/salida de empleados';
COMMENT ON COLUMN time_logs.user_id IS 'ID del usuario (FK a profiles)';
COMMENT ON COLUMN time_logs.date IS 'Fecha del registro (YYYY-MM-DD)';
COMMENT ON COLUMN time_logs.clock_in IS 'Hora de entrada';
COMMENT ON COLUMN time_logs.clock_out IS 'Hora de salida (NULL si aún no sale)';
COMMENT ON COLUMN time_logs.total_hours IS 'Total de horas calculado automáticamente';
COMMENT ON COLUMN time_logs.is_manual IS 'TRUE si fue ingresado manualmente por admin';
COMMENT ON COLUMN time_logs.is_official IS 'TRUE si es el registro oficial (admin marcó)';
COMMENT ON COLUMN time_logs.marked_by IS 'ID del usuario que creó el registro';

COMMENT ON TABLE disputes IS 'Disputas entre registros de admin y empleado';
COMMENT ON COLUMN disputes.employee_id IS 'ID del empleado que creó la disputa';
COMMENT ON COLUMN disputes.status IS 'Estado: pending, resolved, rejected';

COMMENT ON FUNCTION get_monthly_report IS 'Retorna estadísticas mensuales para un empleado';
COMMENT ON FUNCTION get_week_stats IS 'Retorna estadísticas de la semana actual';
COMMENT ON FUNCTION get_employees_summary IS 'Retorna resumen de todos los empleados activos';

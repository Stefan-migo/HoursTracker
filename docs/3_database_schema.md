# Database Schema Document
## HoursTracker - Esquema de Supabase PostgreSQL

---

## 1. Esquema de Base de Datos

### 1.1 Diagrama ER Simplificado
```
┌─────────────────┐       ┌─────────────────┐
│   auth.users    │       │    profiles     │
├─────────────────┤       ├─────────────────┤
│ id (uuid, PK)   │──────<│ id (uuid, FK)   │
│ email           │       │ full_name       │
│ created_at      │       │ role            │
└─────────────────┘       │ created_at      │
                          └────────┬────────┘
                                   │
                                   │
                          ┌────────▼────────┐
                          │    time_logs    │
                          ├─────────────────┤
                          │ id (uuid, PK)   │
                          │ user_id (uuid)  │
                          │ date (date)     │
                          │ clock_in        │
                          │ clock_out       │
                          │ total_hours     │
                          │ created_at      │
                          └─────────────────┘
```

---

## 2. Tabla: profiles

### 2.1 Definición
```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('employee', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.2 Descripción de Columnas
| Columna | Tipo | Constraints | Descripción |
|---------|------|-------------|-------------|
| id | UUID | PK, FK → auth.users | Identificador único,linked to auth |
| full_name | TEXT | NOT NULL | Nombre completo del usuario |
| role | TEXT | NOT NULL, DEFAULT 'employee' | Rol del usuario: 'employee' o 'admin' |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Timestamp de creación |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Timestamp de última actualización |

### 2.3 Índices
```sql
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_email ON profiles(email); -- Si se añade columna email
```

### 2.4 Trigger para actualizar updated_at
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## 3. Tabla: time_logs

### 3.1 Definición
```sql
CREATE TABLE time_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  clock_in TIMESTAMPTZ NOT NULL,
  clock_out TIMESTAMPTZ,
  total_hours DECIMAL(5,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_clock_out CHECK (
    clock_out IS NULL OR clock_out > clock_in
  ),
  CONSTRAINT valid_total_hours CHECK (
    total_hours IS NULL OR total_hours >= 0
  ),
  CONSTRAINT valid_date CHECK (
    date >= '2020-01-01' AND date <= CURRENT_DATE + INTERVAL '1 day'
  )
);
```

### 3.2 Descripción de Columnas
| Columna | Tipo | Constraints | Descripción |
|---------|------|-------------|-------------|
| id | UUID | PK | Identificador único del registro |
| user_id | UUID | FK → profiles | Usuario al que pertenece el registro |
| date | DATE | NOT NULL | Fecha del registro (YYYY-MM-DD) |
| clock_in | TIMESTAMPTZ | NOT NULL | Timestamp de entrada |
| clock_out | TIMESTAMPTZ | NULL | Timestamp de salida |
| total_hours | DECIMAL(5,2) | NULL | Horas totales trabajadas |
| notes | TEXT | NULL | Notas opcionales |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Timestamp de creación |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Timestamp de actualización |

### 3.3 Índices
```sql
-- Índice para búsqueda por usuario
CREATE INDEX idx_time_logs_user_id ON time_logs(user_id);

-- Índice para búsqueda por fecha
CREATE INDEX idx_time_logs_date ON time_logs(date);

-- Índice compuesto para búsqueda frecuente (usuario + fecha)
CREATE INDEX idx_time_logs_user_date ON time_logs(user_id, date);

-- Índice para encontrar entradas sin salida
CREATE INDEX idx_time_logs_pending_out ON time_logs(user_id, date) 
  WHERE clock_out IS NULL;
```

### 3.4 Trigger para actualizar updated_at
```sql
CREATE TRIGGER update_time_logs_updated_at
  BEFORE UPDATE ON time_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 3.5 Trigger para calcular total_hours automáticamente
```sql
CREATE OR REPLACE FUNCTION calculate_total_hours()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.clock_out IS NOT NULL AND NEW.clock_in IS NOT NULL THEN
    NEW.total_hours := EXTRACT(EPOCH FROM (NEW.clock_out - NEW.clock_in)) / 3600;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_total_hours
  BEFORE INSERT OR UPDATE OF clock_in, clock_out ON time_logs
  FOR EACH ROW
  EXECUTE FUNCTION calculate_total_hours();
```

---

## 4. Row Level Security (RLS)

### 4.1 Habilitar RLS
```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;
```

### 4.2 Políticas para tabla: profiles

#### Política: Usuarios pueden ver su propio perfil
```sql
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  USING (auth.uid() = id);
```

#### Política: Usuarios pueden actualizar su propio perfil (excepto role)
```sql
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
```

#### Política: Admins pueden ver todos los perfiles
```sql
CREATE POLICY "Admins can view all profiles"
  ON profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );
```

#### Política: Admins pueden actualizar cualquier perfil
```sql
CREATE POLICY "Admins can update any profile"
  ON profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );
```

#### Política: Solo el sistema puede insertar perfiles (via trigger)
```sql
CREATE POLICY "System can insert profiles"
  ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);
```

#### Política: Admins pueden insertar perfiles
```sql
CREATE POLICY "Admins can insert profiles"
  ON profiles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );
```

---

### 4.3 Políticas para tabla: time_logs

#### Política: Empleados pueden ver sus propios registros
```sql
CREATE POLICY "Employees can view own time logs"
  ON time_logs
  FOR SELECT
  USING (auth.uid() = user_id);
```

#### Política: Empleados pueden crear sus propios registros
```sql
CREATE POLICY "Employees can create own time logs"
  ON time_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

#### Política: Empleados pueden actualizar sus propios registros
```sql
CREATE POLICY "Employees can update own time logs"
  ON time_logs
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

#### Política: Empleados NO pueden eliminar registros
```sql
CREATE POLICY "No delete for employees"
  ON time_logs
  FOR DELETE
  USING (false); -- Nadie puede eliminar
```

#### Política: Admins pueden ver todos los registros
```sql
CREATE POLICY "Admins can view all time logs"
  ON time_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );
```

#### Política: Admins pueden crear cualquier registro
```sql
CREATE POLICY "Admins can create any time log"
  ON time_logs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );
```

#### Política: Admins pueden actualizar cualquier registro
```sql
CREATE POLICY "Admins can update any time log"
  ON time_logs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );
```

#### Política: Admins pueden eliminar registros (bulk delete)
```sql
CREATE POLICY "Admins can delete time logs"
  ON time_logs
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );
```

---

## 5. Funciones y Vistas Útiles

### 5.1 Función: Obtener registro de hoy para usuario
```sql
CREATE OR REPLACE FUNCTION get_today_log(p_user_id UUID)
RETURNS time_logs AS $$
  SELECT * FROM time_logs
  WHERE user_id = p_user_id
  AND date = CURRENT_DATE;
$$ LANGUAGE SQL SECURITY DEFINER;
```

### 5.2 Función: Obtener horas de la semana para usuario
```sql
CREATE OR REPLACE FUNCTION get_week_hours(p_user_id UUID)
RETURNS TABLE (
  total_hours DECIMAL,
  days_worked INT,
  week_start DATE,
  week_end DATE
) AS $$
  SELECT 
    COALESCE(SUM(total_hours), 0)::DECIMAL as total_hours,
    COUNT(*)::INT as days_worked,
    DATE_TRUNC('week', CURRENT_DATE)::DATE as week_start,
    (DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days')::DATE as week_end
  FROM time_logs
  WHERE user_id = p_user_id
  AND date >= DATE_TRUNC('week', CURRENT_DATE)
  AND date <= DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '6 days';
$$ LANGUAGE SQL SECURITY DEFINER;
```

### 5.3 Vista: Resumen de horas por empleado (para admins)
```sql
CREATE OR REPLACE VIEW employee_hours_summary AS
SELECT 
  p.id as user_id,
  p.full_name,
  p.role,
  COALESCE(SUM(t.total_hours), 0)::DECIMAL as total_hours,
  COUNT(t.id)::INT as days_worked,
  DATE_TRUNC('week', CURRENT_DATE)::DATE as week_start
FROM profiles p
LEFT JOIN time_logs t ON p.id = t.user_id
  AND t.date >= DATE_TRUNC('week', CURRENT_DATE)
  AND t.date <= CURRENT_DATE
WHERE p.role = 'employee'
GROUP BY p.id, p.full_name, p.role
ORDER BY p.full_name;
```

### 5.4 Función: Verificar si usuario tiene entrada sin salida
```sql
CREATE OR REPLACE FUNCTION has_pending_clock_out(p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM time_logs
    WHERE user_id = p_user_id
    AND date = CURRENT_DATE
    AND clock_out IS NULL
  );
$$ LANGUAGE SQL SECURITY DEFINER;
```

---

## 6. Seed Data (Datos de Prueba)

### 6.1 Script de seeding completo
```sql
-- Nota: Ejecutar después de crear usuarios en Supabase Auth

-- Perfil de empleado
INSERT INTO profiles (id, full_name, role)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Juan Pérez', 'employee'),
  ('22222222-2222-2222-2222-222222222222', 'María García', 'employee');

-- Perfil de admin
INSERT INTO profiles (id, full_name, role)
VALUES 
  ('33333333-3333-3333-3333-333333333333', 'Admin RRHH', 'admin');

-- Datos de prueba para empleado
INSERT INTO time_logs (user_id, date, clock_in, clock_out, total_hours)
VALUES 
  ('11111111-1111-1111-1111-111111111111', CURRENT_DATE - 3, 
   CURRENT_DATE - 3 + INTERVAL '9 hours', 
   CURRENT_DATE - 3 + INTERVAL '18 hours', 8),
  ('11111111-1111-1111-1111-111111111111', CURRENT_DATE - 2, 
   CURRENT_DATE - 2 + INTERVAL '8 hours 30 minutes', 
   CURRENT_DATE - 2 + INTERVAL '17 hours 30 minutes', 8),
  ('11111111-1111-1111-1111-111111111111', CURRENT_DATE - 1, 
   CURRENT_DATE - 1 + INTERVAL '9 hours', 
   CURRENT_DATE - 1 + INTERVAL '18 hours 15 minutes', 8.25);
```

---

## 7. Migraciones Completas (SQL)

### 7.1 Migración 001: Schema inicial
```sql
-- 001_initial_schema.sql

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('employee', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla time_logs
CREATE TABLE IF NOT EXISTS time_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  clock_in TIMESTAMPTZ NOT NULL,
  clock_out TIMESTAMPTZ,
  total_hours DECIMAL(5,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_clock_out CHECK (
    clock_out IS NULL OR clock_out > clock_in
  ),
  CONSTRAINT valid_total_hours CHECK (
    total_hours IS NULL OR total_hours >= 0
  )
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_time_logs_user_id ON time_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_date ON time_logs(date);
CREATE INDEX IF NOT EXISTS idx_time_logs_user_date ON time_logs(user_id, date);

-- Triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_time_logs_updated_at
  BEFORE UPDATE ON time_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Función helper
CREATE OR REPLACE FUNCTION has_pending_clock_out(p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM time_logs
    WHERE user_id = p_user_id
    AND date = CURRENT_DATE
    AND clock_out IS NULL
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Trigger auto-crear perfil
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'employee'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

### 7.2 Migración 002: RLS Policies
```sql
-- 002_rls_policies.sql

-- Habilitar RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;

-- Policies para profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can insert any profile"
  ON profiles FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Policies para time_logs
CREATE POLICY "Employees can view own time logs"
  ON time_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Employees can create own time logs"
  ON time_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Employees can update own time logs"
  ON time_logs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "No delete for employees"
  ON time_logs FOR DELETE
  USING (false);

CREATE POLICY "Admins can view all time logs"
  ON time_logs FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can create any time log"
  ON time_logs FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update any time log"
  ON time_logs FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete time logs"
  ON time_logs FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
```

---

## 8. Troubleshooting Común

### 8.1 Error: "new row violates row-level security policy"
- Verificar que el usuario esté autenticado
- Verificar que existe un registro en `profiles` para el usuario
- Verificar que el user_id del INSERT coincida con auth.uid()

### 8.2 Error: "permission denied for table profiles"
- Verificar que RLS está habilitado
- Verificar que existen políticas para la operación
- Usar service role key SOLO en server, nunca en cliente

### 8.3 Verificar políticas existentes
```sql
-- Listar todas las políticas
SELECT 
  tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('profiles', 'time_logs');
```

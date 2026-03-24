-- Permitir emails nulos en la tabla profiles
ALTER TABLE profiles ALTER COLUMN email DROP NOT NULL;

-- Crear índice parcial para emails no nulos (para mantener unicidad solo en emails que existen)
DROP INDEX IF EXISTS idx_profiles_email_lower;
CREATE UNIQUE INDEX idx_profiles_email_unique ON profiles(email) WHERE email IS NOT NULL;

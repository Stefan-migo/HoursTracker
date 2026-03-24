-- Agregar campos de tracking de invitación a profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS invitation_status VARCHAR(20) DEFAULT 'pending'
  CHECK (invitation_status IN ('pending', 'invited', 'active'));

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS invitation_sent_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS registered_at TIMESTAMPTZ;

-- Crear índices para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_profiles_invitation_status ON profiles(invitation_status);
CREATE INDEX IF NOT EXISTS idx_profiles_email_lower ON profiles(LOWER(email));

-- Actualizar registros existentes
UPDATE profiles 
SET invitation_status = 'active' 
WHERE id IN (SELECT id FROM auth.users WHERE email_confirmed_at IS NOT NULL);

UPDATE profiles 
SET invitation_status = 'invited' 
WHERE id IN (SELECT id FROM auth.users WHERE email_confirmed_at IS NULL);

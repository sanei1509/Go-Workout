-- Agregar campo email a profiles para búsqueda
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS email TEXT;

-- Crear índice para búsqueda por email
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Comentario
COMMENT ON COLUMN profiles.email IS 'Email del usuario para búsqueda';

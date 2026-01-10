-- ============================================
-- RLS (Row Level Security) para tabla profiles
-- ============================================

-- 1. Activar RLS en la tabla profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. Eliminar políticas existentes (si las hay)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;

-- 3. SELECT: Un usuario solo puede leer su propio perfil
-- auth.uid() retorna el UUID del usuario autenticado
CREATE POLICY "Users can view own profile"
ON profiles
FOR SELECT
USING (auth.uid() = id);

-- 4. INSERT: Un usuario solo puede crear su propio perfil
-- WITH CHECK valida los datos ANTES de insertarlos
CREATE POLICY "Users can insert own profile"
ON profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- 5. UPDATE: Un usuario solo puede actualizar su propio perfil
-- USING: filtra qué filas puede ver/seleccionar para actualizar
-- WITH CHECK: valida que después del update siga siendo su perfil
CREATE POLICY "Users can update own profile"
ON profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 6. DELETE: Un usuario solo puede eliminar su propio perfil
CREATE POLICY "Users can delete own profile"
ON profiles
FOR DELETE
USING (auth.uid() = id);

-- ============================================
-- NOTA: FORCE ROW LEVEL SECURITY
-- ============================================
-- Por defecto, los owners de la tabla (roles con BYPASSRLS)
-- pueden saltear RLS. Si querés forzar RLS incluso para ellos:
-- ALTER TABLE profiles FORCE ROW LEVEL SECURITY;
-- Para MVP no es necesario ya que el cliente usa anon/authenticated roles.

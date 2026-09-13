-- Un plan de entrenador no debe ser visible para el alumno hasta que el
-- entrenador lo publique explícitamente. Antes de esta migración, un plan
-- recién creado por el wizard de asignación quedaba activo (is_active=true
-- por default) con cero rutinas, y el alumno lo veía vacío en su home.
--
-- is_published reemplaza ese gate implícito por un estado explícito en DB,
-- así el borrador nunca se filtra por ninguna vista (RLS, no UI).

ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN plans.is_published IS
  'Para planes propios del alumno (trainer_id NULL) siempre true. Para planes de entrenador, false hasta que el entrenador lo publique con contenido.';

-- Alumno: además de ver solo lo propio, ahora exige que esté publicado.
-- Los planes propios se crean siempre con is_published=true (createPlan no
-- lo setea en false salvo que sea un plan de entrenador), así que esta
-- condición es transparente para el flujo actual del alumno.

DROP POLICY "Users can view own plans" ON plans;
CREATE POLICY "Users can view own plans" ON plans
  FOR SELECT USING (auth.uid() = user_id AND is_published = true);

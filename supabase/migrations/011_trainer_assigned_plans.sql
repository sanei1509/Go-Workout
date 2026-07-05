-- Planes asignados por el entrenador.
-- Modelo: entrenador dueño, alumno consume. plans.trainer_id NULL = plan propio
-- del alumno (comportamiento actual intacto); con valor = plan asignado, el
-- alumno lo ve y ejecuta pero no lo edita, el entrenador tiene CRUD.
-- El entrenador además puede LEER todos los planes/rutinas/sesiones de sus
-- alumnos aceptados (necesario para que las stats de progreso no salgan
-- incompletas por los INNER JOIN de progressService).

-- ─── Columna ────────────────────────────────────────────────────────────────

ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS trainer_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_plans_trainer
  ON plans(trainer_id) WHERE trainer_id IS NOT NULL;

COMMENT ON COLUMN plans.trainer_id IS
  'Entrenador que creó el plan para el alumno. NULL = plan propio del alumno.';

-- ─── Helper: ¿el trainer tiene a este alumno? ───────────────────────────────
-- SECURITY DEFINER para no anidar la RLS de invitations dentro de otras
-- policies. Sin recursión posible: invitations no depende de estas tablas.

CREATE OR REPLACE FUNCTION public.trainer_has_student(p_trainer UUID, p_student UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM invitations
    WHERE trainer_id = p_trainer
      AND student_id = p_student
      AND status = 'ACCEPTED'
  );
$$;

-- ─── plans: endurecer escritura del alumno (SELECT intacto) ────────────────
-- El WITH CHECK del INSERT impide que un alumno se auto-asigne trainer_id.

DROP POLICY "Users can create own plans" ON plans;
CREATE POLICY "Users can create own plans" ON plans
  FOR INSERT WITH CHECK (auth.uid() = user_id AND trainer_id IS NULL);

DROP POLICY "Users can update own plans" ON plans;
CREATE POLICY "Users can update own plans" ON plans
  FOR UPDATE USING (auth.uid() = user_id AND trainer_id IS NULL)
  WITH CHECK (auth.uid() = user_id AND trainer_id IS NULL);

DROP POLICY "Users can delete own plans" ON plans;
CREATE POLICY "Users can delete own plans" ON plans
  FOR DELETE USING (auth.uid() = user_id AND trainer_id IS NULL);

-- ─── plans: policies del entrenador ─────────────────────────────────────────
-- SELECT amplio: lo que él creó (aunque la invitación caduque) + todos los
-- planes de alumnos con invitación aceptada.

CREATE POLICY "Trainers can view student plans" ON plans
  FOR SELECT USING (
    trainer_id = auth.uid()
    OR public.trainer_has_student(auth.uid(), user_id)
  );

CREATE POLICY "Trainers can create plans for students" ON plans
  FOR INSERT WITH CHECK (
    trainer_id = auth.uid()
    AND public.trainer_has_student(auth.uid(), user_id)
  );

CREATE POLICY "Trainers can update own assigned plans" ON plans
  FOR UPDATE USING (trainer_id = auth.uid())
  WITH CHECK (trainer_id = auth.uid());

CREATE POLICY "Trainers can delete own assigned plans" ON plans
  FOR DELETE USING (trainer_id = auth.uid());

-- ─── routines: alumno solo escribe en planes propios (SELECT intacto) ──────

DROP POLICY "Users can create routines in own plans" ON routines;
CREATE POLICY "Users can create routines in own plans" ON routines
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM plans WHERE plans.id = plan_id
        AND plans.user_id = auth.uid() AND plans.trainer_id IS NULL
    )
  );

DROP POLICY "Users can update routines in own plans" ON routines;
CREATE POLICY "Users can update routines in own plans" ON routines
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM plans WHERE plans.id = routines.plan_id
        AND plans.user_id = auth.uid() AND plans.trainer_id IS NULL
    )
  );

DROP POLICY "Users can delete routines in own plans" ON routines;
CREATE POLICY "Users can delete routines in own plans" ON routines
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM plans WHERE plans.id = routines.plan_id
        AND plans.user_id = auth.uid() AND plans.trainer_id IS NULL
    )
  );

-- ─── routines: policies del entrenador ──────────────────────────────────────

CREATE POLICY "Trainers can view routines of student plans" ON routines
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM plans p WHERE p.id = routines.plan_id
        AND (p.trainer_id = auth.uid()
             OR public.trainer_has_student(auth.uid(), p.user_id))
    )
  );

CREATE POLICY "Trainers can create routines in assigned plans" ON routines
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM plans p WHERE p.id = plan_id AND p.trainer_id = auth.uid())
  );

CREATE POLICY "Trainers can update routines in assigned plans" ON routines
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM plans p WHERE p.id = routines.plan_id AND p.trainer_id = auth.uid())
  );

CREATE POLICY "Trainers can delete routines in assigned plans" ON routines
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM plans p WHERE p.id = routines.plan_id AND p.trainer_id = auth.uid())
  );

-- ─── routine_blocks: alumno solo escribe en planes propios ─────────────────

DROP POLICY "Users can create blocks in own routines" ON routine_blocks;
CREATE POLICY "Users can create blocks in own routines" ON routine_blocks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM routines r
      JOIN plans p ON p.id = r.plan_id
      WHERE r.id = routine_id AND p.user_id = auth.uid() AND p.trainer_id IS NULL
    )
  );

DROP POLICY "Users can update blocks in own routines" ON routine_blocks;
CREATE POLICY "Users can update blocks in own routines" ON routine_blocks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM routines r
      JOIN plans p ON p.id = r.plan_id
      WHERE r.id = routine_blocks.routine_id AND p.user_id = auth.uid() AND p.trainer_id IS NULL
    )
  );

DROP POLICY "Users can delete blocks in own routines" ON routine_blocks;
CREATE POLICY "Users can delete blocks in own routines" ON routine_blocks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM routines r
      JOIN plans p ON p.id = r.plan_id
      WHERE r.id = routine_blocks.routine_id AND p.user_id = auth.uid() AND p.trainer_id IS NULL
    )
  );

-- ─── routine_blocks: policies del entrenador ────────────────────────────────

CREATE POLICY "Trainers can view blocks of student plans" ON routine_blocks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM routines r
      JOIN plans p ON p.id = r.plan_id
      WHERE r.id = routine_blocks.routine_id
        AND (p.trainer_id = auth.uid()
             OR public.trainer_has_student(auth.uid(), p.user_id))
    )
  );

CREATE POLICY "Trainers can create blocks in assigned plans" ON routine_blocks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM routines r
      JOIN plans p ON p.id = r.plan_id
      WHERE r.id = routine_id AND p.trainer_id = auth.uid()
    )
  );

CREATE POLICY "Trainers can update blocks in assigned plans" ON routine_blocks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM routines r
      JOIN plans p ON p.id = r.plan_id
      WHERE r.id = routine_blocks.routine_id AND p.trainer_id = auth.uid()
    )
  );

CREATE POLICY "Trainers can delete blocks in assigned plans" ON routine_blocks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM routines r
      JOIN plans p ON p.id = r.plan_id
      WHERE r.id = routine_blocks.routine_id AND p.trainer_id = auth.uid()
    )
  );

-- ─── block_exercises: alumno solo escribe en planes propios ────────────────

DROP POLICY "Users can create exercises in own blocks" ON block_exercises;
CREATE POLICY "Users can create exercises in own blocks" ON block_exercises
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM routine_blocks rb
      JOIN routines r ON r.id = rb.routine_id
      JOIN plans p ON p.id = r.plan_id
      WHERE rb.id = block_id AND p.user_id = auth.uid() AND p.trainer_id IS NULL
    )
  );

DROP POLICY "Users can update exercises in own blocks" ON block_exercises;
CREATE POLICY "Users can update exercises in own blocks" ON block_exercises
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM routine_blocks rb
      JOIN routines r ON r.id = rb.routine_id
      JOIN plans p ON p.id = r.plan_id
      WHERE rb.id = block_exercises.block_id AND p.user_id = auth.uid() AND p.trainer_id IS NULL
    )
  );

DROP POLICY "Users can delete exercises in own blocks" ON block_exercises;
CREATE POLICY "Users can delete exercises in own blocks" ON block_exercises
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM routine_blocks rb
      JOIN routines r ON r.id = rb.routine_id
      JOIN plans p ON p.id = r.plan_id
      WHERE rb.id = block_exercises.block_id AND p.user_id = auth.uid() AND p.trainer_id IS NULL
    )
  );

-- ─── block_exercises: policies del entrenador ───────────────────────────────

CREATE POLICY "Trainers can view exercises of student plans" ON block_exercises
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM routine_blocks rb
      JOIN routines r ON r.id = rb.routine_id
      JOIN plans p ON p.id = r.plan_id
      WHERE rb.id = block_exercises.block_id
        AND (p.trainer_id = auth.uid()
             OR public.trainer_has_student(auth.uid(), p.user_id))
    )
  );

CREATE POLICY "Trainers can create exercises in assigned plans" ON block_exercises
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM routine_blocks rb
      JOIN routines r ON r.id = rb.routine_id
      JOIN plans p ON p.id = r.plan_id
      WHERE rb.id = block_id AND p.trainer_id = auth.uid()
    )
  );

CREATE POLICY "Trainers can update exercises in assigned plans" ON block_exercises
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM routine_blocks rb
      JOIN routines r ON r.id = rb.routine_id
      JOIN plans p ON p.id = r.plan_id
      WHERE rb.id = block_exercises.block_id AND p.trainer_id = auth.uid()
    )
  );

CREATE POLICY "Trainers can delete exercises in assigned plans" ON block_exercises
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM routine_blocks rb
      JOIN routines r ON r.id = rb.routine_id
      JOIN plans p ON p.id = r.plan_id
      WHERE rb.id = block_exercises.block_id AND p.trainer_id = auth.uid()
    )
  );

-- ─── workout_sessions / exercise_logs: solo lectura para el entrenador ─────

CREATE POLICY "Trainers can view student sessions" ON workout_sessions
  FOR SELECT USING (public.trainer_has_student(auth.uid(), user_id));

CREATE POLICY "Trainers can view student exercise logs" ON exercise_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM workout_sessions ws
      WHERE ws.id = exercise_logs.session_id
        AND public.trainer_has_student(auth.uid(), ws.user_id)
    )
  );

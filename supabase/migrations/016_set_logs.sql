-- Registro por serie (MVP autoentrenamiento — Semana 4)
CREATE TABLE IF NOT EXISTS set_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES block_exercises(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL CHECK (set_number >= 1),
  reps_completed INTEGER,
  actual_value INTEGER,
  weight_kg NUMERIC(6,2),
  rir INTEGER CHECK (rir IS NULL OR (rir >= 0 AND rir <= 5)),
  skipped BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  performed_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, exercise_id, set_number)
);

CREATE INDEX IF NOT EXISTS idx_set_logs_session ON set_logs (session_id);
CREATE INDEX IF NOT EXISTS idx_set_logs_exercise ON set_logs (exercise_id);
CREATE INDEX IF NOT EXISTS idx_set_logs_session_created ON set_logs (session_id, created_at DESC);

ALTER TABLE set_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own set logs"
  ON set_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workout_sessions ws
      WHERE ws.id = set_logs.session_id AND ws.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can insert own set logs"
  ON set_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workout_sessions ws
      WHERE ws.id = session_id AND ws.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can update own set logs"
  ON set_logs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workout_sessions ws
      WHERE ws.id = set_logs.session_id AND ws.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workout_sessions ws
      WHERE ws.id = set_logs.session_id AND ws.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Users can delete own set logs"
  ON set_logs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workout_sessions ws
      WHERE ws.id = set_logs.session_id AND ws.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Trainers can view student set logs"
  ON set_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workout_sessions ws
      JOIN routines r ON r.id = ws.routine_id
      JOIN plans p ON p.id = r.plan_id
      WHERE ws.id = set_logs.session_id
        AND p.trainer_id = (SELECT auth.uid())
    )
  );

COMMENT ON TABLE set_logs IS 'Registro detallado por serie dentro de una sesión de entrenamiento';
COMMENT ON COLUMN set_logs.performed_name IS 'Nombre del ejercicio realizado si hubo sustitución';

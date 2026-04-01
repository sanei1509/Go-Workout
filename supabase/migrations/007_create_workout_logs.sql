-- Tabla de sesiones de entrenamiento (cada vez que se ejecuta una rutina)
CREATE TABLE IF NOT EXISTS workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  routine_id UUID NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para sesiones
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user ON workout_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_routine ON workout_sessions(routine_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_started ON workout_sessions(started_at DESC);

-- Tabla de logs de ejercicios (registro de cada ejercicio completado)
CREATE TABLE IF NOT EXISTS exercise_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES block_exercises(id) ON DELETE CASCADE,
  sets_completed INTEGER NOT NULL DEFAULT 0,
  actual_value INTEGER, -- valor real logrado (reps, segundos, metros)
  notes TEXT,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para logs de ejercicios
CREATE INDEX IF NOT EXISTS idx_exercise_logs_session ON exercise_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_exercise_logs_exercise ON exercise_logs(exercise_id);

-- RLS para workout_sessions
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workout sessions" ON workout_sessions
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own workout sessions" ON workout_sessions
FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own workout sessions" ON workout_sessions
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own workout sessions" ON workout_sessions
FOR DELETE USING (user_id = auth.uid());

-- RLS para exercise_logs
ALTER TABLE exercise_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own exercise logs" ON exercise_logs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM workout_sessions ws
    WHERE ws.id = exercise_logs.session_id AND ws.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create exercise logs in own sessions" ON exercise_logs
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM workout_sessions ws
    WHERE ws.id = session_id AND ws.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update exercise logs in own sessions" ON exercise_logs
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM workout_sessions ws
    WHERE ws.id = exercise_logs.session_id AND ws.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete exercise logs in own sessions" ON exercise_logs
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM workout_sessions ws
    WHERE ws.id = exercise_logs.session_id AND ws.user_id = auth.uid()
  )
);

-- Comentarios
COMMENT ON TABLE workout_sessions IS 'Sesiones de entrenamiento - cada ejecución de una rutina';
COMMENT ON TABLE exercise_logs IS 'Registro de ejercicios completados durante una sesión';
COMMENT ON COLUMN workout_sessions.finished_at IS 'NULL si la sesión está en progreso';
COMMENT ON COLUMN exercise_logs.actual_value IS 'Valor real logrado, puede diferir del planificado';

-- Tipos ENUM para bloques y ejercicios
CREATE TYPE block_type AS ENUM ('warmup', 'main', 'accessory', 'cardio', 'mobility');
CREATE TYPE exercise_type AS ENUM ('reps', 'time', 'distance');

-- Tabla de rutinas
CREATE TABLE IF NOT EXISTS routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  day_number INTEGER NOT NULL CHECK (day_number >= 1 AND day_number <= 7),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para rutinas
CREATE INDEX IF NOT EXISTS idx_routines_plan ON routines(plan_id);

-- Tabla de bloques dentro de rutinas
CREATE TABLE IF NOT EXISTS routine_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  block_type block_type NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para bloques
CREATE INDEX IF NOT EXISTS idx_blocks_routine ON routine_blocks(routine_id);

-- Tabla de ejercicios dentro de bloques
CREATE TABLE IF NOT EXISTS block_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id UUID NOT NULL REFERENCES routine_blocks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  exercise_type exercise_type NOT NULL DEFAULT 'reps',
  sets INTEGER NOT NULL DEFAULT 3,
  value INTEGER NOT NULL DEFAULT 10,
  rest_seconds INTEGER NOT NULL DEFAULT 60,
  notes TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para ejercicios
CREATE INDEX IF NOT EXISTS idx_exercises_block ON block_exercises(block_id);

-- RLS para routines
ALTER TABLE routines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view routines of own plans" ON routines
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM plans WHERE plans.id = routines.plan_id AND plans.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create routines in own plans" ON routines
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM plans WHERE plans.id = plan_id AND plans.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update routines in own plans" ON routines
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM plans WHERE plans.id = routines.plan_id AND plans.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete routines in own plans" ON routines
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM plans WHERE plans.id = routines.plan_id AND plans.user_id = auth.uid()
  )
);

-- RLS para routine_blocks
ALTER TABLE routine_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view blocks of own routines" ON routine_blocks
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM routines r
    JOIN plans p ON p.id = r.plan_id
    WHERE r.id = routine_blocks.routine_id AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create blocks in own routines" ON routine_blocks
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM routines r
    JOIN plans p ON p.id = r.plan_id
    WHERE r.id = routine_id AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update blocks in own routines" ON routine_blocks
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM routines r
    JOIN plans p ON p.id = r.plan_id
    WHERE r.id = routine_blocks.routine_id AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete blocks in own routines" ON routine_blocks
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM routines r
    JOIN plans p ON p.id = r.plan_id
    WHERE r.id = routine_blocks.routine_id AND p.user_id = auth.uid()
  )
);

-- RLS para block_exercises
ALTER TABLE block_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view exercises of own blocks" ON block_exercises
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM routine_blocks rb
    JOIN routines r ON r.id = rb.routine_id
    JOIN plans p ON p.id = r.plan_id
    WHERE rb.id = block_exercises.block_id AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create exercises in own blocks" ON block_exercises
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM routine_blocks rb
    JOIN routines r ON r.id = rb.routine_id
    JOIN plans p ON p.id = r.plan_id
    WHERE rb.id = block_id AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update exercises in own blocks" ON block_exercises
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM routine_blocks rb
    JOIN routines r ON r.id = rb.routine_id
    JOIN plans p ON p.id = r.plan_id
    WHERE rb.id = block_exercises.block_id AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete exercises in own blocks" ON block_exercises
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM routine_blocks rb
    JOIN routines r ON r.id = rb.routine_id
    JOIN plans p ON p.id = r.plan_id
    WHERE rb.id = block_exercises.block_id AND p.user_id = auth.uid()
  )
);

-- Comentarios
COMMENT ON TABLE routines IS 'Rutinas dentro de un plan';
COMMENT ON TABLE routine_blocks IS 'Bloques de ejercicios dentro de una rutina';
COMMENT ON TABLE block_exercises IS 'Ejercicios dentro de un bloque';
COMMENT ON COLUMN block_exercises.exercise_type IS 'reps=repeticiones, time=segundos, distance=metros';
COMMENT ON COLUMN block_exercises.value IS 'Valor según tipo: reps, segundos o metros';

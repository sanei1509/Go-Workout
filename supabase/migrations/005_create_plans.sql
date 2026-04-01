-- Tabla de planes de entrenamiento
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  discipline TEXT NOT NULL,
  weekly_frequency INTEGER NOT NULL CHECK (weekly_frequency >= 1 AND weekly_frequency <= 7),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_plans_user ON plans(user_id);
CREATE INDEX IF NOT EXISTS idx_plans_active ON plans(user_id, is_active);

-- RLS
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- Políticas: usuario puede CRUD sus propios planes
CREATE POLICY "Users can view own plans" ON plans
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own plans" ON plans
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own plans" ON plans
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own plans" ON plans
FOR DELETE USING (auth.uid() = user_id);

-- Comentarios
COMMENT ON TABLE plans IS 'Planes de entrenamiento de usuarios';
COMMENT ON COLUMN plans.weekly_frequency IS 'Frecuencia semanal (1-7 días)';
COMMENT ON COLUMN plans.is_active IS 'Si el plan está activo o archivado';

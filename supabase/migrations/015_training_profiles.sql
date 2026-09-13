-- Perfil de autoentrenamiento (alumno autónomo, sin entrenador)
CREATE TABLE IF NOT EXISTS training_profiles (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  experience_level TEXT NOT NULL DEFAULT 'beginner'
    CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
  training_location TEXT NOT NULL DEFAULT 'gym'
    CHECK (training_location IN ('gym', 'home', 'both')),
  primary_goal TEXT NOT NULL DEFAULT 'general_fitness'
    CHECK (primary_goal IN ('strength', 'hypertrophy', 'fat_loss', 'mobility', 'general_fitness')),
  equipment TEXT[] NOT NULL DEFAULT '{}',
  injuries_notes TEXT,
  session_duration_minutes INTEGER NOT NULL DEFAULT 60
    CHECK (session_duration_minutes BETWEEN 20 AND 120),
  safety_acknowledged_at TIMESTAMPTZ,
  onboarding_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_profiles_goal
  ON training_profiles (primary_goal);

ALTER TABLE training_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own training profile"
  ON training_profiles FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert own training profile"
  ON training_profiles FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update own training profile"
  ON training_profiles FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

COMMENT ON TABLE training_profiles IS 'Preferencias de autoentrenamiento del alumno (onboarding MVP)';

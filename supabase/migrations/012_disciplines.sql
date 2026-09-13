-- Disciplinas del entrenador y de los ejercicios del catálogo.
-- profiles.disciplines: las 1-3 disciplinas que declara un TRAINER; acotan
-- todo su flujo de creación de planes.
-- exercises.disciplines: a qué disciplinas aplica cada ejercicio; habilita
-- sugerencias filtradas en el editor de rutinas.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS disciplines TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN profiles.disciplines IS
  'Disciplinas del entrenador (vacío para alumnos). Ej: {Musculación,Crossfit}';

ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS disciplines TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_exercises_disciplines
  ON exercises USING GIN (disciplines);

COMMENT ON COLUMN exercises.disciplines IS
  'Disciplinas donde este ejercicio es relevante. Ej: {Musculación,Funcional}';

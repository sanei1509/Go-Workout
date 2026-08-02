-- Tracking real de carga. Hasta ahora block_exercises/exercise_logs solo
-- guardaban reps/segundos/metros (block_exercises.value / exercise_logs.
-- actual_value) — nunca el peso levantado. Sin esto, "volumen" era
-- sets×reps, no sets×reps×peso, y ni el seguimiento del entrenador ni la
-- IA podían razonar sobre progresión de carga real.

ALTER TABLE block_exercises
  ADD COLUMN IF NOT EXISTS target_weight_kg NUMERIC(6,2) NULL;

COMMENT ON COLUMN block_exercises.target_weight_kg IS
  'Peso objetivo en kg. Opcional — mayormente relevante para exercise_type=reps.';

ALTER TABLE exercise_logs
  ADD COLUMN IF NOT EXISTS actual_weight_kg NUMERIC(6,2) NULL;

COMMENT ON COLUMN exercise_logs.actual_weight_kg IS
  'Peso real usado ese día en kg. NULL si el ejercicio no trackea peso.';

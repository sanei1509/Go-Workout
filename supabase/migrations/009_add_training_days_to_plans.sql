-- Agrega la columna training_days a plans para guardar qué días de la semana entrena el usuario
-- 1 = Lunes, 2 = Martes, 3 = Miércoles, 4 = Jueves, 5 = Viernes, 6 = Sábado, 7 = Domingo

ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS training_days integer[] DEFAULT NULL;

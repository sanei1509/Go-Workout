-- Agregar campo para configurar qué campos son requeridos en la invitación
ALTER TABLE invitations
ADD COLUMN IF NOT EXISTS required_fields TEXT[] DEFAULT '{}';

COMMENT ON COLUMN invitations.required_fields IS 'Lista de campos requeridos: age, weight, height, injuries, diseases, goals, experience';

-- Tabla para guardar las respuestas del formulario del alumno
CREATE TABLE IF NOT EXISTS student_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id UUID NOT NULL REFERENCES invitations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Campos del formulario
  age INTEGER,
  weight DECIMAL(5,2),
  height DECIMAL(5,2),
  injuries TEXT,
  diseases TEXT,
  goals TEXT,
  experience TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(invitation_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_student_forms_student ON student_forms(student_id);
CREATE INDEX IF NOT EXISTS idx_student_forms_trainer ON student_forms(trainer_id);

-- RLS
ALTER TABLE student_forms ENABLE ROW LEVEL SECURITY;

-- Políticas: el alumno puede crear/ver su formulario, el trainer puede ver formularios de sus alumnos
CREATE POLICY "Students can insert their own forms" ON student_forms
FOR INSERT WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can view their own forms" ON student_forms
FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Trainers can view their students forms" ON student_forms
FOR SELECT USING (auth.uid() = trainer_id);

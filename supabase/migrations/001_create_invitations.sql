-- Crear tabla de invitaciones
CREATE TABLE IF NOT EXISTS invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  discipline VARCHAR(100) NOT NULL,
  plan_type VARCHAR(100) NOT NULL,
  frequency VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Un entrenador no puede invitar al mismo alumno más de una vez (mientras esté pendiente)
  CONSTRAINT unique_pending_invitation UNIQUE (trainer_id, student_id, status)
);

-- Índices para búsquedas rápidas
CREATE INDEX idx_invitations_student_id ON invitations(student_id);
CREATE INDEX idx_invitations_trainer_id ON invitations(trainer_id);
CREATE INDEX idx_invitations_status ON invitations(status);

-- RLS (Row Level Security)
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Política: El alumno puede ver sus propias invitaciones
CREATE POLICY "Students can view their invitations"
  ON invitations FOR SELECT
  USING (auth.uid() = student_id);

-- Política: El entrenador puede ver las invitaciones que envió
CREATE POLICY "Trainers can view their sent invitations"
  ON invitations FOR SELECT
  USING (auth.uid() = trainer_id);

-- Política: El entrenador puede crear invitaciones
CREATE POLICY "Trainers can create invitations"
  ON invitations FOR INSERT
  WITH CHECK (auth.uid() = trainer_id);

-- Política: El alumno puede actualizar (aceptar/rechazar) sus invitaciones
CREATE POLICY "Students can update their invitations"
  ON invitations FOR UPDATE
  USING (auth.uid() = student_id);

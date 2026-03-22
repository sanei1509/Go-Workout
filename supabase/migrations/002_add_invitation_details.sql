-- Agregar campos para detalle de invitación
ALTER TABLE invitations
ADD COLUMN IF NOT EXISTS terms_text TEXT,
ADD COLUMN IF NOT EXISTS has_required_form BOOLEAN DEFAULT false;

-- Comentarios
COMMENT ON COLUMN invitations.terms_text IS 'Texto de los términos y condiciones del entrenador';
COMMENT ON COLUMN invitations.has_required_form IS 'Indica si el alumno debe completar un formulario al aceptar';

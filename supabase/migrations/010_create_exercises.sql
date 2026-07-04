-- Catálogo de ejercicios como fuente de verdad en la DB.
-- Antes vivía estático en el cliente (lib/exercises/catalog.ts); ese archivo
-- queda como fallback offline y como fuente del seed. Acá sumamos media
-- (imagen/gif/video) y habilitamos que el agente IA valide contra esta lista.

CREATE TABLE IF NOT EXISTS exercises (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              text UNIQUE NOT NULL,          -- nombre canónico normalizado (ej. 'press-banca')
  label             text NOT NULL,                 -- nombre a mostrar en la UI
  aliases           text[] NOT NULL DEFAULT '{}',  -- variantes de nombre (= catalog.names)
  primary_muscles   text[] NOT NULL DEFAULT '{}',  -- grupos musculares primarios (= MuscleGroup)
  secondary_muscles text[] NOT NULL DEFAULT '{}',  -- grupos musculares secundarios
  tip               text,                          -- consejo breve de técnica
  image_url         text,                          -- imagen o gif (bucket exercise-media o URL externa)
  video_url         text,                          -- video externo (YouTube, etc.)
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

-- Catálogo global: cualquiera autenticado puede leerlo.
CREATE POLICY "Exercises are publicly readable"
  ON exercises FOR SELECT
  USING (true);
-- Escritura reservada al service_role (seed / administración). Sin policies de
-- INSERT/UPDATE/DELETE públicas: el service_role bypassa RLS.

-- Índice para búsqueda por alias.
CREATE INDEX IF NOT EXISTS idx_exercises_aliases ON exercises USING GIN (aliases);

-- ─── Storage: bucket para media de ejercicios ───────────────────────────────
-- Mismo patrón que 008_add_avatar_and_storage.sql, pero la escritura es solo
-- del service_role (la media la sube un admin, no el usuario final).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'exercise-media',
  'exercise-media',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Cualquiera puede ver la media (bucket público).
CREATE POLICY "Exercise media is publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'exercise-media');

// Lista canónica de disciplinas de la app. Única fuente de verdad:
// la usan el perfil del entrenador, las invitaciones, los planes y el
// filtrado de ejercicios del catálogo. planService la re-exporta por
// compatibilidad con imports existentes.

export const DISCIPLINES = [
  'Musculación',
  'Crossfit',
  'Calistenia',
  'Funcional',
  'Running',
  'Natación',
  'Yoga',
  'Pilates',
  'Boxeo',
  'Artes Marciales',
  'Ciclismo',
  'HIIT',
  'Powerlifting',
  'Otro',
] as const;

export type Discipline = (typeof DISCIPLINES)[number];

// Máximo de disciplinas que puede declarar un entrenador.
export const MAX_TRAINER_DISCIPLINES = 3;

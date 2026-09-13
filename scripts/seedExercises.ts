// Seed único: porta el catálogo estático (lib/exercises/catalog.ts) a la tabla
// `exercises` de Supabase. Idempotente (upsert por slug), así que se puede correr
// varias veces sin duplicar. La media (image_url/video_url) se carga aparte.
//
// Uso:
//   set -a; source .env; set +a; npx tsx scripts/seedExercises.ts
//
// Requiere EXPO_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el entorno.

import { createClient } from '@supabase/supabase-js';
import { EXERCISE_CATALOG } from '../lib/exercises/catalog';
import { normalizeName } from '../lib/exercises/lookup';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    'Faltan EXPO_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno.'
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

// slug canónico: primer alias normalizado, con guiones en lugar de espacios.
function toSlug(entry: (typeof EXERCISE_CATALOG)[number]): string {
  const base = entry.names[0] ?? entry.label;
  return normalizeName(base).replace(/ /g, '-');
}

// ─── Disciplinas por ejercicio (por label, la clave estable del catálogo) ───
// Regla base: todo el catálogo actual es programable en Musculación. Los sets
// suman Calistenia (bodyweight) y Crossfit/Funcional (sección funcional + core
// dinámico). Ajustable a futuro editando exercises.disciplines en la DB.

const CALISTENIA = new Set([
  'Dominadas', 'Fondos en paralelas', 'Flexiones de piso', 'Fondos para tríceps',
  'Plancha', 'Plancha lateral', 'Crunch abdominal', 'Crunch inverso',
  'Rueda abdominal', 'Dragon flag', 'Mountain climbers', 'Hollow body',
  'Elevación de piernas', 'Puente de glúteos', 'Sentadilla', 'Zancadas',
  'Sentadilla búlgara', 'Burpees', 'Box jump',
]);

const CROSSFIT_FUNCIONAL = new Set([
  'Thruster', 'Clean (cargada)', 'Snatch (arranque)', 'Burpees',
  'Kettlebell swing', 'Box jump', 'Wall ball', 'Turkish get up',
  'Peso muerto sumo', 'Peso muerto', 'Sentadilla frontal', 'Sentadilla',
]);

const FUNCIONAL_EXTRA = new Set([
  'Plancha', 'Plancha lateral', 'Mountain climbers', 'Hollow body',
  'Zancadas', 'Hip thrust', 'Puente de glúteos',
]);

function disciplinesFor(label: string): string[] {
  const out = new Set<string>(['Musculación']);
  if (CALISTENIA.has(label)) out.add('Calistenia');
  if (CROSSFIT_FUNCIONAL.has(label)) {
    out.add('Crossfit');
    out.add('Funcional');
  }
  if (FUNCIONAL_EXTRA.has(label)) out.add('Funcional');
  return [...out];
}

async function main() {
  const rows = EXERCISE_CATALOG.map((entry) => ({
    slug: toSlug(entry),
    label: entry.label,
    aliases: entry.names.map((n) => normalizeName(n)),
    primary_muscles: entry.primary,
    secondary_muscles: entry.secondary,
    tip: entry.tip,
    disciplines: disciplinesFor(entry.label),
  }));

  // Chequeo de slugs duplicados antes de mandar.
  const seen = new Set<string>();
  const dups = rows.filter((r) => (seen.has(r.slug) ? true : (seen.add(r.slug), false)));
  if (dups.length > 0) {
    console.error('Slugs duplicados:', dups.map((d) => d.slug));
    process.exit(1);
  }

  const { error } = await supabase.from('exercises').upsert(rows, {
    onConflict: 'slug',
  });

  if (error) {
    console.error('Error al hacer upsert:', error.message);
    process.exit(1);
  }

  console.log(`Seed OK: ${rows.length} ejercicios upserteados.`);
}

main();

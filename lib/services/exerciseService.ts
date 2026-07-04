import { supabase } from '@/lib/supabase';
import { normalizeName } from '@/lib/exercises/lookup';
import type { MuscleGroup } from '@/lib/exercises/catalog';

// Ejercicio del catálogo global (tabla `exercises`). Fuente de verdad para la
// media; el catálogo local (lib/exercises/catalog.ts) queda como fallback offline.
export interface Exercise {
  id: string;
  slug: string;
  label: string;
  aliases: string[];
  primary_muscles: MuscleGroup[];
  secondary_muscles: MuscleGroup[];
  tip: string | null;
  image_url: string | null;
  video_url: string | null;
}

// Vista liviana para alimentar al agente IA con los nombres válidos.
export interface ExerciseName {
  slug: string;
  label: string;
  aliases: string[];
}

// Busca ejercicios con el mismo scoring bidireccional que lookupExercise:
// exacto gana, después substring en cualquier dirección (cubre orden de palabras
// distinto, ej. "press maquina" vs alias "press maquina pecho"). La tabla es
// chica (~70 filas), así que traemos todo y matcheamos acá — un filtro por
// substring en PostgREST no cubre estos casos.
export async function searchExercises(
  query: string
): Promise<{ exercises: Exercise[]; error: Error | null }> {
  const q = normalizeName(query);
  if (!q) return { exercises: [], error: null };

  const { data, error } = await supabase.from('exercises').select('*');
  if (error) return { exercises: [], error: new Error(error.message) };

  const scored = ((data ?? []) as Exercise[])
    .map((ex) => {
      let score = 0;
      for (const alias of ex.aliases) {
        if (q === alias) score = Math.max(score, alias.length * 2);
        // Substring solo con 3+ caracteres: "mu" no debe matchear "peso muerto".
        else if (alias.length >= 3 && q.includes(alias)) score = Math.max(score, alias.length);
        else if (q.length >= 3 && alias.includes(q)) score = Math.max(score, q.length);
      }
      return { ex, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  return { exercises: scored.map((s) => s.ex), error: null };
}

export async function getExerciseBySlug(
  slug: string
): Promise<{ exercise: Exercise | null; error: Error | null }> {
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) return { exercise: null, error: new Error(error.message) };
  return { exercise: (data as Exercise) ?? null, error: null };
}

// Lista liviana de nombres válidos para inyectar en el system prompt del agente.
export async function getAllExerciseNames(): Promise<{
  names: ExerciseName[];
  error: Error | null;
}> {
  const { data, error } = await supabase
    .from('exercises')
    .select('slug, label, aliases')
    .order('label');

  if (error) return { names: [], error: new Error(error.message) };
  return { names: (data ?? []) as ExerciseName[], error: null };
}

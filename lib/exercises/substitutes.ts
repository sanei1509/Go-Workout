import { EXERCISE_CATALOG, ExerciseCatalogEntry } from './catalog';
import { lookupExercise } from './lookup';

/** Alternativas del catálogo que comparten al menos un músculo primario. */
export function getSubstituteExercises(exerciseName: string, limit = 8): ExerciseCatalogEntry[] {
  const current = lookupExercise(exerciseName);
  if (!current) {
    return EXERCISE_CATALOG.filter(e => e.label !== exerciseName).slice(0, limit);
  }

  const primarySet = new Set(current.primary);
  const scored = EXERCISE_CATALOG
    .filter(e => e.label !== current.label)
    .map(entry => {
      const overlap = entry.primary.filter(m => primarySet.has(m)).length;
      const secondaryOverlap = entry.secondary.filter(m => primarySet.has(m)).length;
      return { entry, score: overlap * 2 + secondaryOverlap };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    return EXERCISE_CATALOG.filter(e => e.label !== current.label).slice(0, limit);
  }

  return scored.slice(0, limit).map(x => x.entry);
}

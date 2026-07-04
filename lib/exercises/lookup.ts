import { EXERCISE_CATALOG, ExerciseCatalogEntry } from './catalog';

// Elimina acentos y normaliza a minúsculas
function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Palabras a ignorar en el matching
const STOP_WORDS = new Set([
  'con', 'de', 'del', 'en', 'el', 'la', 'los', 'las', 'un', 'una',
  'y', 'a', 'al', 'por', 'para', 'sin', 'sobre',
]);

export function normalizeName(name: string): string {
  return removeAccents(name)
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !STOP_WORDS.has(w))
    .join(' ')
    .trim();
}

// Busca la entrada del catálogo que mejor coincida con el nombre dado.
// Estrategia: busca substring bidireccional (query contiene el nombre del catálogo
// o el nombre del catálogo contiene la query). Retorna el match más específico
// (mayor longitud del patrón coincidente).
export function lookupExercise(rawName: string): ExerciseCatalogEntry | null {
  const query = normalizeName(rawName);
  if (!query) return null;

  let bestMatch: ExerciseCatalogEntry | null = null;
  let bestScore = 0;

  for (const entry of EXERCISE_CATALOG) {
    for (const variant of entry.names) {
      const normalizedVariant = normalizeName(variant);
      if (!normalizedVariant) continue;

      let score = 0;
      if (query === normalizedVariant) {
        score = normalizedVariant.length * 2; // exact match wins
      } else if (query.includes(normalizedVariant)) {
        score = normalizedVariant.length;
      } else if (normalizedVariant.includes(query)) {
        score = query.length;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = entry;
      }
    }
  }

  return bestMatch;
}

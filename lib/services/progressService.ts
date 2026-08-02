import { supabase } from '@/lib/supabase';

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface ExerciseHistoryEntry {
  session_id: string;
  date: string;           // ISO date of the session
  sets_completed: number;
  actual_value: number;
  actual_weight_kg: number | null;
  exercise_type: 'reps' | 'time' | 'distance';
}

export interface PersonalRecord {
  exercise_name: string;
  exercise_type: 'reps' | 'time' | 'distance';
  best_value: number;         // max actual_value del mejor registro
  best_sets: number;          // sets_completed en el mejor registro
  best_weight_kg: number | null;  // peso en el mejor registro, si se trackeó
  estimated_1rm: number | null;   // fórmula de Epley, solo si hay peso
  achieved_at: string;        // date of the PR
}

export interface VolumeEntry {
  period: string;         // 'YYYY-WW' for week, 'YYYY-MM' for month
  exercise_name: string;
  exercise_type: 'reps' | 'time' | 'distance';
  total_volume: number;   // SUM(sets × reps × peso) si hay peso, si no SUM(sets × valor)
  sessions_count: number;
}

// Estimación de 1RM (fórmula de Epley) — usada para rankear PRs cuando hay
// peso registrado: una serie pesada de pocas reps puede representar más
// fuerza que una liviana de muchas, algo que comparar solo actual_value no captura.
function estimate1RM(weightKg: number, reps: number): number {
  return weightKg * (1 + reps / 30);
}

// Score para decidir "el mejor" registro de un ejercicio: 1RM estimado si
// hay peso (solo tiene sentido para exercise_type='reps'), si no el valor crudo.
function rankScore(exerciseType: string, actualValue: number, weightKg: number | null): number {
  if (exerciseType === 'reps' && weightKg) return estimate1RM(weightKg, actualValue);
  return actualValue;
}

// Volumen de una serie: sets × reps × peso cuando hay peso registrado (kg reales),
// si no sets × valor (reps/seg/mts, como antes — unidades no comparables entre sí,
// limitación preexistente al sumar ejercicios de distinto tipo en un mismo total).
function rowVolume(exerciseType: string, setsCompleted: number, actualValue: number, weightKg: number | null): number {
  if (exerciseType === 'reps' && weightKg) return setsCompleted * actualValue * weightKg;
  return setsCompleted * actualValue;
}

// ── Funciones ────────────────────────────────────────────────────────────────

/**
 * Historial de cargas/reps de un ejercicio específico para un usuario.
 * Agrupa por sesión, ordenado del más antiguo al más reciente (útil para gráficos).
 */
export async function getExerciseHistory(
  userId: string,
  exerciseName: string,
  limit = 20
): Promise<{ history: ExerciseHistoryEntry[]; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('exercise_logs')
      .select(`
        session_id,
        sets_completed,
        actual_value,
        actual_weight_kg,
        block_exercises!inner ( name, exercise_type, routine_blocks!inner ( block_type ) ),
        workout_sessions!inner ( started_at, user_id )
      `)
      .eq('workout_sessions.user_id', userId)
      .eq('block_exercises.name', exerciseName)
      .not('actual_value', 'is', null)
      .order('workout_sessions(started_at)', { ascending: true })
      .limit(limit);

    if (error) return { history: [], error: new Error(error.message) };

    const history: ExerciseHistoryEntry[] = (data || [])
      .filter((row: any) => row.block_exercises.routine_blocks.block_type !== 'warmup')
      .map((row: any) => ({
        session_id: row.session_id,
        date: row.workout_sessions.started_at,
        sets_completed: row.sets_completed,
        actual_value: row.actual_value,
        actual_weight_kg: row.actual_weight_kg ?? null,
        exercise_type: row.block_exercises.exercise_type,
      }));

    return { history, error: null };
  } catch {
    return { history: [], error: new Error('Error al obtener historial del ejercicio') };
  }
}

/**
 * Récord personal (PR) de un ejercicio para un usuario.
 * PR = entrada con mayor actual_value.
 */
export async function getPersonalRecord(
  userId: string,
  exerciseName: string
): Promise<{ pr: PersonalRecord | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('exercise_logs')
      .select(`
        sets_completed,
        actual_value,
        actual_weight_kg,
        block_exercises!inner ( name, exercise_type, routine_blocks!inner ( block_type ) ),
        workout_sessions!inner ( started_at, user_id )
      `)
      .eq('workout_sessions.user_id', userId)
      .eq('block_exercises.name', exerciseName)
      .not('actual_value', 'is', null);

    if (error) return { pr: null, error: new Error(error.message) };

    let best: any = null;
    let bestScore = -Infinity;
    for (const row of (data || []) as any[]) {
      if (row.block_exercises.routine_blocks.block_type === 'warmup') continue;
      const score = rankScore(row.block_exercises.exercise_type, row.actual_value, row.actual_weight_kg);
      if (score > bestScore) { bestScore = score; best = row; }
    }

    if (!best) return { pr: null, error: null };

    const pr: PersonalRecord = {
      exercise_name: exerciseName,
      exercise_type: best.block_exercises.exercise_type,
      best_value: best.actual_value,
      best_sets: best.sets_completed,
      best_weight_kg: best.actual_weight_kg ?? null,
      estimated_1rm: best.block_exercises.exercise_type === 'reps' && best.actual_weight_kg
        ? estimate1RM(best.actual_weight_kg, best.actual_value)
        : null,
      achieved_at: best.workout_sessions.started_at,
    };

    return { pr, error: null };
  } catch {
    return { pr: null, error: new Error('Error al obtener récord personal') };
  }
}

/**
 * PRs de todos los ejercicios que ha realizado un usuario.
 * Devuelve el mejor registro por nombre de ejercicio.
 */
export async function getAllPersonalRecords(
  userId: string
): Promise<{ records: PersonalRecord[]; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('exercise_logs')
      .select(`
        sets_completed,
        actual_value,
        actual_weight_kg,
        block_exercises!inner ( name, exercise_type, routine_blocks!inner ( block_type ) ),
        workout_sessions!inner ( started_at, user_id )
      `)
      .eq('workout_sessions.user_id', userId)
      .not('actual_value', 'is', null);

    if (error) return { records: [], error: new Error(error.message) };

    // Quedarse con el mejor por nombre de ejercicio (por rankScore, no por
    // actual_value crudo), excluyendo calentamiento.
    const best = new Map<string, PersonalRecord & { _score: number }>();
    for (const row of (data || []) as any[]) {
      if (row.block_exercises.routine_blocks.block_type === 'warmup') continue;
      const name: string = row.block_exercises.name;
      const exerciseType = row.block_exercises.exercise_type;
      const score = rankScore(exerciseType, row.actual_value, row.actual_weight_kg);
      const current = best.get(name);
      if (!current || score > current._score) {
        best.set(name, {
          exercise_name: name,
          exercise_type: exerciseType,
          best_value: row.actual_value,
          best_sets: row.sets_completed,
          best_weight_kg: row.actual_weight_kg ?? null,
          estimated_1rm: exerciseType === 'reps' && row.actual_weight_kg
            ? estimate1RM(row.actual_weight_kg, row.actual_value)
            : null,
          achieved_at: row.workout_sessions.started_at,
          _score: score,
        });
      }
    }

    return {
      records: Array.from(best.values()).map(({ _score, ...pr }) => pr),
      error: null,
    };
  } catch {
    return { records: [], error: new Error('Error al obtener récords personales') };
  }
}

/**
 * Volumen semanal o mensual por ejercicio.
 * Volumen = SUM(sets_completed × actual_value) por período.
 */
export async function getVolumeStats(
  userId: string,
  period: 'week' | 'month' = 'week',
  periodsBack = 8
): Promise<{ volume: VolumeEntry[]; error: Error | null }> {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - (period === 'week' ? periodsBack * 7 : periodsBack * 30));

    const { data, error } = await supabase
      .from('exercise_logs')
      .select(`
        sets_completed,
        actual_value,
        actual_weight_kg,
        block_exercises!inner ( name, exercise_type, routine_blocks!inner ( block_type ) ),
        workout_sessions!inner ( started_at, user_id )
      `)
      .eq('workout_sessions.user_id', userId)
      .gte('workout_sessions.started_at', cutoff.toISOString())
      .not('actual_value', 'is', null);

    if (error) return { volume: [], error: new Error(error.message) };

    // Agrupar en JS: { period+exercise_name → VolumeEntry }
    const map = new Map<string, VolumeEntry>();

    for (const row of (data || []) as any[]) {
      if (row.block_exercises.routine_blocks.block_type === 'warmup') continue;
      const date = new Date(row.workout_sessions.started_at);
      const periodKey =
        period === 'week'
          ? `${date.getFullYear()}-W${String(getISOWeek(date)).padStart(2, '0')}`
          : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      const name: string = row.block_exercises.name;
      const key = `${periodKey}|${name}`;

      if (!map.has(key)) {
        map.set(key, {
          period: periodKey,
          exercise_name: name,
          exercise_type: row.block_exercises.exercise_type,
          total_volume: 0,
          sessions_count: 0,
        });
      }

      const entry = map.get(key)!;
      entry.total_volume += rowVolume(
        row.block_exercises.exercise_type,
        row.sets_completed,
        row.actual_value ?? 0,
        row.actual_weight_kg ?? null
      );
      entry.sessions_count += 1;
    }

    const volume = Array.from(map.values()).sort((a, b) =>
      a.period.localeCompare(b.period)
    );

    return { volume, error: null };
  } catch {
    return { volume: [], error: new Error('Error al calcular volumen') };
  }
}

// ── GOW-48: Estadísticas generales ───────────────────────────────────────────

export interface GeneralStats {
  volumeThisWeek: number;
  volumeLastWeek: number;
  volumeChange: number;       // % cambio respecto a semana anterior
  distinctExercises: number;  // ejercicios distintos realizados en total
  totalSets: number;
}

export interface WeeklySessionsBar {
  label: string;   // 'Sem 1', 'Sem 2', etc.
  count: number;   // sesiones completadas esa semana
}

export async function getGeneralStats(
  userId: string
): Promise<{ stats: GeneralStats | null; error: Error | null }> {
  try {
    const now = new Date();

    // Inicio de esta semana (lunes)
    const thisMonday = new Date(now);
    thisMonday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    thisMonday.setHours(0, 0, 0, 0);

    // Inicio de la semana pasada
    const lastMonday = new Date(thisMonday);
    lastMonday.setDate(thisMonday.getDate() - 7);

    const { data, error } = await supabase
      .from('exercise_logs')
      .select(`
        sets_completed,
        actual_value,
        actual_weight_kg,
        block_exercises!inner ( name, exercise_type, routine_blocks!inner ( block_type ) ),
        workout_sessions!inner ( started_at, user_id )
      `)
      .eq('workout_sessions.user_id', userId)
      .gte('workout_sessions.started_at', lastMonday.toISOString())
      .not('actual_value', 'is', null);

    if (error) return { stats: null, error: new Error(error.message) };

    // También contar ejercicios distintos de toda la historia (sin calentamiento)
    const { data: allLogs, error: allError } = await supabase
      .from('exercise_logs')
      .select(`block_exercises!inner ( name, routine_blocks!inner ( block_type ) ), workout_sessions!inner ( user_id )`)
      .eq('workout_sessions.user_id', userId);

    if (allError) return { stats: null, error: new Error(allError.message) };

    const distinctExercises = new Set(
      (allLogs || [])
        .filter((r: any) => r.block_exercises.routine_blocks.block_type !== 'warmup')
        .map((r: any) => r.block_exercises.name)
    ).size;

    let volumeThisWeek = 0;
    let volumeLastWeek = 0;
    let totalSets = 0;

    for (const row of (data || []) as any[]) {
      if (row.block_exercises.routine_blocks.block_type === 'warmup') continue;
      const date = new Date(row.workout_sessions.started_at);
      const vol = rowVolume(
        row.block_exercises.exercise_type,
        row.sets_completed,
        row.actual_value ?? 0,
        row.actual_weight_kg ?? null
      );
      if (date >= thisMonday) {
        volumeThisWeek += vol;
        totalSets += row.sets_completed;
      } else {
        volumeLastWeek += vol;
      }
    }

    const volumeChange =
      volumeLastWeek === 0
        ? 100
        : Math.round(((volumeThisWeek - volumeLastWeek) / volumeLastWeek) * 100);

    return {
      stats: { volumeThisWeek, volumeLastWeek, volumeChange, distinctExercises, totalSets },
      error: null,
    };
  } catch {
    return { stats: null, error: new Error('Error al obtener estadísticas') };
  }
}

/**
 * Sesiones completadas por semana para las últimas N semanas (gráfico de barras).
 */
export async function getWeeklySessionsBars(
  userId: string,
  weeksBack = 8
): Promise<{ bars: WeeklySessionsBar[]; error: Error | null }> {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - weeksBack * 7);

    const { data, error } = await supabase
      .from('workout_sessions')
      .select('started_at')
      .eq('user_id', userId)
      .not('finished_at', 'is', null)
      .gte('started_at', cutoff.toISOString())
      .order('started_at', { ascending: true });

    if (error) return { bars: [], error: new Error(error.message) };

    // Agrupar por semana ISO
    const map = new Map<string, number>();
    for (const row of (data || []) as any[]) {
      const date = new Date(row.started_at);
      const week = `${date.getFullYear()}-W${String(getISOWeek(date)).padStart(2, '0')}`;
      map.set(week, (map.get(week) ?? 0) + 1);
    }

    // Rellenar semanas vacías
    const bars: WeeklySessionsBar[] = [];
    for (let i = weeksBack - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i * 7);
      const week = `${d.getFullYear()}-W${String(getISOWeek(d)).padStart(2, '0')}`;
      bars.push({
        label: `S${weeksBack - i}`,
        count: map.get(week) ?? 0,
      });
    }

    return { bars, error: null };
  } catch {
    return { bars: [], error: new Error('Error al obtener barras semanales') };
  }
}

// ── Seguimiento para el entrenador ────────────────────────────────────────────

export interface AdherenceStats {
  expectedSessions: number;
  completedSessions: number;
  adherenceRate: number; // 0-100
}

/**
 * Adherencia de un plan: sesiones completadas vs esperadas según
 * training_days, en las últimas `weeksBack` semanas.
 */
export async function getAdherenceRate(
  userId: string,
  planId: string,
  weeksBack = 4
): Promise<{ stats: AdherenceStats | null; error: Error | null }> {
  try {
    const { data: plan, error: planError } = await supabase
      .from('plans')
      .select('training_days')
      .eq('id', planId)
      .single();
    if (planError) return { stats: null, error: new Error(planError.message) };

    const trainingDays = plan?.training_days as number[] | null;
    if (!trainingDays || trainingDays.length === 0) return { stats: null, error: null };

    const expectedSessions = trainingDays.length * weeksBack;

    const { data: routines, error: routinesError } = await supabase
      .from('routines')
      .select('id')
      .eq('plan_id', planId);
    if (routinesError) return { stats: null, error: new Error(routinesError.message) };

    const routineIds = (routines ?? []).map((r) => r.id);
    if (routineIds.length === 0) {
      return { stats: { expectedSessions, completedSessions: 0, adherenceRate: 0 }, error: null };
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - weeksBack * 7);

    const { count, error: countError } = await supabase
      .from('workout_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .in('routine_id', routineIds)
      .not('finished_at', 'is', null)
      .gte('started_at', cutoff.toISOString());
    if (countError) return { stats: null, error: new Error(countError.message) };

    const completedSessions = count ?? 0;
    const adherenceRate = Math.min(100, Math.round((completedSessions / expectedSessions) * 100));

    return { stats: { expectedSessions, completedSessions, adherenceRate }, error: null };
  } catch {
    return { stats: null, error: new Error('Error al calcular adherencia') };
  }
}

export interface PlateauFlag {
  exercise_name: string;
  sessionsSincePR: number;
  lastPrAt: string;
}

/**
 * Ejercicios sin mejora reciente: el mejor registro (por rankScore/1RM
 * estimado) quedó fuera de las últimas `minSessions` veces que se hizo
 * ese ejercicio.
 */
export async function detectPlateaus(
  userId: string,
  minSessions = 3
): Promise<{ plateaus: PlateauFlag[]; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('exercise_logs')
      .select(`
        actual_value,
        actual_weight_kg,
        block_exercises!inner ( name, exercise_type, routine_blocks!inner ( block_type ) ),
        workout_sessions!inner ( started_at, user_id )
      `)
      .eq('workout_sessions.user_id', userId)
      .not('actual_value', 'is', null);

    if (error) return { plateaus: [], error: new Error(error.message) };

    const byExercise = new Map<string, { date: string; score: number }[]>();
    for (const row of (data ?? []) as any[]) {
      if (row.block_exercises.routine_blocks.block_type === 'warmup') continue;
      const name: string = row.block_exercises.name;
      const score = rankScore(row.block_exercises.exercise_type, row.actual_value, row.actual_weight_kg);
      if (!byExercise.has(name)) byExercise.set(name, []);
      byExercise.get(name)!.push({ date: row.workout_sessions.started_at, score });
    }

    const plateaus: PlateauFlag[] = [];
    for (const [name, entries] of byExercise) {
      if (entries.length < minSessions) continue;
      entries.sort((a, b) => a.date.localeCompare(b.date));

      let bestIdx = 0;
      for (let i = 1; i < entries.length; i++) {
        if (entries[i].score > entries[bestIdx].score) bestIdx = i;
      }

      const sessionsSincePR = entries.length - 1 - bestIdx;
      if (sessionsSincePR >= minSessions) {
        plateaus.push({ exercise_name: name, sessionsSincePR, lastPrAt: entries[bestIdx].date });
      }
    }

    return { plateaus, error: null };
  } catch {
    return { plateaus: [], error: new Error('Error al detectar estancamientos') };
  }
}

/**
 * Resumen compacto de desempeño real para inyectar en el prompt del
 * asistente IA al generar una rutina: PRs recientes (con 1RM estimado
 * cuando hay peso), estancamientos y adherencia — así "Generar con IA"
 * propone progresiones basadas en lo que el alumno realmente hizo, no en
 * una estimación genérica.
 */
export async function buildPerformanceSummary(
  userId: string,
  planId?: string
): Promise<string> {
  const [{ records }, { plateaus }] = await Promise.all([
    getAllPersonalRecords(userId),
    detectPlateaus(userId),
  ]);

  const parts: string[] = [];

  if (records.length > 0) {
    const top = [...records]
      .sort((a, b) => (b.estimated_1rm ?? b.best_value) - (a.estimated_1rm ?? a.best_value))
      .slice(0, 6);
    const prLines = top.map((r) =>
      r.estimated_1rm && r.best_weight_kg
        ? `${r.exercise_name}: ${r.best_sets}×${r.best_value} @ ${r.best_weight_kg}kg (1RM≈${Math.round(r.estimated_1rm)}kg)`
        : `${r.exercise_name}: mejor ${formatProgressValue(r.best_value, r.exercise_type)}`
    );
    parts.push(`Récords recientes del alumno: ${prLines.join('; ')}.`);
  }

  if (plateaus.length > 0) {
    const plateauLines = plateaus.map(
      (p) => `${p.exercise_name} (sin mejora hace ${p.sessionsSincePR} sesiones)`
    );
    parts.push(
      `Sin progreso reciente en: ${plateauLines.join(', ')}. Considerá variar el estímulo o ajustar volumen/intensidad ahí.`
    );
  }

  if (planId) {
    const { stats: adherence } = await getAdherenceRate(userId, planId);
    if (adherence) {
      parts.push(
        `Adherencia últimas 4 semanas: ${adherence.completedSessions}/${adherence.expectedSessions} sesiones (${adherence.adherenceRate}%).`
      );
    }
  }

  return parts.join(' ');
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/** Formatea el valor según el tipo de ejercicio */
export function formatProgressValue(
  value: number,
  exerciseType: 'reps' | 'time' | 'distance'
): string {
  switch (exerciseType) {
    case 'time':
      return value >= 60 ? `${Math.floor(value / 60)}m ${value % 60}s` : `${value}s`;
    case 'distance':
      return `${value}m`;
    default:
      return `${value} reps`;
  }
}

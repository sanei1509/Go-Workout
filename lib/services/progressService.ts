import { supabase } from '@/lib/supabase';

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface ExerciseHistoryEntry {
  session_id: string;
  date: string;           // ISO date of the session
  sets_completed: number;
  actual_value: number;
  exercise_type: 'reps' | 'time' | 'distance';
}

export interface PersonalRecord {
  exercise_name: string;
  exercise_type: 'reps' | 'time' | 'distance';
  best_value: number;     // max actual_value across all logs
  best_sets: number;      // sets_completed on the best session
  achieved_at: string;    // date of the PR
}

export interface VolumeEntry {
  period: string;         // 'YYYY-WW' for week, 'YYYY-MM' for month
  exercise_name: string;
  exercise_type: 'reps' | 'time' | 'distance';
  total_volume: number;   // SUM(sets_completed × actual_value)
  sessions_count: number;
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
        block_exercises!inner ( name, exercise_type ),
        workout_sessions!inner ( started_at, user_id )
      `)
      .eq('workout_sessions.user_id', userId)
      .eq('block_exercises.name', exerciseName)
      .not('actual_value', 'is', null)
      .order('workout_sessions(started_at)', { ascending: true })
      .limit(limit);

    if (error) return { history: [], error: new Error(error.message) };

    const history: ExerciseHistoryEntry[] = (data || []).map((row: any) => ({
      session_id: row.session_id,
      date: row.workout_sessions.started_at,
      sets_completed: row.sets_completed,
      actual_value: row.actual_value,
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
        block_exercises!inner ( name, exercise_type ),
        workout_sessions!inner ( started_at, user_id )
      `)
      .eq('workout_sessions.user_id', userId)
      .eq('block_exercises.name', exerciseName)
      .not('actual_value', 'is', null)
      .order('actual_value', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return { pr: null, error: new Error(error.message) };
    if (!data) return { pr: null, error: null };

    const pr: PersonalRecord = {
      exercise_name: exerciseName,
      exercise_type: (data as any).block_exercises.exercise_type,
      best_value: (data as any).actual_value,
      best_sets: (data as any).sets_completed,
      achieved_at: (data as any).workout_sessions.started_at,
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
        block_exercises!inner ( name, exercise_type ),
        workout_sessions!inner ( started_at, user_id )
      `)
      .eq('workout_sessions.user_id', userId)
      .not('actual_value', 'is', null)
      .order('actual_value', { ascending: false });

    if (error) return { records: [], error: new Error(error.message) };

    // Quedarse con el mejor por nombre de ejercicio
    const best = new Map<string, PersonalRecord>();
    for (const row of (data || []) as any[]) {
      const name: string = row.block_exercises.name;
      if (!best.has(name)) {
        best.set(name, {
          exercise_name: name,
          exercise_type: row.block_exercises.exercise_type,
          best_value: row.actual_value,
          best_sets: row.sets_completed,
          achieved_at: row.workout_sessions.started_at,
        });
      }
    }

    return { records: Array.from(best.values()), error: null };
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
        block_exercises!inner ( name, exercise_type ),
        workout_sessions!inner ( started_at, user_id )
      `)
      .eq('workout_sessions.user_id', userId)
      .gte('workout_sessions.started_at', cutoff.toISOString())
      .not('actual_value', 'is', null);

    if (error) return { volume: [], error: new Error(error.message) };

    // Agrupar en JS: { period+exercise_name → VolumeEntry }
    const map = new Map<string, VolumeEntry>();

    for (const row of (data || []) as any[]) {
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
      entry.total_volume += row.sets_completed * (row.actual_value ?? 0);
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
        block_exercises!inner ( name ),
        workout_sessions!inner ( started_at, user_id )
      `)
      .eq('workout_sessions.user_id', userId)
      .gte('workout_sessions.started_at', lastMonday.toISOString())
      .not('actual_value', 'is', null);

    if (error) return { stats: null, error: new Error(error.message) };

    // También contar ejercicios distintos de toda la historia
    const { data: allLogs, error: allError } = await supabase
      .from('exercise_logs')
      .select(`block_exercises!inner ( name ), workout_sessions!inner ( user_id )`)
      .eq('workout_sessions.user_id', userId);

    if (allError) return { stats: null, error: new Error(allError.message) };

    const distinctExercises = new Set(
      (allLogs || []).map((r: any) => r.block_exercises.name)
    ).size;

    let volumeThisWeek = 0;
    let volumeLastWeek = 0;
    let totalSets = 0;

    for (const row of (data || []) as any[]) {
      const date = new Date(row.workout_sessions.started_at);
      const vol = row.sets_completed * (row.actual_value ?? 0);
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

import { supabase } from '@/lib/supabase';
import { logExercise } from './workoutService';

export interface SetLog {
  id: string;
  session_id: string;
  exercise_id: string;
  set_number: number;
  reps_completed: number | null;
  actual_value: number | null;
  weight_kg: number | null;
  rir: number | null;
  skipped: boolean;
  notes: string | null;
  performed_name: string | null;
  created_at: string;
}

export interface CreateSetLogData {
  session_id: string;
  exercise_id: string;
  set_number: number;
  reps_completed?: number | null;
  actual_value?: number | null;
  weight_kg?: number | null;
  rir?: number | null;
  skipped?: boolean;
  notes?: string | null;
  performed_name?: string | null;
}

export async function insertSetLog(data: CreateSetLogData): Promise<{
  log: SetLog | null;
  error: Error | null;
}> {
  try {
    const { data: log, error } = await supabase
      .from('set_logs')
      .upsert(
        {
          session_id: data.session_id,
          exercise_id: data.exercise_id,
          set_number: data.set_number,
          reps_completed: data.reps_completed ?? null,
          actual_value: data.actual_value ?? null,
          weight_kg: data.weight_kg ?? null,
          rir: data.rir ?? null,
          skipped: data.skipped ?? false,
          notes: data.notes?.trim() || null,
          performed_name: data.performed_name?.trim() || null,
        },
        { onConflict: 'session_id,exercise_id,set_number' }
      )
      .select()
      .single();

    if (error) return { log: null, error: new Error(error.message) };
    return { log: log as SetLog, error: null };
  } catch {
    return { log: null, error: new Error('Error al registrar serie') };
  }
}

export async function getSessionSetLogs(sessionId: string): Promise<{
  logs: SetLog[];
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from('set_logs')
      .select('*')
      .eq('session_id', sessionId)
      .order('exercise_id')
      .order('set_number');

    if (error) return { logs: [], error: new Error(error.message) };
    return { logs: (data ?? []) as SetLog[], error: null };
  } catch {
    return { logs: [], error: new Error('Error al obtener series') };
  }
}

/** Resume set_logs → exercise_logs para compatibilidad con progreso/historial. */
export async function aggregateSessionExerciseLogs(sessionId: string): Promise<{
  error: Error | null;
}> {
  const { logs, error: fetchError } = await getSessionSetLogs(sessionId);
  if (fetchError) return { error: fetchError };

  const byExercise = new Map<string, SetLog[]>();
  for (const log of logs) {
    const arr = byExercise.get(log.exercise_id) ?? [];
    arr.push(log);
    byExercise.set(log.exercise_id, arr);
  }

  const { error: deleteError } = await supabase
    .from('exercise_logs')
    .delete()
    .eq('session_id', sessionId);

  if (deleteError) return { error: new Error(deleteError.message) };

  for (const [exerciseId, sets] of byExercise) {
    const done = sets.filter(s => !s.skipped);
    if (done.length === 0) continue;

    const repsValues = done.map(s => s.reps_completed ?? s.actual_value ?? 0).filter(v => v > 0);
    const weights = done.map(s => s.weight_kg).filter((w): w is number => w != null && w > 0);
    const avgReps = repsValues.length
      ? Math.round(repsValues.reduce((a, b) => a + b, 0) / repsValues.length)
      : 0;
    const maxWeight = weights.length ? Math.max(...weights) : null;

    if (avgReps <= 0) continue;

    const { error: logError } = await logExercise({
      session_id: sessionId,
      exercise_id: exerciseId,
      sets_completed: done.length,
      actual_value: avgReps,
      actual_weight_kg: maxWeight,
    });

    if (logError) return { error: logError };
  }

  return { error: null };
}

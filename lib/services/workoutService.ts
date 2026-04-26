import { supabase } from '@/lib/supabase';

export interface WorkoutSession {
  id: string;
  user_id: string;
  routine_id: string;
  started_at: string;
  finished_at: string | null;
  notes?: string;
  created_at: string;
}

export interface ExerciseLog {
  id: string;
  session_id: string;
  exercise_id: string;
  sets_completed: number;
  actual_value?: number;
  notes?: string;
  completed_at: string;
}

export interface CreateSessionData {
  user_id: string;
  routine_id: string;
}

export interface CreateExerciseLogData {
  session_id: string;
  exercise_id: string;
  sets_completed: number;
  actual_value?: number;
  notes?: string;
}

// Crear una nueva sesión de entrenamiento
export async function startWorkoutSession(data: CreateSessionData): Promise<{
  session: WorkoutSession | null;
  error: Error | null;
}> {
  try {
    const { data: session, error } = await supabase
      .from('workout_sessions')
      .insert({
        user_id: data.user_id,
        routine_id: data.routine_id,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return { session: null, error: new Error(error.message) };
    }

    return { session, error: null };
  } catch (e) {
    console.log('Exception starting workout session:', e);
    return { session: null, error: new Error('Error al iniciar entrenamiento') };
  }
}

// Finalizar una sesión de entrenamiento
export async function finishWorkoutSession(
  sessionId: string,
  notes?: string
): Promise<{
  session: WorkoutSession | null;
  error: Error | null;
}> {
  try {
    const { data: session, error } = await supabase
      .from('workout_sessions')
      .update({
        finished_at: new Date().toISOString(),
        notes: notes?.trim() || null,
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      return { session: null, error: new Error(error.message) };
    }

    return { session, error: null };
  } catch (e) {
    console.log('Exception finishing workout session:', e);
    return { session: null, error: new Error('Error al finalizar entrenamiento') };
  }
}

// Registrar ejercicio completado
export async function logExercise(data: CreateExerciseLogData): Promise<{
  log: ExerciseLog | null;
  error: Error | null;
}> {
  try {
    const { data: log, error } = await supabase
      .from('exercise_logs')
      .insert({
        session_id: data.session_id,
        exercise_id: data.exercise_id,
        sets_completed: data.sets_completed,
        actual_value: data.actual_value,
        notes: data.notes?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      return { log: null, error: new Error(error.message) };
    }

    return { log, error: null };
  } catch (e) {
    console.log('Exception logging exercise:', e);
    return { log: null, error: new Error('Error al registrar ejercicio') };
  }
}

// Actualizar log de ejercicio
export async function updateExerciseLog(
  logId: string,
  data: Partial<CreateExerciseLogData>
): Promise<{
  log: ExerciseLog | null;
  error: Error | null;
}> {
  try {
    const { data: log, error } = await supabase
      .from('exercise_logs')
      .update(data)
      .eq('id', logId)
      .select()
      .single();

    if (error) {
      return { log: null, error: new Error(error.message) };
    }

    return { log, error: null };
  } catch (e) {
    console.log('Exception updating exercise log:', e);
    return { log: null, error: new Error('Error al actualizar registro') };
  }
}

// Obtener sesiones de un usuario
export async function getUserSessions(userId: string, limit = 10): Promise<{
  sessions: WorkoutSession[];
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { sessions: [], error: new Error(error.message) };
    }

    return { sessions: data || [], error: null };
  } catch (e) {
    console.log('Exception fetching user sessions:', e);
    return { sessions: [], error: new Error('Error al obtener historial') };
  }
}

// Obtener sesión activa (sin finalizar) de un usuario
export async function getActiveSession(userId: string): Promise<{
  session: WorkoutSession | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('user_id', userId)
      .is('finished_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return { session: null, error: new Error(error.message) };
    }

    return { session: data, error: null };
  } catch (e) {
    console.log('Exception fetching active session:', e);
    return { session: null, error: new Error('Error al obtener sesión activa') };
  }
}

// Obtener logs de una sesión
export async function getSessionLogs(sessionId: string): Promise<{
  logs: ExerciseLog[];
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from('exercise_logs')
      .select('*')
      .eq('session_id', sessionId)
      .order('completed_at', { ascending: true });

    if (error) {
      return { logs: [], error: new Error(error.message) };
    }

    return { logs: data || [], error: null };
  } catch (e) {
    console.log('Exception fetching session logs:', e);
    return { logs: [], error: new Error('Error al obtener registros') };
  }
}

// Cancelar/eliminar sesión
export async function deleteSession(sessionId: string): Promise<{
  success: boolean;
  error: Error | null;
}> {
  try {
    const { error } = await supabase
      .from('workout_sessions')
      .delete()
      .eq('id', sessionId);

    if (error) {
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, error: null };
  } catch (e) {
    console.log('Exception deleting session:', e);
    return { success: false, error: new Error('Error al eliminar sesión') };
  }
}

// ---- GOW-49: Detalle completo de una sesión ----

export interface SessionExerciseLog {
  log_id: string;
  exercise_id: string;
  exercise_name: string;
  exercise_type: 'reps' | 'time' | 'distance';
  block_type: string;
  sets_completed: number;
  target_sets: number;
  actual_value: number | null;
  target_value: number;
  rest_seconds: number;
  notes?: string;
  completed_at: string;
}

export interface SessionDetail {
  session: {
    id: string;
    started_at: string;
    finished_at: string | null;
    notes?: string;
    duration: string;
    routine_name: string;
    plan_name: string;
    plan_discipline: string;
  };
  exercises: SessionExerciseLog[];
}

export async function getSessionDetail(sessionId: string): Promise<{
  detail: SessionDetail | null;
  error: Error | null;
}> {
  try {
    const [sessionResult, logsResult] = await Promise.all([
      supabase
        .from('workout_sessions')
        .select(`
          id, started_at, finished_at, notes,
          routines (
            name,
            plans ( name, discipline )
          )
        `)
        .eq('id', sessionId)
        .single(),

      supabase
        .from('exercise_logs')
        .select(`
          id, sets_completed, actual_value, notes, completed_at, exercise_id,
          block_exercises (
            name, exercise_type, sets, value, rest_seconds,
            routine_blocks ( block_type )
          )
        `)
        .eq('session_id', sessionId)
        .order('completed_at', { ascending: true }),
    ]);

    if (sessionResult.error) {
      return { detail: null, error: new Error(sessionResult.error.message) };
    }
    if (logsResult.error) {
      return { detail: null, error: new Error(logsResult.error.message) };
    }

    const s = sessionResult.data as any;
    const routine = s.routines;
    const plan = routine?.plans;

    const exercises: SessionExerciseLog[] = (logsResult.data || []).map((log: any) => {
      const ex = log.block_exercises;
      const block = ex?.routine_blocks;
      return {
        log_id: log.id,
        exercise_id: log.exercise_id,
        exercise_name: ex?.name ?? 'Ejercicio',
        exercise_type: ex?.exercise_type ?? 'reps',
        block_type: block?.block_type ?? 'main',
        sets_completed: log.sets_completed,
        target_sets: ex?.sets ?? 0,
        actual_value: log.actual_value ?? null,
        target_value: ex?.value ?? 0,
        rest_seconds: ex?.rest_seconds ?? 60,
        notes: log.notes ?? undefined,
        completed_at: log.completed_at,
      };
    });

    const detail: SessionDetail = {
      session: {
        id: s.id,
        started_at: s.started_at,
        finished_at: s.finished_at ?? null,
        notes: s.notes ?? undefined,
        duration: formatDuration(s.started_at, s.finished_at),
        routine_name: routine?.name ?? 'Rutina',
        plan_name: plan?.name ?? 'Plan',
        plan_discipline: plan?.discipline ?? '',
      },
      exercises,
    };

    return { detail, error: null };
  } catch (e) {
    console.log('Exception fetching session detail:', e);
    return { detail: null, error: new Error('Error al obtener detalle de sesión') };
  }
}

// Helper: Formatear duración
export function formatDuration(startedAt: string, finishedAt?: string | null): string {
  const start = new Date(startedAt);
  const end = finishedAt ? new Date(finishedAt) : new Date();
  const diffMs = end.getTime() - start.getTime();

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

// Helper: Formatear fecha relativa
export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Hoy';
  } else if (diffDays === 1) {
    return 'Ayer';
  } else if (diffDays < 7) {
    return `Hace ${diffDays} días`;
  } else {
    return date.toLocaleDateString('es-AR', {
      day: 'numeric',
      month: 'short',
    });
  }
}

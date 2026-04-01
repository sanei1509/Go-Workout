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

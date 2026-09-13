import { supabase } from '@/lib/supabase';
import { getSessionSetLogs } from './setLogService';
import { getRoutineById } from './routineService';

export type ProgressionAction = 'increase' | 'maintain' | 'repeat' | 'deload';

export interface WorkoutRecommendation {
  routineId: string;
  routineName: string;
  action: ProgressionAction;
  title: string;
  detail: string;
  completionRate: number | null;
}

interface SessionMetrics {
  sessionId: string;
  finishedAt: string;
  plannedSets: number;
  completedSets: number;
  skippedSets: number;
  avgRir: number | null;
  completionRate: number;
}

async function getPlannedSetCount(routineId: string): Promise<number> {
  const { routine } = await getRoutineById(routineId);
  if (!routine?.blocks) return 0;
  return routine.blocks.reduce(
    (sum, b) => sum + b.exercises.reduce((s, e) => s + e.sets, 0),
    0
  );
}

async function getSessionMetrics(sessionId: string, routineId: string): Promise<SessionMetrics | null> {
  const plannedSets = await getPlannedSetCount(routineId);
  const { logs } = await getSessionSetLogs(sessionId);
  if (plannedSets === 0 && logs.length === 0) return null;

  const completedSets = logs.filter(l => !l.skipped).length;
  const skippedSets = logs.filter(l => l.skipped).length;
  const rirValues = logs.map(l => l.rir).filter((r): r is number => r != null);
  const avgRir = rirValues.length
    ? rirValues.reduce((a, b) => a + b, 0) / rirValues.length
    : null;

  const denominator = plannedSets > 0 ? plannedSets : completedSets + skippedSets;
  const completionRate = denominator > 0 ? completedSets / denominator : 0;

  const { data: session } = await supabase
    .from('workout_sessions')
    .select('finished_at')
    .eq('id', sessionId)
    .single();

  return {
    sessionId,
    finishedAt: session?.finished_at ?? new Date().toISOString(),
    plannedSets,
    completedSets,
    skippedSets,
    avgRir,
    completionRate,
  };
}

function buildRecommendation(
  routineId: string,
  routineName: string,
  latest: SessionMetrics,
  previous: SessionMetrics | null
): WorkoutRecommendation {
  if (!previous) {
    return {
      routineId,
      routineName,
      action: 'maintain',
      title: 'Consolidá esta rutina',
      detail: 'Es tu primera sesión registrada con detalle. Repetí con la misma carga la próxima vez para afianzar la técnica.',
      completionRate: latest.completionRate,
    };
  }

  const improved = latest.completionRate >= previous.completionRate + 0.05;

  if (latest.completionRate >= 0.9 && (latest.avgRir == null || latest.avgRir >= 2)) {
    return {
      routineId,
      routineName,
      action: 'increase',
      title: 'Listo para progresar',
      detail: 'Cumpliste casi todo con buen margen. Subí 2.5 kg o 1–2 reps en los ejercicios principales.',
      completionRate: latest.completionRate,
    };
  }

  if (latest.avgRir != null && latest.avgRir <= 1 && latest.completionRate >= 0.75) {
    return {
      routineId,
      routineName,
      action: 'deload',
      title: 'Descargá un poco',
      detail: 'El esfuerzo fue muy alto (RIR bajo). Bajá 5–10% la carga o sacá una serie en accesorios.',
      completionRate: latest.completionRate,
    };
  }

  if (latest.completionRate < 0.75) {
    return {
      routineId,
      routineName,
      action: 'repeat',
      title: 'Repetí antes de subir',
      detail: `Completaste ${Math.round(latest.completionRate * 100)}% de las series. Repetí esta rutina con la misma carga antes de aumentar volumen.`,
      completionRate: latest.completionRate,
    };
  }

  if (improved) {
    return {
      routineId,
      routineName,
      action: 'maintain',
      title: 'Vas bien — mantené',
      detail: 'Mejoraste respecto a la sesión anterior. Conservá pesos y reps una semana más.',
      completionRate: latest.completionRate,
    };
  }

  return {
    routineId,
    routineName,
    action: 'maintain',
    title: 'Mantené el plan',
    detail: 'Seguí con los mismos pesos y reps. La constancia importa más que subir rápido.',
    completionRate: latest.completionRate,
  };
}

export async function getRecommendationForRoutine(
  userId: string,
  routineId: string
): Promise<{ recommendation: WorkoutRecommendation | null; error: Error | null }> {
  try {
    const { data: sessions, error } = await supabase
      .from('workout_sessions')
      .select('id, finished_at')
      .eq('user_id', userId)
      .eq('routine_id', routineId)
      .not('finished_at', 'is', null)
      .order('finished_at', { ascending: false })
      .limit(2);

    if (error) return { recommendation: null, error: new Error(error.message) };
    if (!sessions?.length) return { recommendation: null, error: null };

    const { routine } = await getRoutineById(routineId);
    if (!routine) return { recommendation: null, error: null };

    const latest = await getSessionMetrics(sessions[0].id, routineId);
    if (!latest) return { recommendation: null, error: null };

    const previous = sessions[1]
      ? await getSessionMetrics(sessions[1].id, routineId)
      : null;

    return {
      recommendation: buildRecommendation(routineId, routine.name, latest, previous),
      error: null,
    };
  } catch {
    return { recommendation: null, error: new Error('Error al calcular recomendación') };
  }
}

/** Recomendación más relevante: rutina de hoy o la última entrenada. */
export async function getPrimaryRecommendation(
  userId: string,
  todayRoutineIds: string[]
): Promise<{ recommendation: WorkoutRecommendation | null; error: Error | null }> {
  for (const routineId of todayRoutineIds) {
    const { recommendation } = await getRecommendationForRoutine(userId, routineId);
    if (recommendation) return { recommendation, error: null };
  }

  const { data: lastSession } = await supabase
    .from('workout_sessions')
    .select('routine_id')
    .eq('user_id', userId)
    .not('finished_at', 'is', null)
    .order('finished_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastSession?.routine_id) {
    return getRecommendationForRoutine(userId, lastSession.routine_id);
  }

  return { recommendation: null, error: null };
}

export function actionIcon(action: ProgressionAction): keyof typeof import('@expo/vector-icons').Ionicons.glyphMap {
  switch (action) {
    case 'increase': return 'trending-up';
    case 'deload': return 'trending-down';
    case 'repeat': return 'repeat';
    default: return 'checkmark-circle-outline';
  }
}

export function actionColor(action: ProgressionAction, T: { action: string; attention: string; done: string; textSecondary: string }): string {
  switch (action) {
    case 'increase': return T.done;
    case 'deload': return T.attention;
    case 'repeat': return T.action;
    default: return T.textSecondary;
  }
}

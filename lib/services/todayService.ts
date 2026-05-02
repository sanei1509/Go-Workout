import { supabase } from '@/lib/supabase';
import { Routine } from './routineService';
import { Plan } from './planService';
import { WorkoutSession } from './workoutService';

// Días de la semana en español
export const WEEKDAYS = [
  { value: 1, short: 'Lun', label: 'Lunes' },
  { value: 2, short: 'Mar', label: 'Martes' },
  { value: 3, short: 'Mié', label: 'Miércoles' },
  { value: 4, short: 'Jue', label: 'Jueves' },
  { value: 5, short: 'Vie', label: 'Viernes' },
  { value: 6, short: 'Sáb', label: 'Sábado' },
  { value: 7, short: 'Dom', label: 'Domingo' },
];

export interface TodayRoutineItem {
  routine: Routine;
  plan: Plan;
  alreadyTrainedToday: boolean;
  todaySession: WorkoutSession | null;
}

export interface TodayRoutineResult {
  items: TodayRoutineItem[];
  isRestDay: boolean;
}

export interface WeeklyStats {
  workoutsCompleted: number;
  workoutsPlanned: number;
  streak: number;
  lastWorkoutDate: string | null;
}

// Obtener día de la semana actual (1=Lunes, 7=Domingo)
export function getCurrentDayOfWeek(): number {
  const day = new Date().getDay();
  // JavaScript: 0=Domingo, 1=Lunes, ..., 6=Sábado
  // Convertir a: 1=Lunes, ..., 7=Domingo
  return day === 0 ? 7 : day;
}

// Obtener label del día
export function getDayLabel(dayNumber: number): string {
  return WEEKDAYS.find(d => d.value === dayNumber)?.label || `Día ${dayNumber}`;
}

export function getDayShort(dayNumber: number): string {
  return WEEKDAYS.find(d => d.value === dayNumber)?.short || `D${dayNumber}`;
}

// Obtener inicio y fin de hoy (para queries)
function getTodayRange(): { start: string; end: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = today.toISOString();

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const end = tomorrow.toISOString();

  return { start, end };
}

// Obtener inicio de la semana (Lunes)
function getWeekStart(): Date {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Ajustar para que Lunes sea el inicio
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// Obtener las rutinas del día para un usuario (todos sus planes activos)
export async function getTodayRoutine(userId: string): Promise<{
  result: TodayRoutineResult;
  error: Error | null;
}> {
  const empty: TodayRoutineResult = { items: [], isRestDay: true };

  try {
    const currentDay = getCurrentDayOfWeek();
    const { start: todayStart, end: todayEnd } = getTodayRange();

    // 1. Obtener todos los planes activos del usuario
    const { data: plans, error: plansError } = await supabase
      .from('plans')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('updated_at', { ascending: false });

    if (plansError) {
      return { result: empty, error: new Error(plansError.message) };
    }

    if (!plans || plans.length === 0) {
      return { result: empty, error: null };
    }

    // 2. Buscar rutinas del día actual para todos los planes (1 query)
    const planIds = plans.map(p => p.id);
    const { data: routines, error: routinesError } = await supabase
      .from('routines')
      .select('*')
      .in('plan_id', planIds)
      .eq('day_number', currentDay);

    if (routinesError) {
      return { result: empty, error: new Error(routinesError.message) };
    }

    if (!routines || routines.length === 0) {
      return { result: empty, error: null };
    }

    // 3. Verificar sesiones completadas hoy para esas rutinas (1 query)
    const routineIds = routines.map(r => r.id);
    const { data: todaySessions } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('user_id', userId)
      .in('routine_id', routineIds)
      .gte('started_at', todayStart)
      .lt('started_at', todayEnd)
      .not('finished_at', 'is', null);

    // 4. Construir items: una entry por rutina con su plan y estado
    const planMap = new Map(plans.map(p => [p.id, p]));
    const sessionByRoutine = new Map(
      (todaySessions || []).map(s => [s.routine_id, s])
    );

    const items: TodayRoutineItem[] = routines.map(routine => {
      const plan = planMap.get(routine.plan_id)!;
      const todaySession = sessionByRoutine.get(routine.id) || null;
      return {
        routine,
        plan,
        alreadyTrainedToday: !!todaySession,
        todaySession,
      };
    });

    return {
      result: { items, isRestDay: false },
      error: null,
    };
  } catch {
    return { result: empty, error: new Error('Error al obtener la rutina del día') };
  }
}

// Obtener estadísticas semanales
export async function getWeeklyStats(userId: string): Promise<{
  stats: WeeklyStats;
  error: Error | null;
}> {
  try {
    const weekStart = getWeekStart();
    const weekStartStr = weekStart.toISOString();

    // Obtener sesiones completadas esta semana
    const { data: sessions, error: sessionsError } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('user_id', userId)
      .gte('started_at', weekStartStr)
      .not('finished_at', 'is', null)
      .order('started_at', { ascending: false });

    if (sessionsError) {
      return {
        stats: {
          workoutsCompleted: 0,
          workoutsPlanned: 0,
          streak: 0,
          lastWorkoutDate: null,
        },
        error: new Error(sessionsError.message),
      };
    }

    const workoutsCompleted = sessions?.length || 0;

    // Sumar frecuencias de todos los planes activos
    const { data: plans } = await supabase
      .from('plans')
      .select('weekly_frequency')
      .eq('user_id', userId)
      .eq('is_active', true);

    const workoutsPlanned = (plans || []).reduce((sum, p) => sum + (p.weekly_frequency || 0), 0);

    // Calcular racha (días consecutivos)
    const streak = await calculateStreak(userId);

    // Último entrenamiento
    const lastWorkoutDate = sessions?.[0]?.started_at || null;

    return {
      stats: {
        workoutsCompleted,
        workoutsPlanned,
        streak,
        lastWorkoutDate,
      },
      error: null,
    };
  } catch {
    return {
      stats: {
        workoutsCompleted: 0,
        workoutsPlanned: 0,
        streak: 0,
        lastWorkoutDate: null,
      },
      error: new Error('Error al obtener estadísticas'),
    };
  }
}

// Calcular racha de días consecutivos
async function calculateStreak(userId: string): Promise<number> {
  try {
    // Obtener las últimas 30 sesiones para calcular racha
    const { data: sessions } = await supabase
      .from('workout_sessions')
      .select('started_at')
      .eq('user_id', userId)
      .not('finished_at', 'is', null)
      .order('started_at', { ascending: false })
      .limit(30);

    if (!sessions || sessions.length === 0) {
      return 0;
    }

    // Convertir a fechas únicas (sin hora)
    const uniqueDates = new Set<string>();
    sessions.forEach(s => {
      const date = new Date(s.started_at).toDateString();
      uniqueDates.add(date);
    });

    const sortedDates = Array.from(uniqueDates)
      .map(d => new Date(d))
      .sort((a, b) => b.getTime() - a.getTime());

    // Verificar si la racha incluye hoy o ayer
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const mostRecentDate = sortedDates[0];
    mostRecentDate.setHours(0, 0, 0, 0);

    // Si el último entrenamiento no fue hoy ni ayer, la racha es 0
    if (mostRecentDate.getTime() !== today.getTime() &&
        mostRecentDate.getTime() !== yesterday.getTime()) {
      return 0;
    }

    // Contar días consecutivos
    let streak = 1;
    for (let i = 1; i < sortedDates.length; i++) {
      const current = sortedDates[i - 1];
      const prev = sortedDates[i];

      current.setHours(0, 0, 0, 0);
      prev.setHours(0, 0, 0, 0);

      const diffDays = Math.floor((current.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  } catch {
    return 0;
  }
}

// Obtener historial de entrenamientos con info de rutina
export async function getWorkoutHistory(
  userId: string,
  limit = 20
): Promise<{
  sessions: (WorkoutSession & { routine_name?: string; plan_name?: string })[];
  error: Error | null;
}> {
  try {
    const { data: sessions, error } = await supabase
      .from('workout_sessions')
      .select(`
        *,
        routines (
          name,
          plans (
            name
          )
        )
      `)
      .eq('user_id', userId)
      .not('finished_at', 'is', null)
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { sessions: [], error: new Error(error.message) };
    }

    // Formatear respuesta
    const formattedSessions = (sessions || []).map(s => ({
      ...s,
      routine_name: s.routines?.name,
      plan_name: s.routines?.plans?.name,
      routines: undefined,
    }));

    return { sessions: formattedSessions, error: null };
  } catch {
    return { sessions: [], error: new Error('Error al obtener historial') };
  }
}

// Helper: Formatear duración en minutos
export function formatDurationMinutes(startedAt: string, finishedAt: string): number {
  const start = new Date(startedAt);
  const end = new Date(finishedAt);
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
}

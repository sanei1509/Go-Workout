import { supabase } from '@/lib/supabase';

export interface Plan {
  id: string;
  user_id: string;
  trainer_id: string | null;       // entrenador que lo asignó; null = plan propio
  name: string;
  discipline: string;
  weekly_frequency: number;
  training_days: number[] | null;  // [1,2,4] = lunes, martes, jueves
  is_active: boolean;
  // Para planes de entrenador: false = borrador, invisible para el alumno
  // (RLS lo exige). Los planes propios del alumno siempre son true.
  is_published: boolean;
  created_at: string;
  updated_at: string;
  routines_count?: number;
}

export interface CreatePlanData {
  name: string;
  discipline: string;
  weekly_frequency: number;
  training_days?: number[];
  trainer_id?: string;  // lo setea el entrenador al asignar un plan a un alumno
}

export interface UpdatePlanData {
  name?: string;
  discipline?: string;
  weekly_frequency?: number;
  is_active?: boolean;
}

// Disciplinas disponibles (fuente canónica en lib/constants/disciplines.ts)
export { DISCIPLINES } from '@/lib/constants/disciplines';

// Frecuencias con labels
export const FREQUENCIES = [
  { value: 1, label: '1 día por semana' },
  { value: 2, label: '2 días por semana' },
  { value: 3, label: '3 días por semana' },
  { value: 4, label: '4 días por semana' },
  { value: 5, label: '5 días por semana' },
  { value: 6, label: '6 días por semana' },
  { value: 7, label: 'Todos los días' },
];

export async function getUserPlans(userId: string): Promise<{
  plans: Plan[];
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('updated_at', { ascending: false });

    if (error) {
      return {
        plans: [],
        error: new Error(error.message),
      };
    }

    return {
      plans: data || [],
      error: null,
    };
  } catch {
    return {
      plans: [],
      error: new Error('Error al obtener planes'),
    };
  }
}

export async function getPlanById(planId: string): Promise<{
  plan: Plan | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (error) {
      return {
        plan: null,
        error: new Error(error.message),
      };
    }

    return {
      plan: data,
      error: null,
    };
  } catch {
    return {
      plan: null,
      error: new Error('Error al obtener el plan'),
    };
  }
}

export async function createPlan(
  userId: string,
  data: CreatePlanData
): Promise<{
  plan: Plan | null;
  error: Error | null;
}> {
  try {
    const { data: newPlan, error } = await supabase
      .from('plans')
      .insert({
        user_id: userId,
        name: data.name.trim(),
        discipline: data.discipline,
        weekly_frequency: data.weekly_frequency,
        training_days: data.training_days ?? null,
        trainer_id: data.trainer_id ?? null,
        // Un plan de entrenador nace en borrador: se publica cuando tiene contenido.
        is_published: !data.trainer_id,
      })
      .select()
      .single();

    if (error) {
      return {
        plan: null,
        error: new Error(error.message),
      };
    }

    return {
      plan: newPlan,
      error: null,
    };
  } catch {
    return {
      plan: null,
      error: new Error('Error al crear el plan'),
    };
  }
}

// Un plan de entrenador solo puede publicarse si ya tiene contenido real:
// al menos una rutina con al menos un ejercicio.
export async function canPublishPlan(planId: string): Promise<{
  canPublish: boolean;
  error: Error | null;
}> {
  const { data: routines, error: routinesError } = await supabase
    .from('routines')
    .select('id')
    .eq('plan_id', planId);

  if (routinesError) return { canPublish: false, error: new Error(routinesError.message) };
  if (!routines || routines.length === 0) return { canPublish: false, error: null };

  const { count, error: countError } = await supabase
    .from('block_exercises')
    .select('id, routine_blocks!inner(routine_id)', { count: 'exact', head: true })
    .in('routine_blocks.routine_id', routines.map((r) => r.id));

  if (countError) return { canPublish: false, error: new Error(countError.message) };
  return { canPublish: (count ?? 0) > 0, error: null };
}

export async function publishPlan(planId: string): Promise<{
  success: boolean;
  error: Error | null;
}> {
  const { canPublish, error: checkError } = await canPublishPlan(planId);
  if (checkError) return { success: false, error: checkError };
  if (!canPublish) {
    return {
      success: false,
      error: new Error('Agregá al menos una rutina con ejercicios antes de publicar'),
    };
  }

  const { error } = await supabase
    .from('plans')
    .update({ is_published: true, updated_at: new Date().toISOString() })
    .eq('id', planId);

  if (error) return { success: false, error: new Error(error.message) };
  return { success: true, error: null };
}

export async function updatePlan(
  planId: string,
  data: UpdatePlanData
): Promise<{
  plan: Plan | null;
  error: Error | null;
}> {
  try {
    const { data: updatedPlan, error } = await supabase
      .from('plans')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', planId)
      .select()
      .single();

    if (error) {
      return {
        plan: null,
        error: new Error(error.message),
      };
    }

    return {
      plan: updatedPlan,
      error: null,
    };
  } catch {
    return {
      plan: null,
      error: new Error('Error al actualizar el plan'),
    };
  }
}

export async function deletePlan(planId: string): Promise<{
  success: boolean;
  error: Error | null;
}> {
  try {
    // Soft delete - marcar como inactivo
    const { error } = await supabase
      .from('plans')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', planId);

    if (error) {
      return {
        success: false,
        error: new Error(error.message),
      };
    }

    return {
      success: true,
      error: null,
    };
  } catch {
    return {
      success: false,
      error: new Error('Error al eliminar el plan'),
    };
  }
}

// Planes que un entrenador le asignó a un alumno específico.
export async function getPlansAssignedByTrainer(
  trainerId: string,
  studentId: string
): Promise<{ plans: Plan[]; error: Error | null }> {
  const { data, error } = await supabase
    .from('plans')
    .select('*')
    .eq('trainer_id', trainerId)
    .eq('user_id', studentId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) return { plans: [], error: new Error(error.message) };
  return { plans: (data ?? []) as Plan[], error: null };
}

export function getFrequencyLabel(frequency: number): string {
  const freq = FREQUENCIES.find(f => f.value === frequency);
  return freq?.label || `${frequency} días por semana`;
}

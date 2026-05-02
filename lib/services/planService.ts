import { supabase } from '@/lib/supabase';

export interface Plan {
  id: string;
  user_id: string;
  name: string;
  discipline: string;
  weekly_frequency: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  routines_count?: number;
}

export interface CreatePlanData {
  name: string;
  discipline: string;
  weekly_frequency: number;
}

export interface UpdatePlanData {
  name?: string;
  discipline?: string;
  weekly_frequency?: number;
  is_active?: boolean;
}

// Disciplinas disponibles
export const DISCIPLINES = [
  'Musculación',
  'Crossfit',
  'Calistenia',
  'Funcional',
  'Running',
  'Natación',
  'Yoga',
  'Pilates',
  'Boxeo',
  'Artes Marciales',
  'Ciclismo',
  'HIIT',
  'Powerlifting',
  'Otro',
];

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

export function getFrequencyLabel(frequency: number): string {
  const freq = FREQUENCIES.find(f => f.value === frequency);
  return freq?.label || `${frequency} días por semana`;
}

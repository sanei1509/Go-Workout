import { supabase } from '@/lib/supabase';

// Tipos
export type BlockType = 'warmup' | 'main' | 'accessory' | 'cardio' | 'mobility';
export type ExerciseType = 'reps' | 'time' | 'distance';

export const BLOCK_TYPES: { value: BlockType; label: string; icon: string; color: string }[] = [
  { value: 'warmup', label: 'Calentamiento', icon: 'flame', color: '#F97316' },
  { value: 'main', label: 'Principal', icon: 'barbell', color: '#3B82F6' },
  { value: 'accessory', label: 'Accesorios', icon: 'fitness', color: '#8B5CF6' },
  { value: 'cardio', label: 'Cardio', icon: 'heart', color: '#EF4444' },
  { value: 'mobility', label: 'Movilidad', icon: 'body', color: '#10B981' },
];

export const EXERCISE_TYPES: { value: ExerciseType; label: string; unit: string }[] = [
  { value: 'reps', label: 'Repeticiones', unit: 'reps' },
  { value: 'time', label: 'Tiempo', unit: 'seg' },
  { value: 'distance', label: 'Distancia', unit: 'mts' },
];

export interface Exercise {
  id: string;
  block_id: string;
  name: string;
  exercise_type: ExerciseType;
  sets: number;
  value: number;
  rest_seconds: number;
  notes?: string;
  position: number;
}

export interface Block {
  id: string;
  routine_id: string;
  block_type: BlockType;
  position: number;
  exercises: Exercise[];
}

export interface Routine {
  id: string;
  plan_id: string;
  name: string;
  day_number: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  blocks?: Block[];
}

export interface CreateRoutineData {
  plan_id: string;
  name: string;
  day_number: number;
  notes?: string;
}

export interface CreateExerciseData {
  name: string;
  exercise_type: ExerciseType;
  sets: number;
  value: number;
  rest_seconds: number;
  notes?: string;
}

// Helpers
export function getBlockLabel(type: BlockType): string {
  return BLOCK_TYPES.find(b => b.value === type)?.label || type;
}

export function getBlockColor(type: BlockType): string {
  return BLOCK_TYPES.find(b => b.value === type)?.color || '#6B7280';
}

export function getBlockIcon(type: BlockType): string {
  return BLOCK_TYPES.find(b => b.value === type)?.icon || 'list';
}

export function getExerciseTypeLabel(type: ExerciseType): string {
  return EXERCISE_TYPES.find(e => e.value === type)?.label || type;
}

export function getExerciseUnit(type: ExerciseType): string {
  return EXERCISE_TYPES.find(e => e.value === type)?.unit || '';
}

export function formatExerciseValue(type: ExerciseType, value: number): string {
  switch (type) {
    case 'reps':
      return `${value} reps`;
    case 'time':
      if (value >= 60) {
        const mins = Math.floor(value / 60);
        const secs = value % 60;
        return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
      }
      return `${value}s`;
    case 'distance':
      if (value >= 1000) {
        return `${(value / 1000).toFixed(1)}km`;
      }
      return `${value}m`;
    default:
      return `${value}`;
  }
}

// API Functions
export async function getRoutinesByPlan(planId: string): Promise<{
  routines: Routine[];
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from('routines')
      .select('*')
      .eq('plan_id', planId)
      .order('day_number', { ascending: true });

    if (error) {
      return { routines: [], error: new Error(error.message) };
    }

    return { routines: data || [], error: null };
  } catch (e) {
    console.log('Exception fetching routines:', e);
    return { routines: [], error: new Error('Error al obtener rutinas') };
  }
}

export async function getRoutineById(routineId: string): Promise<{
  routine: Routine | null;
  error: Error | null;
}> {
  try {
    // Obtener rutina
    const { data: routine, error: routineError } = await supabase
      .from('routines')
      .select('*')
      .eq('id', routineId)
      .single();

    if (routineError) {
      return { routine: null, error: new Error(routineError.message) };
    }

    // Obtener bloques
    const { data: blocks, error: blocksError } = await supabase
      .from('routine_blocks')
      .select('*')
      .eq('routine_id', routineId)
      .order('position', { ascending: true });

    if (blocksError) {
      return { routine: null, error: new Error(blocksError.message) };
    }

    // Obtener ejercicios de todos los bloques
    const blockIds = blocks?.map(b => b.id) || [];
    let exercises: Exercise[] = [];

    if (blockIds.length > 0) {
      const { data: exercisesData } = await supabase
        .from('block_exercises')
        .select('*')
        .in('block_id', blockIds)
        .order('position', { ascending: true });

      exercises = exercisesData || [];
    }

    // Armar estructura
    const blocksWithExercises: Block[] = (blocks || []).map(block => ({
      ...block,
      exercises: exercises.filter(e => e.block_id === block.id),
    }));

    return {
      routine: {
        ...routine,
        blocks: blocksWithExercises,
      },
      error: null,
    };
  } catch (e) {
    console.log('Exception fetching routine:', e);
    return { routine: null, error: new Error('Error al obtener la rutina') };
  }
}

export async function createRoutine(data: CreateRoutineData): Promise<{
  routine: Routine | null;
  error: Error | null;
}> {
  try {
    const { data: newRoutine, error } = await supabase
      .from('routines')
      .insert({
        plan_id: data.plan_id,
        name: data.name.trim(),
        day_number: data.day_number,
        notes: data.notes?.trim() || null,
      })
      .select()
      .single();

    if (error) {
      return { routine: null, error: new Error(error.message) };
    }

    return { routine: newRoutine, error: null };
  } catch (e) {
    console.log('Exception creating routine:', e);
    return { routine: null, error: new Error('Error al crear la rutina') };
  }
}

export async function updateRoutine(
  routineId: string,
  data: Partial<CreateRoutineData>
): Promise<{
  routine: Routine | null;
  error: Error | null;
}> {
  try {
    const { data: updated, error } = await supabase
      .from('routines')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', routineId)
      .select()
      .single();

    if (error) {
      return { routine: null, error: new Error(error.message) };
    }

    return { routine: updated, error: null };
  } catch (e) {
    console.log('Exception updating routine:', e);
    return { routine: null, error: new Error('Error al actualizar la rutina') };
  }
}

export async function deleteRoutine(routineId: string): Promise<{
  success: boolean;
  error: Error | null;
}> {
  try {
    const { error } = await supabase
      .from('routines')
      .delete()
      .eq('id', routineId);

    if (error) {
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, error: null };
  } catch (e) {
    console.log('Exception deleting routine:', e);
    return { success: false, error: new Error('Error al eliminar la rutina') };
  }
}

// Bloques
export async function addBlock(
  routineId: string,
  blockType: BlockType
): Promise<{
  block: Block | null;
  error: Error | null;
}> {
  try {
    // Obtener la posición máxima actual
    const { data: existingBlocks } = await supabase
      .from('routine_blocks')
      .select('position')
      .eq('routine_id', routineId)
      .order('position', { ascending: false })
      .limit(1);

    const nextPosition = existingBlocks && existingBlocks.length > 0
      ? existingBlocks[0].position + 1
      : 0;

    const { data: newBlock, error } = await supabase
      .from('routine_blocks')
      .insert({
        routine_id: routineId,
        block_type: blockType,
        position: nextPosition,
      })
      .select()
      .single();

    if (error) {
      return { block: null, error: new Error(error.message) };
    }

    return {
      block: { ...newBlock, exercises: [] },
      error: null,
    };
  } catch (e) {
    console.log('Exception adding block:', e);
    return { block: null, error: new Error('Error al agregar bloque') };
  }
}

export async function deleteBlock(blockId: string): Promise<{
  success: boolean;
  error: Error | null;
}> {
  try {
    const { error } = await supabase
      .from('routine_blocks')
      .delete()
      .eq('id', blockId);

    if (error) {
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, error: null };
  } catch (e) {
    console.log('Exception deleting block:', e);
    return { success: false, error: new Error('Error al eliminar bloque') };
  }
}

// Ejercicios
export async function addExercise(
  blockId: string,
  data: CreateExerciseData
): Promise<{
  exercise: Exercise | null;
  error: Error | null;
}> {
  try {
    // Obtener la posición máxima actual
    const { data: existingExercises } = await supabase
      .from('block_exercises')
      .select('position')
      .eq('block_id', blockId)
      .order('position', { ascending: false })
      .limit(1);

    const nextPosition = existingExercises && existingExercises.length > 0
      ? existingExercises[0].position + 1
      : 0;

    const { data: newExercise, error } = await supabase
      .from('block_exercises')
      .insert({
        block_id: blockId,
        name: data.name.trim(),
        exercise_type: data.exercise_type,
        sets: data.sets,
        value: data.value,
        rest_seconds: data.rest_seconds,
        notes: data.notes?.trim() || null,
        position: nextPosition,
      })
      .select()
      .single();

    if (error) {
      return { exercise: null, error: new Error(error.message) };
    }

    return { exercise: newExercise, error: null };
  } catch (e) {
    console.log('Exception adding exercise:', e);
    return { exercise: null, error: new Error('Error al agregar ejercicio') };
  }
}

export async function updateExercise(
  exerciseId: string,
  data: Partial<CreateExerciseData>
): Promise<{
  exercise: Exercise | null;
  error: Error | null;
}> {
  try {
    const { data: updated, error } = await supabase
      .from('block_exercises')
      .update(data)
      .eq('id', exerciseId)
      .select()
      .single();

    if (error) {
      return { exercise: null, error: new Error(error.message) };
    }

    return { exercise: updated, error: null };
  } catch (e) {
    console.log('Exception updating exercise:', e);
    return { exercise: null, error: new Error('Error al actualizar ejercicio') };
  }
}

export async function deleteExercise(exerciseId: string): Promise<{
  success: boolean;
  error: Error | null;
}> {
  try {
    const { error } = await supabase
      .from('block_exercises')
      .delete()
      .eq('id', exerciseId);

    if (error) {
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, error: null };
  } catch (e) {
    console.log('Exception deleting exercise:', e);
    return { success: false, error: new Error('Error al eliminar ejercicio') };
  }
}

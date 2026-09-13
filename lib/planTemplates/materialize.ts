import { createPlan } from '@/lib/services/planService';
import { addBlock, addExercise, createRoutine } from '@/lib/services/routineService';
import { getCurrentDayOfWeek, getDayLabel } from '@/lib/services/todayService';
import { getTemplateById } from './templates';
import type { MaterializeTemplateOptions, MaterializeTemplateResult } from './types';

export function getNextTrainingDay(trainingDays: number[]): {
  dayNumber: number;
  isToday: boolean;
  label: string;
} {
  const sorted = [...trainingDays].sort((a, b) => a - b);
  const today = getCurrentDayOfWeek();
  if (sorted.includes(today)) {
    return { dayNumber: today, isToday: true, label: 'hoy' };
  }
  const next = sorted.find(d => d > today) ?? sorted[0];
  const isToday = false;
  const label = sorted.find(d => d > today) ? getDayLabel(next) : `el próximo ${getDayLabel(next)}`;
  return { dayNumber: next, isToday, label };
}

export async function materializePlanFromTemplate(
  options: MaterializeTemplateOptions
): Promise<{ result: MaterializeTemplateResult | null; error: Error | null }> {
  const template = getTemplateById(options.templateId);
  if (!template) {
    return { result: null, error: new Error('Plantilla no encontrada') };
  }

  const sortedDays = [...options.trainingDays].sort((a, b) => a - b);
  if (sortedDays.length < template.minDays || sortedDays.length > template.maxDays) {
    return {
      result: null,
      error: new Error(`Esta plantilla requiere ${template.minDays} día(s) de entrenamiento`),
    };
  }

  const routineCount = Math.min(sortedDays.length, template.routines.length);
  const { plan, error: planError } = await createPlan(options.userId, {
    name: options.planName?.trim() || template.name,
    discipline: template.discipline,
    weekly_frequency: sortedDays.length,
    training_days: sortedDays,
  });

  if (planError || !plan) {
    return { result: null, error: planError ?? new Error('No se pudo crear el plan') };
  }

  const routineIds: string[] = [];

  for (let i = 0; i < routineCount; i++) {
    const tplRoutine = template.routines[i];
    const dayNumber = sortedDays[i];

    const { routine, error: routineError } = await createRoutine({
      plan_id: plan.id,
      name: tplRoutine.name,
      day_number: dayNumber,
      notes: options.injuriesNotes?.trim()
        ? `Restricciones: ${options.injuriesNotes.trim()}`
        : undefined,
    });

    if (routineError || !routine) {
      return { result: null, error: routineError ?? new Error('Error al crear rutina') };
    }

    routineIds.push(routine.id);

    for (const tplBlock of tplRoutine.blocks) {
      const { block, error: blockError } = await addBlock(routine.id, tplBlock.block_type);
      if (blockError || !block) {
        return { result: null, error: blockError ?? new Error('Error al crear bloque') };
      }

      for (const ex of tplBlock.exercises) {
        const { error: exError } = await addExercise(block.id, {
          name: ex.name,
          exercise_type: ex.exercise_type,
          sets: ex.sets,
          value: ex.value,
          rest_seconds: ex.rest_seconds,
          notes: ex.notes,
        });
        if (exError) {
          return { result: null, error: exError };
        }
      }
    }
  }

  const next = getNextTrainingDay(sortedDays);
  const firstRoutineId = routineIds.find((_, idx) => sortedDays[idx] === next.dayNumber)
    ?? routineIds[0]
    ?? null;

  return {
    result: {
      planId: plan.id,
      routineIds,
      firstRoutineId,
      firstSessionDay: next.dayNumber,
      isFirstSessionToday: next.isToday,
    },
    error: null,
  };
}

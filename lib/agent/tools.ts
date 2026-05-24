// Tool definitions (JSON Schema) y ejecutores.
//
// Las DEFINITIONS se envían a Claude desde el backend para que el modelo sepa
// qué puede proponer. Las viven acá para mantener un solo lugar de verdad: el
// mock las usa para simular, y la Edge Function importará el mismo schema.
//
// Los EJECUTORES corren en el cliente cuando el alumno CONFIRMA una propuesta,
// y mapean la estructura propuesta a las funciones existentes de los servicios.

import {
  createRoutine,
  addBlock,
  addExercise,
  type BlockType,
  type ExerciseType,
} from '@/lib/services/routineService';
import { createPlan, type CreatePlanData } from '@/lib/services/planService';
import type { PlanProposal, RoutineProposal } from './types';

// ─── Schemas que Claude ve ───────────────────────────────────────────────────

const BLOCK_TYPE_VALUES: BlockType[] = ['warmup', 'main', 'accessory', 'cardio', 'mobility'];
const EXERCISE_TYPE_VALUES: ExerciseType[] = ['reps', 'time', 'distance'];

export const TOOL_DEFINITIONS = [
  {
    name: 'propose_plan',
    description:
      'Propone un nuevo plan de entrenamiento para el alumno. Un plan agrupa rutinas ' +
      'por disciplina y frecuencia semanal. Usá esta tool cuando el alumno quiera empezar ' +
      'un programa nuevo (ej. "armame un plan de musculación 4 días"). El plan se mostrará ' +
      'al alumno para que confirme antes de crearse.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nombre del plan, ej. "Hipertrofia 4 días"' },
        discipline: {
          type: 'string',
          description: 'Disciplina: Musculación, Crossfit, Calistenia, Funcional, Running, etc.',
        },
        weekly_frequency: {
          type: 'integer',
          description: 'Días de entrenamiento por semana (1-7)',
          enum: [1, 2, 3, 4, 5, 6, 7],
        },
        training_days: {
          type: 'array',
          description: 'Días de la semana (1=lunes ... 7=domingo). Opcional.',
          items: { type: 'integer', enum: [1, 2, 3, 4, 5, 6, 7] },
        },
      },
      required: ['name', 'discipline', 'weekly_frequency'],
      additionalProperties: false,
    },
  },
  {
    name: 'propose_routine',
    description:
      'Propone una rutina (un día de entrenamiento) con sus bloques y ejercicios. ' +
      'Usala cuando el alumno pida una rutina concreta (ej. "una rutina de pierna"). ' +
      'Organizá los ejercicios en bloques por tipo (calentamiento, principal, accesorios, ' +
      'cardio, movilidad). La rutina se mostrará al alumno para confirmar antes de crearse.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nombre de la rutina, ej. "Pierna - Fuerza"' },
        day_number: {
          type: 'integer',
          description: 'Número de día dentro del plan (1, 2, 3...).',
        },
        notes: { type: 'string', description: 'Notas generales de la rutina. Opcional.' },
        blocks: {
          type: 'array',
          description: 'Bloques de la rutina, en orden.',
          items: {
            type: 'object',
            properties: {
              block_type: {
                type: 'string',
                enum: BLOCK_TYPE_VALUES,
                description: 'Tipo de bloque',
              },
              exercises: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', description: 'Nombre del ejercicio' },
                    exercise_type: {
                      type: 'string',
                      enum: EXERCISE_TYPE_VALUES,
                      description: 'reps (repeticiones), time (segundos), distance (metros)',
                    },
                    sets: { type: 'integer', description: 'Número de series' },
                    value: {
                      type: 'integer',
                      description: 'Reps, segundos o metros según exercise_type',
                    },
                    rest_seconds: { type: 'integer', description: 'Descanso entre series, en segundos' },
                    notes: { type: 'string', description: 'Notas del ejercicio. Opcional.' },
                  },
                  required: ['name', 'exercise_type', 'sets', 'value', 'rest_seconds'],
                  additionalProperties: false,
                },
              },
            },
            required: ['block_type', 'exercises'],
            additionalProperties: false,
          },
        },
      },
      required: ['name', 'day_number', 'blocks'],
      additionalProperties: false,
    },
  },
] as const;

// ─── Ejecutores (corren al confirmar una propuesta) ──────────────────────────

export async function executePlanProposal(
  userId: string,
  proposal: PlanProposal
): Promise<{ planId: string | null; error: Error | null }> {
  const { plan, error } = await createPlan(userId, proposal.data);
  return { planId: plan?.id ?? null, error };
}

// Crea la rutina completa: rutina → bloques → ejercicios. Si algo falla a mitad,
// devuelve el error pero lo ya creado queda (no hay transacción server-side).
export async function executeRoutineProposal(
  proposal: RoutineProposal,
  resolvedPlanId: string
): Promise<{ routineId: string | null; error: Error | null }> {
  const { routine, error } = await createRoutine({
    plan_id: resolvedPlanId,
    name: proposal.name,
    day_number: proposal.day_number,
    notes: proposal.notes,
  });
  if (error || !routine) {
    return { routineId: null, error: error ?? new Error('No se pudo crear la rutina') };
  }

  for (const block of proposal.blocks) {
    const { block: created, error: blockError } = await addBlock(routine.id, block.block_type);
    if (blockError || !created) {
      return { routineId: routine.id, error: blockError ?? new Error('Error al crear bloque') };
    }
    for (const ex of block.exercises) {
      const { error: exError } = await addExercise(created.id, {
        name: ex.name,
        exercise_type: ex.exercise_type,
        sets: ex.sets,
        value: ex.value,
        rest_seconds: ex.rest_seconds,
        notes: ex.notes,
      });
      if (exError) {
        return { routineId: routine.id, error: exError };
      }
    }
  }

  return { routineId: routine.id, error: null };
}

// Helper para convertir el `CreatePlanData` derivado de los args de la tool.
export function planArgsToData(args: {
  name: string;
  discipline: string;
  weekly_frequency: number;
  training_days?: number[];
}): CreatePlanData {
  return {
    name: args.name,
    discipline: args.discipline,
    weekly_frequency: args.weekly_frequency,
    training_days: args.training_days,
  };
}

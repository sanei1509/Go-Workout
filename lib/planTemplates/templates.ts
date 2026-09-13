import type { PlanTemplate } from './types';

const W = (exercises: PlanTemplate['routines'][0]['blocks'][0]['exercises']) => exercises;

export const PLAN_TEMPLATES: PlanTemplate[] = [
  {
    id: 'full_body_strength_3',
    name: 'Fuerza cuerpo completo',
    description: '3 días de fuerza full body. Ideal para empezar en gimnasio.',
    discipline: 'Musculación',
    minDays: 3,
    maxDays: 3,
    locations: ['gym', 'both'],
    goals: ['strength', 'general_fitness'],
    experience: ['beginner', 'intermediate'],
    routines: [
      {
        name: 'Full Body A',
        blocks: [
          { block_type: 'warmup', exercises: W([
            { name: 'Movilidad articular', exercise_type: 'reps', sets: 1, value: 10, rest_seconds: 0 },
          ])},
          { block_type: 'main', exercises: W([
            { name: 'Sentadilla', exercise_type: 'reps', sets: 4, value: 8, rest_seconds: 90 },
            { name: 'Press de banca', exercise_type: 'reps', sets: 4, value: 8, rest_seconds: 90 },
            { name: 'Remo con barra', exercise_type: 'reps', sets: 4, value: 8, rest_seconds: 90 },
          ])},
          { block_type: 'accessory', exercises: W([
            { name: 'Press militar', exercise_type: 'reps', sets: 3, value: 10, rest_seconds: 60 },
            { name: 'Plancha', exercise_type: 'time', sets: 3, value: 30, rest_seconds: 45 },
          ])},
        ],
      },
      {
        name: 'Full Body B',
        blocks: [
          { block_type: 'warmup', exercises: W([
            { name: 'Activación de glúteos', exercise_type: 'reps', sets: 1, value: 12, rest_seconds: 0 },
          ])},
          { block_type: 'main', exercises: W([
            { name: 'Peso muerto', exercise_type: 'reps', sets: 4, value: 6, rest_seconds: 120 },
            { name: 'Press de banca inclinado', exercise_type: 'reps', sets: 3, value: 10, rest_seconds: 90 },
            { name: 'Jalones en polea alta', exercise_type: 'reps', sets: 3, value: 10, rest_seconds: 75 },
          ])},
          { block_type: 'accessory', exercises: W([
            { name: 'Zancadas', exercise_type: 'reps', sets: 3, value: 10, rest_seconds: 60 },
            { name: 'Curl con mancuernas', exercise_type: 'reps', sets: 3, value: 12, rest_seconds: 60 },
          ])},
        ],
      },
      {
        name: 'Full Body C',
        blocks: [
          { block_type: 'warmup', exercises: W([
            { name: 'Rotación de hombros', exercise_type: 'reps', sets: 1, value: 15, rest_seconds: 0 },
          ])},
          { block_type: 'main', exercises: W([
            { name: 'Sentadilla búlgara', exercise_type: 'reps', sets: 3, value: 10, rest_seconds: 75 },
            { name: 'Dominadas', exercise_type: 'reps', sets: 4, value: 6, rest_seconds: 90 },
            { name: 'Prensa de piernas', exercise_type: 'reps', sets: 3, value: 12, rest_seconds: 75 },
          ])},
          { block_type: 'accessory', exercises: W([
            { name: 'Face pull', exercise_type: 'reps', sets: 3, value: 15, rest_seconds: 45 },
            { name: 'Jalones de tríceps en polea', exercise_type: 'reps', sets: 3, value: 12, rest_seconds: 45 },
          ])},
        ],
      },
    ],
  },
  {
    id: 'hypertrophy_4',
    name: 'Hipertrofia 4 días',
    description: 'Split clásico pecho/espalda/piernas/hombros para ganar masa muscular.',
    discipline: 'Musculación',
    minDays: 4,
    maxDays: 4,
    locations: ['gym', 'both'],
    goals: ['hypertrophy'],
    experience: ['beginner', 'intermediate', 'advanced'],
    routines: [
      {
        name: 'Pecho y tríceps',
        blocks: [
          { block_type: 'warmup', exercises: W([
            { name: 'Rotación de hombros', exercise_type: 'reps', sets: 1, value: 15, rest_seconds: 0 },
          ])},
          { block_type: 'main', exercises: W([
            { name: 'Press de banca', exercise_type: 'reps', sets: 4, value: 10, rest_seconds: 90 },
            { name: 'Press de banca inclinado', exercise_type: 'reps', sets: 3, value: 10, rest_seconds: 75 },
            { name: 'Aperturas con mancuernas', exercise_type: 'reps', sets: 3, value: 12, rest_seconds: 60 },
          ])},
          { block_type: 'accessory', exercises: W([
            { name: 'Fondos en paralelas', exercise_type: 'reps', sets: 3, value: 10, rest_seconds: 60 },
            { name: 'Jalones de tríceps en polea', exercise_type: 'reps', sets: 3, value: 12, rest_seconds: 45 },
          ])},
        ],
      },
      {
        name: 'Espalda y bíceps',
        blocks: [
          { block_type: 'warmup', exercises: W([
            { name: 'Band pull-apart', exercise_type: 'reps', sets: 2, value: 15, rest_seconds: 0 },
          ])},
          { block_type: 'main', exercises: W([
            { name: 'Dominadas', exercise_type: 'reps', sets: 4, value: 8, rest_seconds: 90 },
            { name: 'Remo con barra', exercise_type: 'reps', sets: 4, value: 10, rest_seconds: 75 },
            { name: 'Jalones en polea alta', exercise_type: 'reps', sets: 3, value: 12, rest_seconds: 60 },
          ])},
          { block_type: 'accessory', exercises: W([
            { name: 'Curl con barra', exercise_type: 'reps', sets: 3, value: 12, rest_seconds: 45 },
            { name: 'Curl martillo', exercise_type: 'reps', sets: 3, value: 12, rest_seconds: 45 },
          ])},
        ],
      },
      {
        name: 'Piernas',
        blocks: [
          { block_type: 'warmup', exercises: W([
            { name: 'Activación de glúteos', exercise_type: 'reps', sets: 2, value: 12, rest_seconds: 0 },
          ])},
          { block_type: 'main', exercises: W([
            { name: 'Sentadilla', exercise_type: 'reps', sets: 4, value: 8, rest_seconds: 120 },
            { name: 'Prensa de piernas', exercise_type: 'reps', sets: 3, value: 12, rest_seconds: 90 },
            { name: 'Peso muerto rumano', exercise_type: 'reps', sets: 3, value: 10, rest_seconds: 90 },
          ])},
          { block_type: 'accessory', exercises: W([
            { name: 'Extensiones de cuádriceps', exercise_type: 'reps', sets: 3, value: 12, rest_seconds: 60 },
            { name: 'Puente de glúteos', exercise_type: 'reps', sets: 3, value: 15, rest_seconds: 45 },
          ])},
        ],
      },
      {
        name: 'Hombros y core',
        blocks: [
          { block_type: 'warmup', exercises: W([
            { name: 'Movilidad articular', exercise_type: 'reps', sets: 1, value: 10, rest_seconds: 0 },
          ])},
          { block_type: 'main', exercises: W([
            { name: 'Press militar', exercise_type: 'reps', sets: 4, value: 8, rest_seconds: 90 },
            { name: 'Elevaciones laterales', exercise_type: 'reps', sets: 3, value: 15, rest_seconds: 45 },
            { name: 'Face pull', exercise_type: 'reps', sets: 3, value: 15, rest_seconds: 45 },
          ])},
          { block_type: 'accessory', exercises: W([
            { name: 'Plancha', exercise_type: 'time', sets: 3, value: 45, rest_seconds: 45 },
            { name: 'Plancha lateral', exercise_type: 'time', sets: 2, value: 30, rest_seconds: 30 },
          ])},
        ],
      },
    ],
  },
  {
    id: 'home_start_3',
    name: 'Inicio en casa',
    description: '3 días con peso corporal y mínimo equipamiento. Perfecto para empezar sin gym.',
    discipline: 'Calistenia',
    minDays: 3,
    maxDays: 3,
    locations: ['home', 'both'],
    goals: ['general_fitness', 'fat_loss', 'strength'],
    experience: ['beginner', 'intermediate'],
    routines: [
      {
        name: 'Cuerpo completo A',
        blocks: [
          { block_type: 'warmup', exercises: W([
            { name: 'Jumping Jacks', exercise_type: 'time', sets: 1, value: 60, rest_seconds: 0 },
          ])},
          { block_type: 'main', exercises: W([
            { name: 'Flexiones de piso', exercise_type: 'reps', sets: 4, value: 10, rest_seconds: 60 },
            { name: 'Sentadilla', exercise_type: 'reps', sets: 4, value: 15, rest_seconds: 60 },
            { name: 'Puente de glúteos', exercise_type: 'reps', sets: 3, value: 15, rest_seconds: 45 },
          ])},
          { block_type: 'accessory', exercises: W([
            { name: 'Plancha', exercise_type: 'time', sets: 3, value: 30, rest_seconds: 45 },
          ])},
        ],
      },
      {
        name: 'Cuerpo completo B',
        blocks: [
          { block_type: 'warmup', exercises: W([
            { name: 'Movilidad articular', exercise_type: 'reps', sets: 1, value: 10, rest_seconds: 0 },
          ])},
          { block_type: 'main', exercises: W([
            { name: 'Zancadas', exercise_type: 'reps', sets: 3, value: 12, rest_seconds: 60 },
            { name: 'Flexiones de piso', exercise_type: 'reps', sets: 3, value: 12, rest_seconds: 60 },
            { name: 'Mountain climbers', exercise_type: 'time', sets: 3, value: 30, rest_seconds: 45 },
          ])},
          { block_type: 'accessory', exercises: W([
            { name: 'Plancha lateral', exercise_type: 'time', sets: 2, value: 25, rest_seconds: 30 },
          ])},
        ],
      },
      {
        name: 'Cuerpo completo C',
        blocks: [
          { block_type: 'warmup', exercises: W([
            { name: 'Activación de glúteos', exercise_type: 'reps', sets: 1, value: 12, rest_seconds: 0 },
          ])},
          { block_type: 'main', exercises: W([
            { name: 'Sentadilla búlgara', exercise_type: 'reps', sets: 3, value: 10, rest_seconds: 60 },
            { name: 'Flexiones de piso', exercise_type: 'reps', sets: 4, value: 8, rest_seconds: 75 },
            { name: 'Puente de glúteos', exercise_type: 'reps', sets: 3, value: 20, rest_seconds: 45 },
          ])},
          { block_type: 'accessory', exercises: W([
            { name: 'Plancha', exercise_type: 'time', sets: 3, value: 40, rest_seconds: 45 },
          ])},
        ],
      },
    ],
  },
  {
    id: 'mobility_conditioning_3',
    name: 'Movilidad y acondicionamiento',
    description: '3 días de movimiento, core y recuperación activa. Bajo impacto.',
    discipline: 'Funcional',
    minDays: 3,
    maxDays: 3,
    locations: ['gym', 'home', 'both'],
    goals: ['mobility', 'general_fitness', 'fat_loss'],
    experience: ['beginner', 'intermediate', 'advanced'],
    routines: [
      {
        name: 'Movilidad A',
        blocks: [
          { block_type: 'warmup', exercises: W([
            { name: 'Movilidad articular', exercise_type: 'reps', sets: 1, value: 10, rest_seconds: 0 },
          ])},
          { block_type: 'main', exercises: W([
            { name: 'Sentadilla', exercise_type: 'reps', sets: 3, value: 12, rest_seconds: 45 },
            { name: 'Puente de glúteos', exercise_type: 'reps', sets: 3, value: 15, rest_seconds: 45 },
            { name: 'Plancha', exercise_type: 'time', sets: 3, value: 40, rest_seconds: 30 },
          ])},
          { block_type: 'mobility', exercises: W([
            { name: 'Plancha lateral', exercise_type: 'time', sets: 2, value: 30, rest_seconds: 20 },
          ])},
        ],
      },
      {
        name: 'Acondicionamiento B',
        blocks: [
          { block_type: 'warmup', exercises: W([
            { name: 'Jumping Jacks', exercise_type: 'time', sets: 1, value: 45, rest_seconds: 0 },
          ])},
          { block_type: 'cardio', exercises: W([
            { name: 'Mountain climbers', exercise_type: 'time', sets: 4, value: 30, rest_seconds: 30 },
          ])},
          { block_type: 'main', exercises: W([
            { name: 'Zancadas', exercise_type: 'reps', sets: 3, value: 10, rest_seconds: 45 },
            { name: 'Flexiones de piso', exercise_type: 'reps', sets: 3, value: 10, rest_seconds: 45 },
          ])},
        ],
      },
      {
        name: 'Recuperación activa C',
        blocks: [
          { block_type: 'warmup', exercises: W([
            { name: 'Rotación de hombros', exercise_type: 'reps', sets: 1, value: 15, rest_seconds: 0 },
          ])},
          { block_type: 'mobility', exercises: W([
            { name: 'Plancha', exercise_type: 'time', sets: 2, value: 30, rest_seconds: 30 },
            { name: 'Plancha lateral', exercise_type: 'time', sets: 2, value: 25, rest_seconds: 25 },
          ])},
          { block_type: 'main', exercises: W([
            { name: 'Puente de glúteos', exercise_type: 'reps', sets: 3, value: 15, rest_seconds: 40 },
            { name: 'Sentadilla', exercise_type: 'reps', sets: 2, value: 15, rest_seconds: 40 },
          ])},
        ],
      },
    ],
  },
];

export function getTemplateById(id: string): PlanTemplate | undefined {
  return PLAN_TEMPLATES.find(t => t.id === id);
}

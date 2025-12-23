import { z } from 'zod';

export const GoalEnum = z.enum([
  'STRENGTH',
  'HYPERTROPHY',
  'ENDURANCE',
  'WEIGHT_LOSS',
  'GENERAL_FITNESS',
  'SPORT_SPECIFIC',
]);

export const LevelEnum = z.enum([
  'BEGINNER',
  'INTERMEDIATE',
  'ADVANCED',
]);

export const BlockTypeEnum = z.enum([
  'Warmup',
  'Strength',
  'Accessories',
  'Cardio',
  'Mobility',
  'Cooldown',
]);

export const ExerciseItemSchema = z.object({
  exerciseName: z.string().min(1),
  sets: z.number().int().positive().optional(),
  reps: z.union([z.number().int().positive(), z.string()]).optional(),
  restSeconds: z.number().int().nonnegative().optional(),
  rpeTarget: z.number().min(1).max(10).optional(),
  tempo: z.string().optional(),
  notes: z.string().optional(),
  alternatives: z.array(z.string()).optional(),
});

export const BlockSchema = z.object({
  blockName: BlockTypeEnum,
  items: z.array(ExerciseItemSchema).min(1),
});

export const DaySchema = z.object({
  dayName: z.string().min(1),
  blocks: z.array(BlockSchema).min(1),
});

export const RoutineSchema = z.object({
  routineName: z.string().min(1),
  goal: GoalEnum,
  level: LevelEnum,
  weeks: z.number().int().positive(),
  daysPerWeek: z.number().int().min(1).max(7),
  sessionMinutes: z.number().int().positive(),
  days: z.array(DaySchema).min(1),
});

export const GenerateRoutineInputSchema = z.object({
  goal: GoalEnum,
  level: LevelEnum,
  weeks: z.number().int().positive().max(16),
  daysPerWeek: z.number().int().min(1).max(7),
  sessionMinutes: z.number().int().positive().max(180),
  equipment: z.array(z.string()).optional(),
  injuries: z.array(z.string()).optional(),
  preferences: z.string().optional(),
});

export const AssignRoutineInputSchema = z.object({
  templateId: z.string().optional(),
  routine: RoutineSchema.optional(),
  studentIds: z.array(z.string()).min(1),
});

export const LogWorkoutInputSchema = z.object({
  assignmentId: z.string(),
  dayName: z.string(),
  rpe: z.number().int().min(1).max(10).optional(),
  soreness: z.number().int().min(1).max(10).optional(),
  comment: z.string().optional(),
});

export type Goal = z.infer<typeof GoalEnum>;
export type Level = z.infer<typeof LevelEnum>;
export type BlockType = z.infer<typeof BlockTypeEnum>;
export type ExerciseItem = z.infer<typeof ExerciseItemSchema>;
export type Block = z.infer<typeof BlockSchema>;
export type Day = z.infer<typeof DaySchema>;
export type Routine = z.infer<typeof RoutineSchema>;
export type GenerateRoutineInput = z.infer<typeof GenerateRoutineInputSchema>;
export type AssignRoutineInput = z.infer<typeof AssignRoutineInputSchema>;
export type LogWorkoutInput = z.infer<typeof LogWorkoutInputSchema>;

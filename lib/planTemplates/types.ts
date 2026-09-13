import type { BlockType, ExerciseType } from '@/lib/services/routineService';
import type { ExperienceLevel, PrimaryGoal, TrainingLocation } from '@/lib/services/trainingProfileService';

export interface TemplateExercise {
  name: string;
  exercise_type: ExerciseType;
  sets: number;
  value: number;
  rest_seconds: number;
  notes?: string;
}

export interface TemplateBlock {
  block_type: BlockType;
  exercises: TemplateExercise[];
}

export interface TemplateRoutine {
  name: string;
  blocks: TemplateBlock[];
}

export interface PlanTemplate {
  id: string;
  name: string;
  description: string;
  discipline: string;
  minDays: number;
  maxDays: number;
  routines: TemplateRoutine[];
  locations: TrainingLocation[];
  goals: PrimaryGoal[];
  experience: ExperienceLevel[];
}

export interface MaterializeTemplateOptions {
  userId: string;
  templateId: string;
  trainingDays: number[];
  planName?: string;
  injuriesNotes?: string | null;
}

export interface MaterializeTemplateResult {
  planId: string;
  routineIds: string[];
  firstRoutineId: string | null;
  firstSessionDay: number | null;
  isFirstSessionToday: boolean;
}

import { GenerateRoutineInput, Routine } from './routine.schema';

export interface AiRoutineGenerator {
  generateRoutine(input: GenerateRoutineInput): Promise<Routine>;
}

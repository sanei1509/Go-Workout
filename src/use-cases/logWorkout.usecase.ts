import {
  LogWorkoutInput,
  LogWorkoutInputSchema,
} from '@/src/domain/routine.schema';
import { WorkoutRepository } from '@/src/infrastructure/repositories/workoutRepository';
import { prisma } from '@/src/infrastructure/db/prisma';

export class LogWorkoutUseCase {
  constructor(private workoutRepo: WorkoutRepository) {}

  async execute(studentId: string, input: LogWorkoutInput) {
    const validatedInput = LogWorkoutInputSchema.parse(input);

    const assignment = await prisma.routineAssignment.findUnique({
      where: { id: validatedInput.assignmentId },
    });

    if (!assignment) {
      throw new Error('Assignment not found');
    }

    if (assignment.studentId !== studentId) {
      throw new Error('Unauthorized: This assignment does not belong to this student');
    }

    const workoutLog = await this.workoutRepo.logWorkout(validatedInput);

    return workoutLog;
  }
}

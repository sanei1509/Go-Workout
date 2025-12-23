import { prisma } from '@/src/infrastructure/db/prisma';
import { LogWorkoutInput } from '@/src/domain/routine.schema';

export class WorkoutRepository {
  async logWorkout(input: LogWorkoutInput) {
    return prisma.workoutLog.create({
      data: {
        assignmentId: input.assignmentId,
        dayName: input.dayName,
        rpe: input.rpe,
        soreness: input.soreness,
        comment: input.comment,
      },
    });
  }

  async getWorkoutLogsByAssignment(assignmentId: string) {
    return prisma.workoutLog.findMany({
      where: { assignmentId },
      orderBy: { completedAt: 'desc' },
    });
  }

  async getLatestLogForDay(assignmentId: string, dayName: string) {
    return prisma.workoutLog.findFirst({
      where: { assignmentId, dayName },
      orderBy: { completedAt: 'desc' },
    });
  }
}

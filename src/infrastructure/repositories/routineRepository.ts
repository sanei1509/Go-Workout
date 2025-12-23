import { prisma } from '@/src/infrastructure/db/prisma';
import { Routine } from '@/src/domain/routine.schema';

export class RoutineRepository {
  async createTemplate(trainerId: string, name: string, routine: Routine) {
    return prisma.routineTemplate.create({
      data: {
        trainerId,
        name,
        routine: routine as any,
      },
    });
  }

  async getTemplatesByTrainer(trainerId: string) {
    return prisma.routineTemplate.findMany({
      where: { trainerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createAssignment(
    studentId: string,
    trainerId: string,
    routine: Routine
  ) {
    const existingActive = await prisma.routineAssignment.findFirst({
      where: { studentId, isActive: true },
    });

    if (existingActive) {
      await prisma.routineAssignment.update({
        where: { id: existingActive.id },
        data: { isActive: false },
      });
    }

    const version = existingActive ? existingActive.version + 1 : 1;

    return prisma.routineAssignment.create({
      data: {
        studentId,
        trainerId,
        version,
        routine: routine as any,
        isActive: true,
      },
    });
  }

  async getActiveAssignmentByStudent(studentId: string) {
    return prisma.routineAssignment.findFirst({
      where: {
        studentId,
        isActive: true,
      },
      include: {
        trainer: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async getAssignmentHistory(studentId: string) {
    return prisma.routineAssignment.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      include: {
        trainer: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });
  }
}

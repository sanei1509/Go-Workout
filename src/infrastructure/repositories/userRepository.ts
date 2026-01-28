import { prisma } from '@/src/infrastructure/db/prisma';

export class UserRepository {
  async getStudentsByTrainer(trainerId: string) {
    const relations = await prisma.trainerStudent.findMany({
      where: { trainerId },
      include: {
        student: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
    });

    return relations.map((r) => r.student);
  }

  async verifyTrainerStudentRelation(trainerId: string, studentId: string) {
    const relation = await prisma.trainerStudent.findUnique({
      where: {
        trainerId_studentId: {
          trainerId,
          studentId,
        },
      },
    });

    return relation !== null;
  }

  async getUserById(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
    });
  }

  async getUserByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  async getAllUsers() {
    return prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
}

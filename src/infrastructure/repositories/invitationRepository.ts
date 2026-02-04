import { prisma } from '@/src/infrastructure/db/prisma';

export class InvitationRepository {
  async getPendingByStudent(studentId: string) {
    return prisma.invitation.findMany({
      where: {
        studentId,
        status: 'PENDING',
      },
      include: {
        trainer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}

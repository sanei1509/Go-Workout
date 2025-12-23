import {
  AssignRoutineInput,
  AssignRoutineInputSchema,
  RoutineSchema,
} from '@/src/domain/routine.schema';
import { RoutineRepository } from '@/src/infrastructure/repositories/routineRepository';
import { UserRepository } from '@/src/infrastructure/repositories/userRepository';
import { prisma } from '@/src/infrastructure/db/prisma';

export class AssignRoutineUseCase {
  constructor(
    private routineRepo: RoutineRepository,
    private userRepo: UserRepository
  ) {}

  async execute(trainerId: string, input: AssignRoutineInput) {
    const validatedInput = AssignRoutineInputSchema.parse(input);

    let routine;

    if (validatedInput.templateId) {
      const template = await prisma.routineTemplate.findUnique({
        where: { id: validatedInput.templateId },
      });

      if (!template) {
        throw new Error('Template not found');
      }

      if (template.trainerId !== trainerId) {
        throw new Error('Unauthorized: Template does not belong to this trainer');
      }

      routine = RoutineSchema.parse(template.routine);
    } else if (validatedInput.routine) {
      routine = validatedInput.routine;
    } else {
      throw new Error('Either templateId or routine must be provided');
    }

    const assignments = [];
    for (const studentId of validatedInput.studentIds) {
      const hasRelation = await this.userRepo.verifyTrainerStudentRelation(
        trainerId,
        studentId
      );

      if (!hasRelation) {
        throw new Error(
          `Trainer ${trainerId} is not authorized to assign routines to student ${studentId}`
        );
      }

      const assignment = await this.routineRepo.createAssignment(
        studentId,
        trainerId,
        routine
      );
      assignments.push(assignment);
    }

    return {
      routine,
      assignments,
    };
  }
}

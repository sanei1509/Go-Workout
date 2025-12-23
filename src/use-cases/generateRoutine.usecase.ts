import { AiRoutineGenerator } from '@/src/domain/ai';
import {
  GenerateRoutineInput,
  GenerateRoutineInputSchema,
  AssignRoutineInput,
  AssignRoutineInputSchema,
} from '@/src/domain/routine.schema';
import { RoutineRepository } from '@/src/infrastructure/repositories/routineRepository';
import { UserRepository } from '@/src/infrastructure/repositories/userRepository';

export class GenerateRoutineUseCase {
  constructor(
    private aiGenerator: AiRoutineGenerator,
    private routineRepo: RoutineRepository,
    private userRepo: UserRepository
  ) {}

  async execute(
    trainerId: string,
    generateInput: GenerateRoutineInput,
    assignInput?: AssignRoutineInput
  ) {
    const validatedGenerateInput = GenerateRoutineInputSchema.parse(generateInput);

    const routine = await this.aiGenerator.generateRoutine(validatedGenerateInput);

    const template = await this.routineRepo.createTemplate(
      trainerId,
      routine.routineName,
      routine
    );

    const assignments = [];
    if (assignInput?.studentIds && assignInput.studentIds.length > 0) {
      const validatedAssignInput = AssignRoutineInputSchema.parse({
        ...assignInput,
        routine,
      });

      for (const studentId of validatedAssignInput.studentIds) {
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
    }

    return {
      template,
      routine,
      assignments,
    };
  }
}

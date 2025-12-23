import { NextRequest, NextResponse } from 'next/server';
import { OpenAiRoutineGenerator } from '@/src/infrastructure/ai/openaiRoutineGenerator';
import { RoutineRepository } from '@/src/infrastructure/repositories/routineRepository';
import { UserRepository } from '@/src/infrastructure/repositories/userRepository';
import { GenerateRoutineUseCase } from '@/src/use-cases/generateRoutine.usecase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { trainerId, generateInput, assignInput } = body;

    if (!trainerId) {
      return NextResponse.json(
        { error: 'trainerId is required' },
        { status: 400 }
      );
    }

    if (!generateInput) {
      return NextResponse.json(
        { error: 'generateInput is required' },
        { status: 400 }
      );
    }

    const aiGenerator = new OpenAiRoutineGenerator();
    const routineRepo = new RoutineRepository();
    const userRepo = new UserRepository();
    const useCase = new GenerateRoutineUseCase(aiGenerator, routineRepo, userRepo);

    const result = await useCase.execute(trainerId, generateInput, assignInput);

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('Error in generate routine API:', error);

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

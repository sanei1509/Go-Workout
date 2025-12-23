import { NextRequest, NextResponse } from 'next/server';
import { WorkoutRepository } from '@/src/infrastructure/repositories/workoutRepository';
import { LogWorkoutUseCase } from '@/src/use-cases/logWorkout.usecase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { studentId, workoutInput } = body;

    if (!studentId) {
      return NextResponse.json(
        { error: 'studentId is required' },
        { status: 400 }
      );
    }

    if (!workoutInput) {
      return NextResponse.json(
        { error: 'workoutInput is required' },
        { status: 400 }
      );
    }

    const workoutRepo = new WorkoutRepository();
    const useCase = new LogWorkoutUseCase(workoutRepo);

    const result = await useCase.execute(studentId, workoutInput);

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('Error in log workout API:', error);

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

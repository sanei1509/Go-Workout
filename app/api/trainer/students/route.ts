import { NextRequest, NextResponse } from 'next/server';
import { UserRepository } from '@/src/infrastructure/repositories/userRepository';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const trainerId = searchParams.get('trainerId');

    if (!trainerId) {
      return NextResponse.json(
        { error: 'trainerId is required' },
        { status: 400 }
      );
    }

    const userRepo = new UserRepository();
    const students = await userRepo.getStudentsByTrainer(trainerId);

    return NextResponse.json(students);
  } catch (error: any) {
    console.error('Error getting trainer students:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

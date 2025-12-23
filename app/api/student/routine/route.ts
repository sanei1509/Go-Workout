import { NextRequest, NextResponse } from 'next/server';
import { RoutineRepository } from '@/src/infrastructure/repositories/routineRepository';
import { WorkoutRepository } from '@/src/infrastructure/repositories/workoutRepository';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json(
        { error: 'studentId is required' },
        { status: 400 }
      );
    }

    const routineRepo = new RoutineRepository();
    const workoutRepo = new WorkoutRepository();

    const assignment = await routineRepo.getActiveAssignmentByStudent(studentId);

    if (!assignment) {
      return NextResponse.json({
        assignment: null,
        workoutLogs: [],
      });
    }

    const workoutLogs = await workoutRepo.getWorkoutLogsByAssignment(assignment.id);

    return NextResponse.json({
      assignment,
      workoutLogs,
    });
  } catch (error: any) {
    console.error('Error getting student routine:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

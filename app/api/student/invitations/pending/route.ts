import { NextRequest, NextResponse } from 'next/server';
import { InvitationRepository } from '@/src/infrastructure/repositories/invitationRepository';

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

    const invitationRepo = new InvitationRepository();
    const invitations = await invitationRepo.getPendingByStudent(studentId);

    return NextResponse.json({ invitations });
  } catch (error: any) {
    console.error('Error getting pending invitations:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

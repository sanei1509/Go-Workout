import { NextResponse } from 'next/server';
import { UserRepository } from '@/src/infrastructure/repositories/userRepository';

export async function GET() {
  try {
    const userRepo = new UserRepository();
    const users = await userRepo.getAllUsers();

    return NextResponse.json(users);
  } catch (error: any) {
    console.error('Error getting users:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

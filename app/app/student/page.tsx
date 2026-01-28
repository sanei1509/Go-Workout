import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { LogoutButton } from '@/components/LogoutButton';
import { PendingInvitations } from '@/components/PendingInvitations';
import { UserRepository } from '@/src/infrastructure/repositories/userRepository';

export default async function StudentPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const userRepo = new UserRepository();
  const prismaUser = await userRepo.getUserByEmail(user.email!);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Go Workout</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user.email}</span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {prismaUser ? (
          <PendingInvitations studentId={prismaUser.id} />
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
            <p className="text-yellow-800">
              Tu cuenta no está vinculada con un perfil de alumno.
              Contactá a tu entrenador para recibir una invitación.
            </p>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Panel del Alumno</h2>
          <p className="text-gray-600">
            Bienvenido al panel de alumno. Próximamente podrás ver tus rutinas y registrar tus entrenamientos.
          </p>
        </div>
      </main>
    </div>
  );
}

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function OnboardingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Go Workout</h1>
            <p className="text-gray-500">Completá tu perfil</p>
          </div>

          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">
              Tu cuenta fue creada pero aún no tenés un perfil configurado.
            </p>
            <p className="text-sm text-gray-500">
              Próximamente podrás seleccionar tu rol (Entrenador o Alumno) y completar tu información.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

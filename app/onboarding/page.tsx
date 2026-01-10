'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { upsertProfile, type Role } from '@/lib/services/profileService';

export default function OnboardingPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      setUserId(user.id);
      setUserEmail(user.email || '');
    };

    getUser();
  }, [router]);

  const handleSelectRole = async (role: Role) => {
    if (!userId || !userEmail) return;

    setIsLoading(true);
    setError(null);

    const { error } = await upsertProfile({
      id: userId,
      email: userEmail,
      role,
    });

    if (error) {
      setError('Error al guardar el perfil. Intentá nuevamente.');
      setIsLoading(false);
      return;
    }

    // Redirigir según rol
    if (role === 'STUDENT') {
      router.push('/app/student');
    } else {
      router.push('/app/trainer');
    }
    router.refresh();
  };

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <p className="text-gray-500">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Go Workout</h1>
            <p className="text-gray-500">¿Cuál es tu rol?</p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Role selection */}
          <div className="space-y-4">
            <button
              onClick={() => handleSelectRole('STUDENT')}
              disabled={isLoading}
              className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
            >
              {isLoading ? 'Guardando...' : 'Soy Alumno'}
            </button>

            <button
              onClick={() => handleSelectRole('TRAINER')}
              disabled={isLoading}
              className="w-full py-4 px-6 bg-gray-800 hover:bg-gray-900 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
            >
              {isLoading ? 'Guardando...' : 'Soy Entrenador'}
            </button>
          </div>

          <p className="mt-6 text-center text-sm text-gray-500">
            Podés cambiar esto más adelante desde tu perfil
          </p>
        </div>
      </div>
    </div>
  );
}

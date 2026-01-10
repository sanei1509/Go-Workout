import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/src/infrastructure/db/prisma';

export default async function AppPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Buscar el perfil del usuario
  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
  });

  // Si no tiene perfil, ir a onboarding
  if (!profile || !profile.role) {
    redirect('/onboarding');
  }

  // Redirigir según el rol
  if (profile.role === 'TRAINER') {
    redirect('/app/trainer');
  } else {
    redirect('/app/student');
  }
}

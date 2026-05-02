import { supabase } from '@/lib/supabase';

export interface ActiveTrainer {
  id: string;
  full_name: string;
  discipline: string;
  plan_type: string;
  frequency: string;
  invitation_id: string;
  accepted_at: string;
}

export async function getStudentActiveTrainers(studentId: string): Promise<{
  trainers: ActiveTrainer[];
  error: Error | null;
}> {
  try {
    // Obtener invitaciones aceptadas del alumno
    const { data: invitations, error } = await supabase
      .from('invitations')
      .select('id, trainer_id, discipline, plan_type, frequency, updated_at')
      .eq('student_id', studentId)
      .eq('status', 'ACCEPTED')
      .order('updated_at', { ascending: false });

    if (error) {
      return {
        trainers: [],
        error: new Error(error.message),
      };
    }

    if (!invitations || invitations.length === 0) {
      return {
        trainers: [],
        error: null,
      };
    }

    // Obtener datos de los entrenadores
    const trainerIds = [...new Set(invitations.map(inv => inv.trainer_id))];

    const { data: trainers } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', trainerIds);

    const trainerMap = new Map(trainers?.map(t => [t.id, t]) || []);

    const activeTrainers: ActiveTrainer[] = invitations.map(inv => ({
      id: inv.trainer_id,
      full_name: trainerMap.get(inv.trainer_id)?.full_name || 'Entrenador',
      discipline: inv.discipline,
      plan_type: inv.plan_type,
      frequency: inv.frequency,
      invitation_id: inv.id,
      accepted_at: inv.updated_at,
    }));

    return {
      trainers: activeTrainers,
      error: null,
    };
  } catch {
    return {
      trainers: [],
      error: new Error('Error al obtener entrenadores'),
    };
  }
}

import { supabase } from '@/lib/supabase';

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export interface Invitation {
  id: string;
  trainer_id: string;
  student_id: string;
  discipline: string;
  plan_type: string;
  frequency: string;
  status: InvitationStatus;
  terms_text?: string;
  has_required_form: boolean;
  created_at: string;
  trainer?: {
    id: string;
    full_name: string;
  };
}

export async function getStudentPendingInvitations(studentId: string): Promise<{
  invitations: Invitation[];
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('student_id', studentId)
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false });

    // Si la tabla no existe o hay error, retornar vacío
    if (error) {
      console.log('Error fetching invitations:', error.message);
      return {
        invitations: [],
        error: null, // No mostrar error al usuario si la tabla no existe
      };
    }

    if (!data || data.length === 0) {
      return {
        invitations: [],
        error: null,
      };
    }

    // Obtener IDs únicos de entrenadores
    const trainerIds = [...new Set(data.map(inv => inv.trainer_id))];

    // Obtener datos de entrenadores en una sola consulta
    const { data: trainers } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', trainerIds);

    const trainerMap = new Map(trainers?.map(t => [t.id, t]) || []);

    const invitationsWithTrainer: Invitation[] = data.map(inv => ({
      ...inv,
      trainer: trainerMap.get(inv.trainer_id),
    }));

    return {
      invitations: invitationsWithTrainer,
      error: null,
    };
  } catch (e) {
    console.log('Exception fetching invitations:', e);
    return {
      invitations: [],
      error: null,
    };
  }
}

export async function getInvitationById(invitationId: string): Promise<{
  invitation: Invitation | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('id', invitationId)
      .single();

    if (error) {
      return {
        invitation: null,
        error: new Error(error.message),
      };
    }

    if (!data) {
      return {
        invitation: null,
        error: new Error('Invitación no encontrada'),
      };
    }

    // Obtener datos del entrenador
    const { data: trainer } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('id', data.trainer_id)
      .single();

    return {
      invitation: {
        ...data,
        trainer: trainer || undefined,
      },
      error: null,
    };
  } catch (e) {
    console.log('Exception fetching invitation:', e);
    return {
      invitation: null,
      error: new Error('Error al obtener la invitación'),
    };
  }
}

export async function acceptInvitation(invitationId: string): Promise<{
  success: boolean;
  error: Error | null;
}> {
  try {
    const { error } = await supabase
      .from('invitations')
      .update({
        status: 'ACCEPTED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', invitationId)
      .eq('status', 'PENDING');

    if (error) {
      return {
        success: false,
        error: new Error(error.message),
      };
    }

    // TODO: Crear relación trainer-student cuando se implemente esa funcionalidad

    return {
      success: true,
      error: null,
    };
  } catch (e) {
    console.log('Exception accepting invitation:', e);
    return {
      success: false,
      error: new Error('Error al aceptar la invitación'),
    };
  }
}

export async function rejectInvitation(invitationId: string): Promise<{
  success: boolean;
  error: Error | null;
}> {
  try {
    const { error } = await supabase
      .from('invitations')
      .update({
        status: 'REJECTED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', invitationId)
      .eq('status', 'PENDING');

    if (error) {
      return {
        success: false,
        error: new Error(error.message),
      };
    }

    return {
      success: true,
      error: null,
    };
  } catch (e) {
    console.log('Exception rejecting invitation:', e);
    return {
      success: false,
      error: new Error('Error al rechazar la invitación'),
    };
  }
}

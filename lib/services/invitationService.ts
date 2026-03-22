import { supabase } from '@/lib/supabase';

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export type FormField = 'age' | 'weight' | 'height' | 'injuries' | 'diseases' | 'goals' | 'experience';

export const FORM_FIELD_LABELS: Record<FormField, string> = {
  age: 'Edad',
  weight: 'Peso (kg)',
  height: 'Altura (cm)',
  injuries: 'Lesiones',
  diseases: 'Enfermedades',
  goals: 'Objetivos',
  experience: 'Experiencia previa',
};

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
  required_fields?: FormField[];
  created_at: string;
  trainer?: {
    id: string;
    full_name: string;
  };
  student?: {
    id: string;
    full_name: string;
  };
}

export interface CreateInvitationData {
  trainer_id: string;
  student_id: string;
  discipline: string;
  plan_type: string;
  frequency: string;
  terms_text?: string;
  has_required_form: boolean;
  required_fields?: FormField[];
}

export interface StudentFormData {
  invitation_id: string;
  student_id: string;
  trainer_id: string;
  age?: number;
  weight?: number;
  height?: number;
  injuries?: string;
  diseases?: string;
  goals?: string;
  experience?: string;
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

export async function submitStudentForm(formData: StudentFormData): Promise<{
  success: boolean;
  error: Error | null;
}> {
  try {
    const { error } = await supabase
      .from('student_forms')
      .insert({
        invitation_id: formData.invitation_id,
        student_id: formData.student_id,
        trainer_id: formData.trainer_id,
        age: formData.age || null,
        weight: formData.weight || null,
        height: formData.height || null,
        injuries: formData.injuries || null,
        diseases: formData.diseases || null,
        goals: formData.goals || null,
        experience: formData.experience || null,
      });

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
    console.log('Exception submitting form:', e);
    return {
      success: false,
      error: new Error('Error al enviar el formulario'),
    };
  }
}

export async function acceptInvitation(
  invitationId: string,
  formData?: Omit<StudentFormData, 'invitation_id' | 'student_id' | 'trainer_id'>
): Promise<{
  success: boolean;
  error: Error | null;
}> {
  try {
    // Primero obtener la invitación para saber si requiere formulario
    const { data: invitation, error: fetchError } = await supabase
      .from('invitations')
      .select('*')
      .eq('id', invitationId)
      .single();

    if (fetchError || !invitation) {
      return {
        success: false,
        error: new Error('No se encontró la invitación'),
      };
    }

    // Si requiere formulario, guardarlo primero
    if (invitation.has_required_form && formData) {
      const { error: formError } = await submitStudentForm({
        invitation_id: invitationId,
        student_id: invitation.student_id,
        trainer_id: invitation.trainer_id,
        ...formData,
      });

      if (formError) {
        return {
          success: false,
          error: formError,
        };
      }
    }

    // Actualizar estado de la invitación
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

// ==================== TRAINER FUNCTIONS ====================

export async function findStudentByEmail(email: string): Promise<{
  student: { id: string; full_name: string; email: string } | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('email', email.toLowerCase().trim())
      .eq('role', 'STUDENT')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return {
          student: null,
          error: new Error('No se encontró un alumno registrado con ese email'),
        };
      }
      return {
        student: null,
        error: new Error(error.message),
      };
    }

    return {
      student: data,
      error: null,
    };
  } catch (e) {
    console.log('Exception finding student:', e);
    return {
      student: null,
      error: new Error('Error al buscar estudiante'),
    };
  }
}

export async function getStudentsList(): Promise<{
  students: { id: string; full_name: string }[];
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'STUDENT')
      .order('full_name', { ascending: true });

    if (error) {
      return {
        students: [],
        error: new Error(error.message),
      };
    }

    return {
      students: data || [],
      error: null,
    };
  } catch (e) {
    console.log('Exception getting students:', e);
    return {
      students: [],
      error: new Error('Error al obtener estudiantes'),
    };
  }
}

export async function checkDuplicateInvitation(
  trainerId: string,
  studentId: string
): Promise<{
  exists: boolean;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from('invitations')
      .select('id')
      .eq('trainer_id', trainerId)
      .eq('student_id', studentId)
      .eq('status', 'PENDING')
      .limit(1);

    if (error) {
      return {
        exists: false,
        error: new Error(error.message),
      };
    }

    return {
      exists: data && data.length > 0,
      error: null,
    };
  } catch (e) {
    console.log('Exception checking duplicate:', e);
    return {
      exists: false,
      error: new Error('Error al verificar invitación existente'),
    };
  }
}

export async function createInvitation(data: CreateInvitationData): Promise<{
  invitation: Invitation | null;
  error: Error | null;
}> {
  try {
    // Verificar que no exista una invitación pendiente
    const { exists, error: dupError } = await checkDuplicateInvitation(
      data.trainer_id,
      data.student_id
    );

    if (dupError) {
      return {
        invitation: null,
        error: dupError,
      };
    }

    if (exists) {
      return {
        invitation: null,
        error: new Error('Ya existe una invitación pendiente para este alumno'),
      };
    }

    const { data: newInvitation, error } = await supabase
      .from('invitations')
      .insert({
        trainer_id: data.trainer_id,
        student_id: data.student_id,
        discipline: data.discipline,
        plan_type: data.plan_type,
        frequency: data.frequency,
        terms_text: data.terms_text || null,
        has_required_form: data.has_required_form,
        required_fields: data.required_fields || [],
        status: 'PENDING',
      })
      .select()
      .single();

    if (error) {
      return {
        invitation: null,
        error: new Error(error.message),
      };
    }

    return {
      invitation: newInvitation,
      error: null,
    };
  } catch (e) {
    console.log('Exception creating invitation:', e);
    return {
      invitation: null,
      error: new Error('Error al crear la invitación'),
    };
  }
}

export async function getTrainerInvitations(
  trainerId: string,
  statusFilter?: InvitationStatus
): Promise<{
  invitations: Invitation[];
  error: Error | null;
}> {
  try {
    let query = supabase
      .from('invitations')
      .select('*')
      .eq('trainer_id', trainerId)
      .order('created_at', { ascending: false });

    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;

    if (error) {
      console.log('Error fetching trainer invitations:', error.message);
      return {
        invitations: [],
        error: null,
      };
    }

    if (!data || data.length === 0) {
      return {
        invitations: [],
        error: null,
      };
    }

    // Obtener IDs únicos de estudiantes
    const studentIds = [...new Set(data.map(inv => inv.student_id))];

    // Obtener datos de estudiantes en una sola consulta
    const { data: students } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', studentIds);

    const studentMap = new Map(students?.map(s => [s.id, s]) || []);

    const invitationsWithStudent: Invitation[] = data.map(inv => ({
      ...inv,
      student: studentMap.get(inv.student_id),
    }));

    return {
      invitations: invitationsWithStudent,
      error: null,
    };
  } catch (e) {
    console.log('Exception fetching trainer invitations:', e);
    return {
      invitations: [],
      error: null,
    };
  }
}

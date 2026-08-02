import { supabase } from '@/lib/supabase';

// ─── Alumnos del entrenador (invitaciones ACCEPTED) ─────────────────────────

export interface TrainerStudent {
  student_id: string;
  full_name: string;
  email: string | null;
  avatar_url: string | null;
  discipline: string;
  plan_type: string;
  frequency: string;
  invitation_id: string;
  accepted_at: string;
  last_session_at: string | null;
}

export async function getTrainerStudents(trainerId: string): Promise<{
  students: TrainerStudent[];
  error: Error | null;
}> {
  try {
    const { data: invitations, error } = await supabase
      .from('invitations')
      .select('id, student_id, discipline, plan_type, frequency, updated_at')
      .eq('trainer_id', trainerId)
      .eq('status', 'ACCEPTED')
      .order('updated_at', { ascending: false });

    if (error) return { students: [], error: new Error(error.message) };
    if (!invitations || invitations.length === 0) return { students: [], error: null };

    const studentIds = [...new Set(invitations.map((inv) => inv.student_id))];

    const [{ data: profiles }, { data: sessions }] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', studentIds),
      // Última sesión por alumno (habilitado por la policy de solo lectura del trainer)
      supabase
        .from('workout_sessions')
        .select('user_id, started_at')
        .in('user_id', studentIds)
        .order('started_at', { ascending: false }),
    ]);

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);
    const lastSession = new Map<string, string>();
    for (const s of sessions ?? []) {
      if (!lastSession.has(s.user_id)) lastSession.set(s.user_id, s.started_at);
    }

    const students: TrainerStudent[] = invitations.map((inv) => {
      const p = profileMap.get(inv.student_id);
      return {
        student_id: inv.student_id,
        full_name: p?.full_name || 'Alumno',
        email: p?.email ?? null,
        avatar_url: p?.avatar_url ?? null,
        discipline: inv.discipline,
        plan_type: inv.plan_type,
        frequency: inv.frequency,
        invitation_id: inv.id,
        accepted_at: inv.updated_at,
        last_session_at: lastSession.get(inv.student_id) ?? null,
      };
    });

    return { students, error: null };
  } catch {
    return { students: [], error: new Error('Error al obtener alumnos') };
  }
}

// ─── Formulario del alumno (student_forms, RLS ya permite al trainer) ──────

export interface StudentForm {
  id: string;
  invitation_id: string;
  student_id: string;
  trainer_id: string;
  age: number | null;
  weight: number | null;
  height: number | null;
  injuries: string | null;
  diseases: string | null;
  goals: string | null;
  experience: string | null;
  created_at: string;
}

export async function getStudentForm(invitationId: string): Promise<{
  form: StudentForm | null;
  error: Error | null;
}> {
  const { data, error } = await supabase
    .from('student_forms')
    .select('*')
    .eq('invitation_id', invitationId)
    .maybeSingle();

  if (error) return { form: null, error: new Error(error.message) };
  return { form: (data as StudentForm) ?? null, error: null };
}

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

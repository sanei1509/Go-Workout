import { supabase } from '@/lib/supabase';

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';
export type TrainingLocation = 'gym' | 'home' | 'both';
export type PrimaryGoal =
  | 'strength'
  | 'hypertrophy'
  | 'fat_loss'
  | 'mobility'
  | 'general_fitness';

export interface TrainingProfile {
  user_id: string;
  experience_level: ExperienceLevel;
  training_location: TrainingLocation;
  primary_goal: PrimaryGoal;
  equipment: string[];
  injuries_notes: string | null;
  session_duration_minutes: number;
  safety_acknowledged_at: string | null;
  onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpsertTrainingProfileData {
  experience_level?: ExperienceLevel;
  training_location?: TrainingLocation;
  primary_goal?: PrimaryGoal;
  equipment?: string[];
  injuries_notes?: string | null;
  session_duration_minutes?: number;
  safety_acknowledged_at?: string | null;
  onboarding_completed_at?: string | null;
}

export async function getTrainingProfile(userId: string): Promise<{
  profile: TrainingProfile | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from('training_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) return { profile: null, error: new Error(error.message) };
    return { profile: data as TrainingProfile | null, error: null };
  } catch {
    return { profile: null, error: new Error('Error al obtener perfil de entrenamiento') };
  }
}

export async function upsertTrainingProfile(
  userId: string,
  data: UpsertTrainingProfileData
): Promise<{ profile: TrainingProfile | null; error: Error | null }> {
  try {
    const { data: profile, error } = await supabase
      .from('training_profiles')
      .upsert(
        {
          user_id: userId,
          ...data,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (error) return { profile: null, error: new Error(error.message) };
    return { profile: profile as TrainingProfile, error: null };
  } catch {
    return { profile: null, error: new Error('Error al guardar perfil de entrenamiento') };
  }
}

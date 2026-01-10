import { createClient } from '@/lib/supabase/client';

export type Role = 'TRAINER' | 'STUDENT';

export interface Profile {
  id: string;
  email: string;
  role: Role;
  full_name?: string;
  created_at?: string;
}

export async function upsertProfile(profile: { id: string; email: string; role: Role }): Promise<{ error: Error | null }> {
  const supabase = createClient();

  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: profile.id,
      role: profile.role,
      full_name: profile.email.split('@')[0],
    }, { onConflict: 'id' });

  return { error: error ? new Error(error.message) : null };
}

export async function getProfile(id: string): Promise<{ profile: Profile | null; error: Error | null }> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single();

  return {
    profile: data as Profile | null,
    error: error ? new Error(error.message) : null
  };
}

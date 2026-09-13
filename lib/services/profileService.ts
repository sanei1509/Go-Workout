import { supabase } from '@/lib/supabase';

export type Role = 'TRAINER' | 'STUDENT';

export interface Profile {
  id: string;
  email: string;
  role: Role;
  full_name?: string;
  avatar_url?: string;
  disciplines?: string[];  // solo TRAINER: 1-3 disciplinas que acotan su flujo
  created_at?: string;
}

export async function upsertProfile(profile: { id: string; email: string; role: Role }): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: profile.id,
      email: profile.email,
      role: profile.role,
      full_name: profile.email.split('@')[0],
    }, { onConflict: 'id' });

  return { error: error ? new Error(error.message) : null };
}

export async function updateProfile(
  id: string,
  data: { full_name?: string; avatar_url?: string; disciplines?: string[] }
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('profiles')
    .update(data)
    .eq('id', id);

  return { error: error ? new Error(error.message) : null };
}

export async function uploadAvatar(
  userId: string,
  uri: string,
  mimeType: string
): Promise<{ url: string | null; error: Error | null }> {
  try {
    const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
    const path = `${userId}/avatar.${ext}`;

    const response = await fetch(uri);
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, arrayBuffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      return { url: null, error: new Error(uploadError.message) };
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    // Bust cache con timestamp
    const url = `${data.publicUrl}?t=${Date.now()}`;
    return { url, error: null };
  } catch {
    return { url: null, error: new Error('Error al subir la imagen') };
  }
}

export async function getProfile(id: string): Promise<{ profile: Profile | null; error: Error | null }> {
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

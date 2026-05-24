import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase';
import {
  completeOAuthFromUrl,
  getOAuthRedirectUri,
  logOAuthRedirectUriForSupabase,
  resetOAuthState,
  validateOAuthAuthorizeUrl,
} from '@/lib/auth/oauth';
import { getProfile, Profile, Role, upsertProfile } from '@/lib/services/profileService';

WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  setRole: (role: Role) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const authEpochRef = useRef(0);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth changes — defer async work to avoid deadlocks during OAuth exchange
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT') {
          authEpochRef.current += 1;
        }
        if (event === 'SIGNED_IN') {
          setIsLoading(true);
        }
        setSession(session);
        setUser(session?.user ?? null);

        setTimeout(async () => {
          if (session?.user) {
            await loadProfile(session.user.id);
          } else {
            setProfile(null);
            setIsLoading(false);
          }
        }, 0);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string) => {
    const epoch = authEpochRef.current;
    const { profile, error } = await getProfile(userId);
    if (epoch !== authEpochRef.current) return;
    if (!error && profile) {
      setProfile(profile);
    }
    setIsLoading(false);
  };

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user.id);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // Actualizar email en el perfil si no está guardado
    if (!error && data.user) {
      await supabase
        .from('profiles')
        .update({ email: email.toLowerCase() })
        .eq('id', data.user.id)
        .is('email', null);
    }

    return { error: error ? new Error(error.message) : null };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { error: error ? new Error(error.message) : null };
  };

  const signInWithGoogle = async () => {
    try {
      await WebBrowser.warmUpAsync();

      const redirectTo = logOAuthRedirectUriForSupabase();

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error) return { error: new Error(error.message) };
      if (!data?.url) return { error: new Error('No se pudo obtener la URL de autenticación') };

      const redirectMismatch = validateOAuthAuthorizeUrl(data.url, redirectTo);
      if (redirectMismatch) return { error: redirectMismatch };

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, {
        preferEphemeralSession: true,
      });
      await WebBrowser.coolDownAsync();

      if (result.type === 'cancel' || result.type === 'dismiss') {
        return { error: null };
      }

      if (result.type === 'success') {
        return completeOAuthFromUrl(result.url);
      }

      return { error: null };
    } catch (e: any) {
      return { error: new Error(e.message ?? 'Error desconocido') };
    }
  };

  const signOut = async () => {
    authEpochRef.current += 1;
    resetOAuthState();
    setSession(null);
    setUser(null);
    setProfile(null);
    setIsLoading(false);

    const { error: globalError } = await supabase.auth.signOut({ scope: 'global' });
    if (globalError) {
      const { error: localError } = await supabase.auth.signOut({ scope: 'local' });
      if (localError) {
        return { error: new Error(localError.message) };
      }
    }
    return { error: null };
  };

  const setRole = async (role: Role) => {
    if (!user?.email) {
      return { error: new Error('No user logged in') };
    }
    const result = await upsertProfile({
      id: user.id,
      email: user.email,
      role,
    });
    if (!result.error) {
      await refreshProfile();
    }
    return result;
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        isLoading,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        setRole,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

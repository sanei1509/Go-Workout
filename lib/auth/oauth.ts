import Constants from 'expo-constants';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import { supabase } from '@/lib/supabase';

/**
 * URL a la que Supabase redirige tras Google OAuth.
 * Se calcula en cada login (no cachear en import) para que coincida con el bundler actual.
 *
 * En Supabase → Auth → URL Configuration:
 * - Site URL: NO usar localhost:3000 salvo que tengas web ahí. Usar goworkout://auth/callback
 * - Redirect URLs: agregar la URL que imprime __DEV__ al iniciar sesión con Google
 */
export function getOAuthRedirectUri(): string {
  const fromEnv = process.env.EXPO_PUBLIC_AUTH_REDIRECT_URI?.trim();
  if (fromEnv) return fromEnv;

  return makeRedirectUri({
    scheme: 'goworkout',
    path: 'auth/callback',
    // Dev build / standalone: siempre goworkout://auth/callback
    native: 'goworkout://auth/callback',
    // Expo Go: fuerza 127.0.0.1 en lugar de IP LAN (más estable con la allowlist)
    preferLocalhost: true,
  });
}

function parseAuthCodeFromCallbackUrl(url: string): string | null {
  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (errorCode) throw new Error(errorCode);
  const code = params.code;
  if (!code) return null;
  return code.replace(/(%23|#)+$/g, '');
}

function assertRedirectInOAuthUrl(oauthUrl: string, expectedRedirect: string): void {
  try {
    const redirectTo = new URL(oauthUrl).searchParams.get('redirect_to');
    if (redirectTo !== expectedRedirect) {
      console.warn(
        '[OAuth] redirect_to en la URL de Supabase no coincide.\n',
        '  Esperado:', expectedRedirect,
        '\n  Recibido:', redirectTo,
        '\n  Si Recibido es localhost:3000, cambia Site URL en el dashboard de Supabase.',
      );
    }
  } catch {
    // ignore parse errors
  }
}

/** Evita intercambiar el mismo code dos veces (login + deep link compiten). */
let pendingExchange: Promise<{ error: Error | null }> | null = null;

export function resetOAuthState() {
  pendingExchange = null;
}

async function exchangeIfNeeded(cleanCode: string): Promise<{ error: Error | null }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) return { error: null };

  if (pendingExchange) return pendingExchange;

  pendingExchange = (async () => {
    try {
      const { data: { session: existing } } = await supabase.auth.getSession();
      if (existing) return { error: null };

      const { error } = await supabase.auth.exchangeCodeForSession(cleanCode);
      if (error) {
        const { data: { session: afterError } } = await supabase.auth.getSession();
        if (afterError) return { error: null };
        return { error: new Error(error.message) };
      }
      return { error: null };
    } finally {
      pendingExchange = null;
    }
  })();

  return pendingExchange;
}

export async function completeOAuthWithCode(code: string): Promise<{ error: Error | null }> {
  const cleanCode = code.replace(/(%23|#)+$/g, '');
  return exchangeIfNeeded(cleanCode);
}

export async function completeOAuthFromUrl(url: string): Promise<{ error: Error | null }> {
  const code = parseAuthCodeFromCallbackUrl(url);
  if (!code) {
    return { error: new Error('No se recibió el código de autenticación') };
  }
  return completeOAuthWithCode(code);
}

export function logOAuthRedirectUriForSupabase() {
  const uri = getOAuthRedirectUri();
  if (__DEV__) {
    console.log(
      '[OAuth] Agrega esta URL en Supabase → Auth → Redirect URLs:\n',
      uri,
      '\n[OAuth] hostUri del bundler:', Constants.expoConfig?.hostUri ?? '(n/a)',
    );
  }
  return uri;
}

export function validateOAuthAuthorizeUrl(oauthUrl: string, redirectTo: string): Error | null {
  assertRedirectInOAuthUrl(oauthUrl, redirectTo);
  try {
    const parsed = new URL(oauthUrl);
    const redirectParam = parsed.searchParams.get('redirect_to') ?? '';
    if (redirectParam.includes('localhost:3000')) {
      return new Error(
        'Supabase está redirigiendo a localhost:3000. En el dashboard cambia Site URL y agrega tu redirect de Expo en Redirect URLs.',
      );
    }
  } catch {
    // ignore
  }
  return null;
}

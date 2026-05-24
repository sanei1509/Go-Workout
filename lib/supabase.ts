import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { digest, getRandomValues, CryptoDigestAlgorithm } from 'expo-crypto';

// Polyfill crypto.subtle para que Supabase PKCE use s256 en lugar de plain
if (typeof global.crypto === 'undefined') {
  (global as any).crypto = {};
}
if (typeof (global.crypto as any).subtle === 'undefined') {
  (global as any).crypto.subtle = {
    digest: (algorithm: string, data: BufferSource) =>
      digest(CryptoDigestAlgorithm.SHA256, data as ArrayBuffer),
  };
}
if (typeof global.crypto.getRandomValues === 'undefined') {
  (global as any).crypto.getRandomValues = getRandomValues;
}

const webStorage = {
  getItem: async (key: string) => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(key);
  },
  setItem: async (key: string, value: string) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, value);
  },
  removeItem: async (key: string) => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(key);
  },
};

const authStorage = Platform.OS === 'web' ? webStorage : AsyncStorage;

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: authStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});

import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { completeOAuthFromUrl, completeOAuthWithCode } from '@/lib/auth/oauth';
import { supabase } from '@/lib/supabase';

const WAIT_FOR_PARAMS_MS = 150;
const WAIT_FOR_SESSION_MS = 800;

export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<{ code?: string | string[] }>();
  const linkingUrl = Linking.useURL();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Los params del deep link pueden llegar un tick después del mount
      await new Promise((resolve) => setTimeout(resolve, WAIT_FOR_PARAMS_MS));
      if (cancelled) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.replace('/');
        return;
      }

      const codeParam = Array.isArray(params.code) ? params.code[0] : params.code;
      let result: { error: Error | null };

      if (codeParam) {
        result = await completeOAuthWithCode(codeParam);
      } else if (linkingUrl?.includes('code=')) {
        result = await completeOAuthFromUrl(linkingUrl);
      } else {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl?.includes('code=')) {
          result = await completeOAuthFromUrl(initialUrl);
        } else {
          // openAuthSessionAsync puede estar completando el intercambio en login
          await new Promise((resolve) => setTimeout(resolve, WAIT_FOR_SESSION_MS));
          if (cancelled) return;

          const { data: { session: retrySession } } = await supabase.auth.getSession();
          if (retrySession) {
            router.replace('/');
            return;
          }
          router.replace('/login');
          return;
        }
      }

      if (cancelled) return;

      if (result.error) {
        router.replace('/login');
        return;
      }

      router.replace('/');
    })();

    return () => {
      cancelled = true;
    };
  }, [linkingUrl, params.code]);

  return (
    <View className="flex-1 items-center justify-center bg-[#090f12]">
      <ActivityIndicator size="large" color="#00d1ff" />
    </View>
  );
}

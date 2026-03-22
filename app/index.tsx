import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function Index() {
  const { session, profile, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  // Not logged in -> go to login
  if (!session) {
    return <Redirect href="/login" />;
  }

  // Logged in but no profile -> go to onboarding
  if (!profile) {
    return <Redirect href="/onboarding" />;
  }

  // Has profile -> go to appropriate panel
  if (profile.role === 'TRAINER') {
    return <Redirect href="/(app)/trainer" />;
  }

  return <Redirect href="/(app)/student" />;
}

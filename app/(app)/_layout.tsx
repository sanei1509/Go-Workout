import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { View, ActivityIndicator } from 'react-native';

export default function AppLayout() {
  const { session, profile, isLoading } = useAuth();

  // Keep this loading gate: rendering nested navigators before auth/profile
  // resolution can race navigation context initialization on cold starts.
  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (!profile) {
    return <Redirect href="/onboarding" />;
  }

  // Always render the Stack so nested navigators (Tabs inside student/_layout)
  // always have a parent navigation context available.
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="trainer" />
      <Stack.Screen name="student" />
    </Stack>
  );
}

import { Tabs, useRootNavigationState } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View } from 'react-native';

export default function StudentTabsLayout() {
  const rootNavigationState = useRootNavigationState();
  const isNavigationReady = Boolean(rootNavigationState?.key);

  // Defensive guard: avoid mounting Tabs before the root navigation context
  // is ready, which can trigger intermittent "Couldn't find a navigation context"
  // on fresh accounts/initial app load.
  if (!isNavigationReady) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="invitations"
        options={{
          title: 'Invitaciones',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="mail" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="invitation/[id]"
        options={{
          href: null, // Ocultar de los tabs
        }}
      />
      <Tabs.Screen
        name="plan/create"
        options={{
          href: null, // Ocultar de los tabs
        }}
      />
      <Tabs.Screen
        name="plan/[id]"
        options={{
          href: null, // Ocultar de los tabs
        }}
      />
      <Tabs.Screen
        name="routine/create"
        options={{
          href: null, // Ocultar de los tabs
        }}
      />
      <Tabs.Screen
        name="routine/[id]"
        options={{
          href: null, // Ocultar de los tabs
        }}
      />
      <Tabs.Screen
        name="workout/[routineId]"
        options={{
          href: null, // Ocultar de los tabs
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          href: null, // Ocultar de los tabs
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          href: null, // Ocultar de los tabs
        }}
      />
      <Tabs.Screen
        name="session/[id]"
        options={{
          href: null, // Ocultar de los tabs
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          href: null, // Ocultar de los tabs
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          href: null, // Ocultar de los tabs
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          href: null, // Ocultar de los tabs
        }}
      />
    </Tabs>
  );
}

import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function StudentTabsLayout() {
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
    </Tabs>
  );
}

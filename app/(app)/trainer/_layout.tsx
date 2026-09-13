import { useState, useCallback } from 'react';
import { Tabs, useRootNavigationState, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View, Text } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getTrainerInvitations } from '@/lib/services/invitationService';
import { useTheme } from '@/contexts/ThemeContext';

function ProfileTabIcon({ focused }: { focused: boolean }) {
  const { profile, user } = useAuth();
  const { T, activeTheme } = useTheme();
  const actionDimBg = activeTheme === 'dark' ? '#00566a' : '#e0f7fa';
  const letter = (profile?.full_name || user?.email || 'E').charAt(0).toUpperCase();
  return (
    <View style={{
      width: 28, height: 28, borderRadius: 14,
      backgroundColor: focused ? actionDimBg : T.border,
      borderWidth: focused ? 1.5 : 1,
      borderColor: focused ? T.action : T.border,
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{
        color: focused ? T.action : T.textSecondary,
        fontSize: 13,
        fontFamily: 'SpaceGrotesk_700Bold',
      }}>
        {letter}
      </Text>
    </View>
  );
}

export default function TrainerLayout() {
  const rootNavigationState = useRootNavigationState();
  const isNavigationReady = Boolean(rootNavigationState?.key);
  const { user } = useAuth();
  const { T, activeTheme } = useTheme();
  const [pendingCount, setPendingCount] = useState<number | undefined>(undefined);

  // Refresca el badge al volver a cualquier tab (las invitaciones cambian seguido)
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        getTrainerInvitations(user.id, 'PENDING').then(({ invitations }) => {
          setPendingCount(invitations.length > 0 ? invitations.length : undefined);
        });
      }
    }, [user?.id])
  );

  if (!isNavigationReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: T.surface }}>
        <ActivityIndicator size="large" color={T.action} />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: T.surfaceElevated,
          borderTopWidth: 1,
          borderTopColor: T.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: T.action,
        tabBarInactiveTintColor: T.textSecondary,
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: 'SpaceGrotesk_700Bold',
          letterSpacing: 0.5,
        },
        // Header para pantallas anidadas (alumno, plan, rutina, etc.)
        headerShown: true,
        headerStyle: { backgroundColor: T.surface },
        headerTintColor: T.action,
        headerTitleStyle: { fontFamily: 'SpaceGrotesk_600SemiBold', color: T.textPrimary, fontSize: 15 },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Inicio',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="students/index"
        options={{
          title: 'Alumnos',
          headerTitle: 'Mis alumnos',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="invitations"
        options={{
          title: 'Invitaciones',
          headerShown: false,
          tabBarBadge: pendingCount,
          tabBarBadgeStyle: { backgroundColor: T.attention, color: activeTheme === 'dark' ? '#7a5500' : '#fff', fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold' },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="mail-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          headerShown: false,
          tabBarIcon: ({ focused }) => <ProfileTabIcon focused={focused} />,
        }}
      />

      {/* Pantallas sin tab ─────────────────────────────────────── */}
      <Tabs.Screen name="create-invitation"         options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="students/[id]/index"       options={{ href: null }} />
      <Tabs.Screen name="students/[id]/assign-plan" options={{ href: null, headerShown: false }} />
      <Tabs.Screen name="plan/[id]"                 options={{ href: null }} />
      <Tabs.Screen name="routine/create"            options={{ href: null }} />
      <Tabs.Screen name="routine/[id]"              options={{ href: null }} />
      <Tabs.Screen name="coach"                     options={{ href: null, headerShown: false }} />
    </Tabs>
  );
}

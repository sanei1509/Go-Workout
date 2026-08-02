import { useState, useCallback } from 'react';
import { Tabs, useRootNavigationState, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View, Text } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getTrainerInvitations } from '@/lib/services/invitationService';

const BG     = '#090f12';
const CARD   = '#141c1f';
const BORDER = '#3c494e';
const PRIMARY = '#00D1FF';
const PRIMARY_DIM = '#00566a';
const NEUTRAL = '#71787B';
const TEXT_HI = '#dde3e7';

function ProfileTabIcon({ focused }: { focused: boolean }) {
  const { profile, user } = useAuth();
  const letter = (profile?.full_name || user?.email || 'E').charAt(0).toUpperCase();
  return (
    <View style={{
      width: 28, height: 28, borderRadius: 14,
      backgroundColor: focused ? PRIMARY_DIM : '#1a2123',
      borderWidth: focused ? 1.5 : 1,
      borderColor: focused ? PRIMARY : BORDER,
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{
        color: focused ? PRIMARY : NEUTRAL,
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
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: BG }}>
        <ActivityIndicator size="large" color={PRIMARY} />
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: CARD,
          borderTopWidth: 1,
          borderTopColor: BORDER,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: PRIMARY,
        tabBarInactiveTintColor: NEUTRAL,
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: 'SpaceGrotesk_700Bold',
          letterSpacing: 0.5,
        },
        // Header para pantallas anidadas (alumno, plan, rutina, etc.)
        headerShown: true,
        headerStyle: { backgroundColor: BG },
        headerTintColor: PRIMARY,
        headerTitleStyle: { fontFamily: 'SpaceGrotesk_600SemiBold', color: TEXT_HI, fontSize: 15 },
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
          tabBarBadgeStyle: { backgroundColor: '#FEB127', color: '#7a5500', fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold' },
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

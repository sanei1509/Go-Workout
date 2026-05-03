import { useState, useEffect } from 'react';
import { Tabs, useRootNavigationState } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View, Text } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getStudentPendingInvitations } from '@/lib/services/invitationService';

const BG     = '#090f12';
const CARD   = '#141c1f';
const BORDER = '#3c494e';
const PRIMARY = '#00D1FF';
const PRIMARY_DIM = '#00566a';
const NEUTRAL = '#71787B';
const TEXT_HI = '#dde3e7';

function ProfileTabIcon({ focused }: { focused: boolean }) {
  const { profile, user } = useAuth();
  const letter = (profile?.full_name || user?.email || 'U').charAt(0).toUpperCase();
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

export default function StudentLayout() {
  const rootNavigationState = useRootNavigationState();
  const isNavigationReady = Boolean(rootNavigationState?.key);
  const { user } = useAuth();
  const [pendingCount, setPendingCount] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (user?.id) {
      getStudentPendingInvitations(user.id).then(({ invitations }) => {
        setPendingCount(invitations.length > 0 ? invitations.length : undefined);
      });
    }
  }, [user?.id]);

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
        // Header para pantallas anidadas (plan, rutina, etc.)
        headerShown: true,
        headerStyle: { backgroundColor: BG },
        headerTintColor: PRIMARY,
        headerTitleStyle: { fontFamily: 'SpaceGrotesk_600SemiBold', color: TEXT_HI, fontSize: 15 },
        headerShadowVisible: false,
        headerBackTitle: '',
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
        name="history"
        options={{
          title: 'Historial',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: 'Progreso',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trending-up-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          headerShown: false,
          tabBarBadge: pendingCount,
          tabBarBadgeStyle: { backgroundColor: '#FEB127', color: '#7a5500', fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold' },
          tabBarIcon: ({ focused }) => <ProfileTabIcon focused={focused} />,
        }}
      />

      {/* Pantallas sin tab ─────────────────────────────────────── */}
      <Tabs.Screen name="invitations"         options={{ href: null }} />
      <Tabs.Screen name="invitation/[id]"     options={{ href: null }} />
      <Tabs.Screen name="plan/create"         options={{ href: null }} />
      <Tabs.Screen name="plan/[id]"           options={{ href: null }} />
      <Tabs.Screen name="routine/create"      options={{ href: null }} />
      <Tabs.Screen name="routine/[id]"        options={{ href: null }} />
      <Tabs.Screen name="workout/[routineId]" options={{ href: null }} />
      <Tabs.Screen name="notifications"       options={{ href: null }} />
      <Tabs.Screen name="session/[id]"        options={{ href: null }} />
      <Tabs.Screen name="progress"            options={{ href: null }} />
    </Tabs>
  );
}

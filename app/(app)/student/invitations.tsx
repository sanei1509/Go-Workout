import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeTokens } from '@/constants/theme';
import { getStudentPendingInvitations, Invitation } from '@/lib/services/invitationService';

// ─── Invitation Card ─────────────────────────────────────────────────────────

function InvitationCard({ invitation, onPress, T, actionDimBg, isDark }: { invitation: Invitation; onPress: () => void; T: ThemeTokens; actionDimBg: string; isDark: boolean }) {
  const trainerName = invitation.trainer?.full_name || 'Entrenador';
  const initial = trainerName.charAt(0).toUpperCase();
  const avatarGradient = isDark
    ? [actionDimBg, '#002d3d'] as const
    : [T.border, T.surfaceElevated] as const;
  const s = useMemo(() => createStyles(T, actionDimBg, isDark), [T, actionDimBg, isDark]);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={s.card}>
      {/* Trainer row */}
      <View style={s.trainerRow}>
        <LinearGradient colors={avatarGradient} style={s.avatar}>
          <Text style={s.avatarLetter}>{initial}</Text>
        </LinearGradient>
        <View style={s.trainerInfo}>
          <Text style={s.trainerName}>{trainerName}</Text>
          <Text style={s.trainerRole}>ENTRENADOR</Text>
        </View>
        <View style={s.pendingBadge}>
          <Text style={s.pendingBadgeText}>PENDIENTE</Text>
        </View>
      </View>

      {/* Details */}
      <View style={s.details}>
        <DetailRow label="DISCIPLINA" value={invitation.discipline} T={T} actionDimBg={actionDimBg} isDark={isDark} />
        <View style={s.detailDivider} />
        <DetailRow label="TIPO DE PLAN" value={invitation.plan_type} T={T} actionDimBg={actionDimBg} isDark={isDark} />
        <View style={s.detailDivider} />
        <DetailRow label="FRECUENCIA" value={invitation.frequency} T={T} actionDimBg={actionDimBg} isDark={isDark} />
      </View>

      {/* CTA */}
      <View style={s.cta}>
        <Text style={s.ctaText}>VER DETALLE</Text>
        <Ionicons name="chevron-forward" size={14} color={T.action} />
      </View>
    </TouchableOpacity>
  );
}

function DetailRow({ label, value, T, actionDimBg, isDark }: { label: string; value: string; T: ThemeTokens; actionDimBg: string; isDark: boolean }) {
  const s = useMemo(() => createStyles(T, actionDimBg, isDark), [T, actionDimBg, isDark]);
  return (
    <View style={s.detailRow}>
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={s.detailValue}>{value}</Text>
    </View>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({ T, actionDimBg, isDark }: { T: ThemeTokens; actionDimBg: string; isDark: boolean }) {
  const s = useMemo(() => createStyles(T, actionDimBg, isDark), [T, actionDimBg, isDark]);
  return (
    <View style={s.emptyWrap}>
      <View style={s.emptyCard}>
        <Ionicons name="mail-outline" size={40} color={T.textSecondary} />
        <Text style={s.emptyTitle}>Sin invitaciones pendientes</Text>
        <Text style={s.emptySubtitle}>
          Cuando un entrenador te invite, aparecerá acá
        </Text>
      </View>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function InvitationsScreen() {
  const { user } = useAuth();
  const { T, activeTheme } = useTheme();
  const isDark = activeTheme === 'dark';
  const actionDimBg = isDark ? '#00566a' : '#e8e4dc';
  const s = useMemo(() => createStyles(T, actionDimBg, isDark), [T, actionDimBg, isDark]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInvitations = useCallback(async () => {
    if (!user?.id) return;
    const { invitations: data, error: err } = await getStudentPendingInvitations(user.id);
    if (err) {
      setError(err.message);
    } else {
      setInvitations(data);
      setError(null);
    }
  }, [user?.id]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      await loadInvitations();
      setIsLoading(false);
    };
    fetchData();
  }, [loadInvitations]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadInvitations();
    setIsRefreshing(false);
  }, [loadInvitations]);

  return (
    <>
      <Stack.Screen options={{
        title: 'INVITACIONES',
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.navigate('/student/profile')} style={{ marginLeft: 4, padding: 4 }}>
            <Ionicons name="chevron-back" size={24} color={T.action} />
          </TouchableOpacity>
        ),
      }} />
      <View style={s.safe}>
        <LinearGradient
          colors={['transparent', T.action, 'transparent']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={s.topLine}
        />

        {isLoading ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color={T.action} />
          </View>
        ) : error ? (
          <View style={s.center}>
            <Ionicons name="alert-circle-outline" size={48} color="#f87171" />
            <Text style={s.errorText}>{error}</Text>
          </View>
        ) : (
          <FlatList
            data={invitations}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <InvitationCard
                invitation={item}
                onPress={() => router.push(`/(app)/student/invitation/${item.id}`)}
                T={T}
                actionDimBg={actionDimBg}
                isDark={isDark}
              />
            )}
            contentContainerStyle={invitations.length === 0 ? s.listEmpty : s.list}
            ListEmptyComponent={<EmptyState T={T} actionDimBg={actionDimBg} isDark={isDark} />}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={onRefresh}
                tintColor={T.action}
                colors={[T.action]}
              />
            }
          />
        )}
      </View>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function createStyles(T: ThemeTokens, actionDimBg: string, isDark: boolean) {
  const pendingBg = isDark ? 'rgba(254,177,39,0.12)' : '#FDF6E8';
  const pendingBorder = isDark ? 'rgba(254,177,39,0.35)' : 'rgba(184,121,26,0.35)';
  const pendingText = isDark ? T.attention : '#8A5A11';

  return StyleSheet.create({
    safe:    { flex: 1, backgroundColor: T.surface },
    topLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, opacity: 0.4, zIndex: 10 },
    center:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    list:    { padding: 20, paddingBottom: 48 },
    listEmpty: { flex: 1 },

    errorText: { color: T.textSecondary, textAlign: 'center', marginTop: 12, fontFamily: 'SpaceGrotesk_400Regular' },

    // Card
    card:        { backgroundColor: T.surfaceElevated, borderRadius: 16, borderWidth: 1, borderColor: T.border, padding: 18, marginBottom: 14 },

    trainerRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    avatar:      { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
    avatarLetter:{ color: T.action, fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold' },
    trainerInfo: { flex: 1 },
    trainerName: { color: T.textPrimary, fontSize: 15, fontFamily: 'SpaceGrotesk_700Bold' },
    trainerRole: { color: T.textSecondary, fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1.5, marginTop: 2 },

    pendingBadge:    { backgroundColor: pendingBg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: pendingBorder },
    pendingBadgeText:{ color: pendingText, fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1 },

    // Details
    details:      { backgroundColor: T.border, borderRadius: 10, borderWidth: 1, borderColor: T.border, marginBottom: 14, overflow: 'hidden' },
    detailRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
    detailDivider:{ height: 1, backgroundColor: T.border },
    detailLabel:  { color: T.textSecondary, fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1 },
    detailValue:  { color: T.textPrimary, fontSize: 13, fontFamily: 'SpaceGrotesk_600SemiBold' },

    // CTA
    cta:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
    ctaText: { color: T.action, fontSize: 11, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1 },

    // Empty
    emptyWrap:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
    emptyCard:    { backgroundColor: T.surfaceElevated, borderRadius: 16, borderWidth: 1, borderColor: T.border, padding: 32, alignItems: 'center', width: '100%' },
    emptyTitle:   { color: T.textPrimary, fontSize: 16, fontFamily: 'SpaceGrotesk_700Bold', textAlign: 'center', marginTop: 16, marginBottom: 8 },
    emptySubtitle:{ color: T.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular', textAlign: 'center' },
  });
}

import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeTokens } from '@/constants/theme';
import {
  getTrainerInvitations,
  Invitation,
  InvitationStatus,
} from '@/lib/services/invitationService';

type FilterOption = 'ALL' | InvitationStatus;

const FILTERS: { label: string; value: FilterOption }[] = [
  { label: 'TODAS', value: 'ALL' },
  { label: 'PENDIENTES', value: 'PENDING' },
  { label: 'ACEPTADAS', value: 'ACCEPTED' },
  { label: 'RECHAZADAS', value: 'REJECTED' },
];

function getStatusMeta(T: ThemeTokens, isDark: boolean): Record<InvitationStatus, { label: string; color: string; bg: string; border: string }> {
  const rejectedColor = isDark ? '#EF4444' : '#dc2626';
  return {
    PENDING: {
      label: 'PENDIENTE',
      color: isDark ? T.attention : '#8A5A11',
      bg: isDark ? 'rgba(254,177,39,0.12)' : '#FDF6E8',
      border: isDark ? 'rgba(254,177,39,0.35)' : 'rgba(184,121,26,0.35)',
    },
    ACCEPTED: {
      label: 'ACEPTADA',
      color: T.done,
      bg: isDark ? 'rgba(74,222,128,0.12)' : 'rgba(44,140,78,0.10)',
      border: isDark ? 'rgba(74,222,128,0.35)' : 'rgba(44,140,78,0.30)',
    },
    REJECTED: {
      label: 'RECHAZADA',
      color: rejectedColor,
      bg: isDark ? 'rgba(239,68,68,0.12)' : '#fef2f2',
      border: isDark ? 'rgba(239,68,68,0.35)' : 'rgba(220,38,38,0.25)',
    },
  };
}

export default function TrainerInvitationsScreen() {
  const { user } = useAuth();
  const { T, activeTheme } = useTheme();
  const isDark = activeTheme === 'dark';
  const actionDimBg = isDark ? '#00566a' : '#e8e4dc';
  const s = useMemo(() => createStyles(T, actionDimBg), [T, actionDimBg]);
  const STATUS_META = useMemo(() => getStatusMeta(T, isDark), [T, isDark]);

  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterOption>('ALL');

  const loadInvitations = useCallback(async () => {
    if (!user?.id) return;
    const statusFilter = filter === 'ALL' ? undefined : filter;
    const { invitations: data } = await getTrainerInvitations(user.id, statusFilter);
    setInvitations(data);
  }, [user?.id, filter]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      await loadInvitations();
      setIsLoading(false);
    };
    fetchData();
  }, [loadInvitations]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadInvitations();
    setIsRefreshing(false);
  };

  const handleCreateInvitation = () => {
    router.push('/trainer/create-invitation');
  };

  return (
    <SafeAreaView style={s.safe}>
      <LinearGradient
        colors={['transparent', T.action, 'transparent']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={s.topLine}
      />

      {/* ── Header ─────────────────────────────────────────────────── */}
      <View style={s.header}>
        <Text style={s.title}>Invitaciones</Text>
        <TouchableOpacity onPress={handleCreateInvitation} activeOpacity={0.85} style={s.newBtn}>
          <Ionicons name="add" size={16} color={T.actionFg} />
          <Text style={s.newBtnText}>NUEVA</Text>
        </TouchableOpacity>
      </View>

      {/* ── Filtros ────────────────────────────────────────────────── */}
      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filtersRow}
        >
          {FILTERS.map((f) => {
            const active = filter === f.value;
            return (
              <TouchableOpacity
                key={f.value}
                onPress={() => setFilter(f.value)}
                activeOpacity={0.8}
                style={[s.filterChip, active && s.filterChipActive]}
              >
                <Text style={[s.filterText, active && s.filterTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Contenido ──────────────────────────────────────────────── */}
      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={T.action} />
        </View>
      ) : invitations.length === 0 ? (
        <View style={[s.center, { paddingHorizontal: 32 }]}>
          <View style={s.emptyIcon}>
            <Ionicons name="mail-outline" size={36} color={T.textSecondary} />
          </View>
          <Text style={s.emptyTitle}>
            No hay invitaciones{filter !== 'ALL' ? ' con este filtro' : ''}
          </Text>
          <TouchableOpacity onPress={handleCreateInvitation} activeOpacity={0.85} style={[s.emptyCta, { alignSelf: 'stretch' }]}>
            <Ionicons name="person-add-outline" size={16} color={T.actionFg} />
            <Text style={s.emptyCtaText}>CREAR INVITACIÓN</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingTop: 12 }}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh}
              tintColor={T.action} colors={[T.action]} />
          }
        >
          {invitations.map((invitation) => {
            const meta = STATUS_META[invitation.status] ?? STATUS_META.PENDING;
            return (
              <View key={invitation.id} style={s.card}>
                <View style={[s.accent, { backgroundColor: meta.color }]} />

                <View style={s.cardHeader}>
                  <View style={s.avatarFallback}>
                    <Text style={s.avatarLetter}>
                      {invitation.student?.full_name?.charAt(0).toUpperCase() || '?'}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.studentName}>
                      {invitation.student?.full_name || 'Alumno'}
                    </Text>
                    <Text style={s.discipline}>{invitation.discipline}</Text>
                  </View>
                  <View style={[s.statusBadge, { backgroundColor: meta.bg, borderColor: meta.border }]}>
                    <Text style={[s.statusText, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                </View>

                <View style={s.metaRow}>
                  <View style={s.metaItem}>
                    <Ionicons name="document-text-outline" size={13} color={T.textSecondary} />
                    <Text style={s.metaText}>{invitation.plan_type}</Text>
                  </View>
                  <View style={s.metaItem}>
                    <Ionicons name="calendar-outline" size={13} color={T.textSecondary} />
                    <Text style={s.metaText}>{invitation.frequency}</Text>
                  </View>
                  <Text style={s.dateText}>
                    {new Date(invitation.created_at).toLocaleDateString('es-AR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function createStyles(T: ThemeTokens, actionDimBg: string) {
  return StyleSheet.create({
    safe:    { flex: 1, backgroundColor: T.surface },
    topLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, opacity: 0.4, zIndex: 10 },
    center:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },

    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
    title:  { color: T.textPrimary, fontSize: 24, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: -0.5 },

    newBtn:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 9, backgroundColor: T.action },
    newBtnText: { color: T.actionFg, fontSize: 11, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1.5 },

    filtersRow:       { paddingHorizontal: 20, gap: 8, paddingBottom: 4 },
    filterChip:       { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: T.surfaceElevated, borderWidth: 1, borderColor: T.border },
    filterChipActive: { backgroundColor: actionDimBg, borderColor: T.action },
    filterText:       { color: T.textSecondary, fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1.5 },
    filterTextActive: { color: T.action },

    emptyIcon:    { width: 72, height: 72, borderRadius: 36, backgroundColor: T.surfaceElevated, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center' },
    emptyTitle:   { color: T.textSecondary, fontSize: 14, fontFamily: 'SpaceGrotesk_400Regular', textAlign: 'center', marginBottom: 8 },
    emptyCta:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 10, backgroundColor: T.action },
    emptyCtaText: { color: T.actionFg, fontSize: 12, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1.5 },

    card: {
      backgroundColor: T.surfaceElevated, borderRadius: 12, borderWidth: 1, borderColor: T.border,
      padding: 14, paddingLeft: 18, marginBottom: 10, overflow: 'hidden',
    },
    accent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },

    cardHeader:     { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 12 },
    avatarFallback: { width: 40, height: 40, borderRadius: 20, backgroundColor: actionDimBg, alignItems: 'center', justifyContent: 'center' },
    avatarLetter:   { color: T.action, fontSize: 16, fontFamily: 'SpaceGrotesk_700Bold' },
    studentName:    { color: T.textPrimary, fontSize: 14, fontFamily: 'SpaceGrotesk_700Bold', marginBottom: 1 },
    discipline:     { color: T.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular' },

    statusBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
    statusText:  { fontSize: 8, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1.5 },

    metaRow:  { flexDirection: 'row', alignItems: 'center', gap: 14 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { color: T.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular' },
    dateText: { color: T.textSecondary, fontSize: 10, fontFamily: 'SpaceGrotesk_400Regular', marginLeft: 'auto' },
  });
}

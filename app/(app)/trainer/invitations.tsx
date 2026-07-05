import { useEffect, useState, useCallback } from 'react';
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
import {
  getTrainerInvitations,
  Invitation,
  InvitationStatus,
} from '@/lib/services/invitationService';

const C = {
  bg:         '#090f12',
  card:       '#141c1f',
  cardDeep:   '#1a2123',
  border:     '#3c494e',
  primary:    '#00D1FF',
  primaryDim: '#00566a',
  tertiary:   '#FEB127',
  neutral:    '#71787B',
  textHi:     '#dde3e7',
  textLo:     '#859399',
  green:      '#4ade80',
  red:        '#f87171',
};

type FilterOption = 'ALL' | InvitationStatus;

const FILTERS: { label: string; value: FilterOption }[] = [
  { label: 'TODAS', value: 'ALL' },
  { label: 'PENDIENTES', value: 'PENDING' },
  { label: 'ACEPTADAS', value: 'ACCEPTED' },
  { label: 'RECHAZADAS', value: 'REJECTED' },
];

const STATUS_META: Record<InvitationStatus, { label: string; color: string; bg: string }> = {
  PENDING:  { label: 'PENDIENTE', color: C.tertiary, bg: '#130d00' },
  ACCEPTED: { label: 'ACEPTADA',  color: C.green,    bg: '#0a1f10' },
  REJECTED: { label: 'RECHAZADA', color: C.red,      bg: '#1a0808' },
};

export default function TrainerInvitationsScreen() {
  const { user } = useAuth();
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
        colors={['transparent', C.primary, 'transparent']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={s.topLine}
      />

      {/* ── Header ─────────────────────────────────────────────────── */}
      <View style={s.header}>
        <Text style={s.title}>Invitaciones</Text>
        <TouchableOpacity onPress={handleCreateInvitation} activeOpacity={0.85}>
          <LinearGradient
            colors={['#00566a', '#003d4d']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={s.newBtn}
          >
            <Ionicons name="add" size={16} color={C.primary} />
            <Text style={s.newBtnText}>NUEVA</Text>
          </LinearGradient>
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
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : invitations.length === 0 ? (
        <View style={[s.center, { paddingHorizontal: 32 }]}>
          <View style={s.emptyIcon}>
            <Ionicons name="mail-outline" size={36} color={C.neutral} />
          </View>
          <Text style={s.emptyTitle}>
            No hay invitaciones{filter !== 'ALL' ? ' con este filtro' : ''}
          </Text>
          <TouchableOpacity onPress={handleCreateInvitation} activeOpacity={0.85} style={{ alignSelf: 'stretch' }}>
            <LinearGradient
              colors={['#00566a', '#003d4d']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={s.emptyCta}
            >
              <Ionicons name="person-add-outline" size={16} color={C.primary} />
              <Text style={s.emptyCtaText}>CREAR INVITACIÓN</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingTop: 12 }}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh}
              tintColor={C.primary} colors={[C.primary]} />
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
                  <View style={[s.statusBadge, { backgroundColor: meta.bg, borderColor: meta.color }]}>
                    <Text style={[s.statusText, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                </View>

                <View style={s.metaRow}>
                  <View style={s.metaItem}>
                    <Ionicons name="document-text-outline" size={13} color={C.neutral} />
                    <Text style={s.metaText}>{invitation.plan_type}</Text>
                  </View>
                  <View style={s.metaItem}>
                    <Ionicons name="calendar-outline" size={13} color={C.neutral} />
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

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: C.bg },
  topLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, opacity: 0.4, zIndex: 10 },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  title:  { color: C.textHi, fontSize: 24, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: -0.5 },

  newBtn:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 9 },
  newBtnText: { color: C.primary, fontSize: 11, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1.5 },

  filtersRow:       { paddingHorizontal: 20, gap: 8, paddingBottom: 4 },
  filterChip:       { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  filterChipActive: { backgroundColor: C.primaryDim, borderColor: C.primary },
  filterText:       { color: C.neutral, fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1.5 },
  filterTextActive: { color: C.primary },

  emptyIcon:    { width: 72, height: 72, borderRadius: 36, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  emptyTitle:   { color: C.textLo, fontSize: 14, fontFamily: 'SpaceGrotesk_400Regular', textAlign: 'center', marginBottom: 8 },
  emptyCta:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 10 },
  emptyCtaText: { color: C.primary, fontSize: 12, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1.5 },

  card: {
    backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border,
    padding: 14, paddingLeft: 18, marginBottom: 10, overflow: 'hidden',
  },
  accent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },

  cardHeader:     { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 12 },
  avatarFallback: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.primaryDim, alignItems: 'center', justifyContent: 'center' },
  avatarLetter:   { color: C.primary, fontSize: 16, fontFamily: 'SpaceGrotesk_700Bold' },
  studentName:    { color: C.textHi, fontSize: 14, fontFamily: 'SpaceGrotesk_700Bold', marginBottom: 1 },
  discipline:     { color: C.neutral, fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular' },

  statusBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  statusText:  { fontSize: 8, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1.5 },

  metaRow:  { flexDirection: 'row', alignItems: 'center', gap: 14 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: C.textLo, fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular' },
  dateText: { color: C.neutral, fontSize: 10, fontFamily: 'SpaceGrotesk_400Regular', marginLeft: 'auto' },
});

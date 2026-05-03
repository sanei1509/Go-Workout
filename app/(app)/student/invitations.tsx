import { useEffect, useState, useCallback } from 'react';
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
import { getStudentPendingInvitations, Invitation } from '@/lib/services/invitationService';

// ─── Palette ──────────────────────────────────────────────────────────────────
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
};

// ─── Invitation Card ─────────────────────────────────────────────────────────

function InvitationCard({ invitation, onPress }: { invitation: Invitation; onPress: () => void }) {
  const trainerName = invitation.trainer?.full_name || 'Entrenador';
  const initial = trainerName.charAt(0).toUpperCase();

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={s.card}>
      {/* Trainer row */}
      <View style={s.trainerRow}>
        <LinearGradient colors={[C.primaryDim, '#002d3d']} style={s.avatar}>
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
        <DetailRow label="DISCIPLINA" value={invitation.discipline} />
        <View style={s.detailDivider} />
        <DetailRow label="TIPO DE PLAN" value={invitation.plan_type} />
        <View style={s.detailDivider} />
        <DetailRow label="FRECUENCIA" value={invitation.frequency} />
      </View>

      {/* CTA */}
      <View style={s.cta}>
        <Text style={s.ctaText}>VER DETALLE</Text>
        <Ionicons name="chevron-forward" size={14} color={C.primary} />
      </View>
    </TouchableOpacity>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.detailRow}>
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={s.detailValue}>{value}</Text>
    </View>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <View style={s.emptyWrap}>
      <View style={s.emptyCard}>
        <Ionicons name="mail-outline" size={40} color={C.neutral} />
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
            <Ionicons name="chevron-back" size={24} color={C.primary} />
          </TouchableOpacity>
        ),
      }} />
      <View style={s.safe}>
        <LinearGradient
          colors={['transparent', C.primary, 'transparent']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={s.topLine}
        />

        {isLoading ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color={C.primary} />
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
              />
            )}
            contentContainerStyle={invitations.length === 0 ? s.listEmpty : s.list}
            ListEmptyComponent={<EmptyState />}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={onRefresh}
                tintColor={C.primary}
                colors={[C.primary]}
              />
            }
          />
        )}
      </View>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: C.bg },
  topLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, opacity: 0.4, zIndex: 10 },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  list:    { padding: 20, paddingBottom: 48 },
  listEmpty: { flex: 1 },

  errorText: { color: C.textLo, textAlign: 'center', marginTop: 12, fontFamily: 'SpaceGrotesk_400Regular' },

  // Card
  card:        { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 18, marginBottom: 14 },

  trainerRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar:      { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  avatarLetter:{ color: C.primary, fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold' },
  trainerInfo: { flex: 1 },
  trainerName: { color: C.textHi, fontSize: 15, fontFamily: 'SpaceGrotesk_700Bold' },
  trainerRole: { color: C.neutral, fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1.5, marginTop: 2 },

  pendingBadge:    { backgroundColor: C.tertiary + '22', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  pendingBadgeText:{ color: C.tertiary, fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1 },

  // Details
  details:      { backgroundColor: C.cardDeep, borderRadius: 10, borderWidth: 1, borderColor: C.border, marginBottom: 14, overflow: 'hidden' },
  detailRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  detailDivider:{ height: 1, backgroundColor: C.border },
  detailLabel:  { color: C.neutral, fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1 },
  detailValue:  { color: C.textHi, fontSize: 13, fontFamily: 'SpaceGrotesk_600SemiBold' },

  // CTA
  cta:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4 },
  ctaText: { color: C.primary, fontSize: 11, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1 },

  // Empty
  emptyWrap:    { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyCard:    { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 32, alignItems: 'center', width: '100%' },
  emptyTitle:   { color: C.textHi, fontSize: 16, fontFamily: 'SpaceGrotesk_700Bold', textAlign: 'center', marginTop: 16, marginBottom: 8 },
  emptySubtitle:{ color: C.neutral, fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular', textAlign: 'center' },
});

import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  getSessionDetail,
  SessionDetail,
  SessionExerciseLog,
} from '@/lib/services/workoutService';
import {
  getBlockLabel,
  getBlockColor,
  getBlockIcon,
} from '@/lib/services/routineService';

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
  green:      '#4ade80',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatValue(log: SessionExerciseLog): string {
  const v = log.actual_value ?? log.target_value;
  switch (log.exercise_type) {
    case 'time':     return v >= 60 ? `${Math.floor(v / 60)}m ${v % 60}s` : `${v}s`;
    case 'distance': return `${v}m`;
    default:         return `${v} reps`;
  }
}

function formatTargetValue(log: SessionExerciseLog): string {
  const v = log.target_value;
  switch (log.exercise_type) {
    case 'time':     return v >= 60 ? `${Math.floor(v / 60)}m ${v % 60}s` : `${v}s`;
    case 'distance': return `${v}m`;
    default:         return `${v} reps`;
  }
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('es-AR', {
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    loadDetail();
  }, [id]);

  const loadDetail = async () => {
    setIsLoading(true);
    const { detail: data, error: err } = await getSessionDetail(id);
    if (err || !data) {
      setError(err?.message ?? 'No se pudo cargar la sesión');
    } else {
      setDetail(data);
    }
    setIsLoading(false);
  };

  const groupedByBlock = detail?.exercises.reduce((acc, ex) => {
    const key = ex.block_type;
    if (!acc[key]) acc[key] = [];
    acc[key].push(ex);
    return acc;
  }, {} as Record<string, SessionExerciseLog[]>) ?? {};

  const blockOrder = ['warmup', 'main', 'accessory', 'cardio', 'mobility'];
  const sortedBlocks = Object.keys(groupedByBlock).sort(
    (a, b) => blockOrder.indexOf(a) - blockOrder.indexOf(b)
  );

  return (
    <>
      <Stack.Screen options={{
        title: 'SESIÓN',
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.navigate('/student/history')} style={{ marginLeft: 4, padding: 4 }}>
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
        ) : detail ? (
          <ScrollView contentContainerStyle={s.scroll}>

            {/* ── Metadata ────────────────────────────────────────── */}
            <View style={s.heroCard}>
              <Text style={s.routineName}>{detail.session.routine_name}</Text>
              <Text style={s.planName}>
                {detail.session.plan_name}
                {detail.session.plan_discipline ? ` · ${detail.session.plan_discipline}` : ''}
              </Text>

              <View style={s.metaRow}>
                <View style={s.metaChip}>
                  <Ionicons name="calendar-outline" size={13} color={C.neutral} />
                  <Text style={s.metaChipText}>{formatDate(detail.session.started_at)}</Text>
                </View>
                <View style={s.metaChip}>
                  <Ionicons name="time-outline" size={13} color={C.neutral} />
                  <Text style={s.metaChipText}>{formatTime(detail.session.started_at)}</Text>
                </View>
                <View style={[s.metaChip, s.metaChipGreen]}>
                  <Ionicons name="stopwatch-outline" size={13} color={C.green} />
                  <Text style={[s.metaChipText, { color: C.green }]}>{detail.session.duration}</Text>
                </View>
              </View>

              {detail.session.notes ? (
                <View style={s.notesWrap}>
                  <Text style={s.notesText}>{detail.session.notes}</Text>
                </View>
              ) : null}
            </View>

            {/* ── Bloques ─────────────────────────────────────────── */}
            {detail.exercises.length === 0 ? (
              <View style={s.emptyCard}>
                <Text style={s.emptyText}>No se registraron ejercicios</Text>
              </View>
            ) : (
              sortedBlocks.map((blockType) => {
                const color  = getBlockColor(blockType as any);
                const label  = getBlockLabel(blockType as any);
                const icon   = getBlockIcon(blockType as any);
                const exercises = groupedByBlock[blockType];

                return (
                  <View key={blockType} style={s.blockWrap}>
                    {/* Bloque header */}
                    <View style={[s.blockHeader, { borderLeftColor: color }]}>
                      <View style={[s.blockIconWrap, { backgroundColor: color + '22' }]}>
                        <Ionicons name={icon as any} size={15} color={color} />
                      </View>
                      <Text style={[s.blockLabel, { color }]}>{label}</Text>
                      <Text style={s.blockCount}>
                        {exercises.length} ej.
                      </Text>
                    </View>

                    {/* Ejercicios */}
                    <View style={s.exercisesCard}>
                      {exercises.map((ex, idx) => (
                        <View
                          key={ex.log_id}
                          style={[s.exRow, idx < exercises.length - 1 && s.exDivider]}
                        >
                          <View style={s.exTop}>
                            <Text style={s.exName} numberOfLines={1}>{ex.exercise_name}</Text>
                            <View style={[s.setsBadge, { backgroundColor: color + '22' }]}>
                              <Text style={[s.setsBadgeText, { color }]}>
                                {ex.sets_completed}/{ex.target_sets} series
                              </Text>
                            </View>
                          </View>

                          <View style={s.exBottom}>
                            <Text style={s.exValue}>{formatValue(ex)}</Text>
                            {ex.actual_value !== null && ex.actual_value !== ex.target_value && (
                              <Text style={s.exTarget}> (obj: {formatTargetValue(ex)})</Text>
                            )}
                            {ex.rest_seconds > 0 && (
                              <View style={s.restChip}>
                                <Ionicons name="pause-circle-outline" size={12} color={C.neutral} />
                                <Text style={s.restText}>{ex.rest_seconds}s</Text>
                              </View>
                            )}
                          </View>

                          {ex.notes ? (
                            <Text style={s.exNotes}>{ex.notes}</Text>
                          ) : null}
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        ) : null}
      </View>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: C.bg },
  topLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, opacity: 0.4, zIndex: 10 },
  scroll:  { padding: 20, paddingBottom: 48 },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },

  errorText: { color: C.textLo, textAlign: 'center', marginTop: 12, fontFamily: 'SpaceGrotesk_400Regular' },

  // Hero
  heroCard:    { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 20, marginBottom: 20 },
  routineName: { color: C.textHi, fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold', marginBottom: 4 },
  planName:    { color: C.primary, fontSize: 13, fontFamily: 'SpaceGrotesk_600SemiBold', marginBottom: 14 },

  metaRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaChip:      { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.cardDeep, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  metaChipGreen: { backgroundColor: '#0a2218' },
  metaChipText:  { color: C.textLo, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular' },

  notesWrap: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border },
  notesText: { color: C.neutral, fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular', fontStyle: 'italic' },

  emptyCard:  { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 24, alignItems: 'center' },
  emptyText:  { color: C.neutral, fontFamily: 'SpaceGrotesk_400Regular' },

  // Blocks
  blockWrap:    { marginBottom: 16 },
  blockHeader:  { flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingLeft: 10, borderLeftWidth: 3, gap: 10 },
  blockIconWrap:{ width: 28, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  blockLabel:   { flex: 1, fontSize: 11, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1.5 },
  blockCount:   { color: C.neutral, fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular' },

  exercisesCard: { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },

  exRow:     { padding: 14 },
  exDivider: { borderBottomWidth: 1, borderBottomColor: C.border },
  exTop:     { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  exName:    { flex: 1, color: C.textHi, fontSize: 14, fontFamily: 'SpaceGrotesk_600SemiBold', marginRight: 8 },

  setsBadge:     { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  setsBadgeText: { fontSize: 11, fontFamily: 'SpaceGrotesk_700Bold' },

  exBottom:  { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  exValue:   { color: C.textLo, fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular' },
  exTarget:  { color: C.neutral, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular' },

  restChip:  { flexDirection: 'row', alignItems: 'center', marginLeft: 10, gap: 3 },
  restText:  { color: C.neutral, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular' },

  exNotes:   { color: C.neutral, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular', fontStyle: 'italic', marginTop: 4 },
});

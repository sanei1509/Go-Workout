import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { router, useFocusEffect, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import {
  getGeneralStats,
  getAllPersonalRecords,
  formatProgressValue,
  GeneralStats,
  PersonalRecord,
} from '@/lib/services/progressService';

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg:         '#090f12',
  card:       '#141c1f',
  cardDeep:   '#1a2123',
  border:     '#3c494e',
  primary:    '#00D1FF',
  primaryDim: '#00566a',
  secondary:  '#475569',
  tertiary:   '#FEB127',
  neutral:    '#71787B',
  textHi:     '#dde3e7',
  textLo:     '#859399',
};

const TROPHY_COLORS = ['#D97706', '#9CA3AF', '#CD7C3A'];

export default function AnalyticsScreen() {
  const { user } = useAuth();
  const [generalStats, setGeneralStats] = useState<GeneralStats | null>(null);
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [user?.id])
  );

  const loadData = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    const [statsResult, recordsResult] = await Promise.all([
      getGeneralStats(user.id),
      getAllPersonalRecords(user.id),
    ]);
    setGeneralStats(statsResult.stats);
    setRecords(recordsResult.records);
    setIsLoading(false);
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <>
      <Stack.Screen options={{ title: 'PROGRESO' }} />
      <View style={s.container}>
        <LinearGradient
          colors={['transparent', C.primary, 'transparent']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={s.topLine}
        />

        {isLoading ? (
          <View style={s.loading}>
            <ActivityIndicator size="large" color={C.primary} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={s.scroll}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh}
                tintColor={C.primary} colors={[C.primary]} />
            }
          >
            {/* ── Volumen semanal ──────────────────────────────────── */}
            {generalStats && (
              <>
                <Text style={s.sectionTitle}>ESTA SEMANA</Text>

                {/* Hero stat — volumen */}
                <View style={s.heroCard}>
                  <LinearGradient
                    colors={['transparent', C.primary, 'transparent']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={s.heroTopLine}
                  />
                  <View style={s.heroBody}>
                    <View style={s.heroLeft}>
                      <Text style={s.heroLabel}>VOLUMEN TOTAL</Text>
                      <Text style={s.heroValue}>
                        {generalStats.volumeThisWeek.toLocaleString()}
                        <Text style={s.heroUnit}> kg</Text>
                      </Text>
                      <View style={s.changePill}>
                        <Ionicons
                          name={generalStats.volumeChange >= 0 ? 'trending-up' : 'trending-down'}
                          size={13}
                          color={generalStats.volumeChange >= 0 ? '#4ade80' : '#f87171'}
                        />
                        <Text style={[s.changeText, { color: generalStats.volumeChange >= 0 ? '#4ade80' : '#f87171' }]}>
                          {generalStats.volumeChange >= 0 ? '+' : ''}{generalStats.volumeChange}% vs sem. ant.
                        </Text>
                      </View>
                    </View>
                    <View style={s.heroRight}>
                      <View style={s.miniStat}>
                        <Text style={s.miniValue}>{generalStats.totalSets}</Text>
                        <Text style={s.miniLabel}>SERIES</Text>
                      </View>
                      <View style={[s.miniStat, { borderTopWidth: 1, borderTopColor: C.border }]}>
                        <Text style={s.miniValue}>{generalStats.distinctExercises}</Text>
                        <Text style={s.miniLabel}>EJERCICIOS</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </>
            )}

            {/* ── Evolución por ejercicio ──────────────────────────── */}
            <TouchableOpacity
              onPress={() => router.push('/student/progress' as any)}
              activeOpacity={0.85}
              style={s.ctaCard}
            >
              <LinearGradient
                colors={[C.primaryDim, '#003d4d']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={s.ctaGradient}
              >
                <View style={s.ctaIcon}>
                  <Ionicons name="stats-chart-outline" size={24} color={C.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.ctaTitle}>EVOLUCIÓN POR EJERCICIO</Text>
                  <Text style={s.ctaSub}>Gráfico de progreso y récords</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={C.primary} />
              </LinearGradient>
            </TouchableOpacity>

            {/* ── Récords personales ───────────────────────────────── */}
            <View style={s.sectionRow}>
              <Text style={s.sectionTitle}>RÉCORDS PERSONALES</Text>
              {records.length > 0 && (
                <View style={s.countBadge}>
                  <Text style={s.countBadgeText}>{records.length}</Text>
                </View>
              )}
            </View>

            {records.length === 0 ? (
              <View style={s.emptyCard}>
                <View style={s.emptyIcon}>
                  <Ionicons name="trophy-outline" size={32} color={C.tertiary} />
                </View>
                <Text style={s.emptyTitle}>SIN RÉCORDS AÚN</Text>
                <Text style={s.emptyDesc}>
                  Completá entrenamientos para ver tus récords aquí.
                </Text>
              </View>
            ) : (
              <View style={s.recordList}>
                {records.map((record, idx) => (
                  <TouchableOpacity
                    key={record.exercise_name}
                    onPress={() => router.push('/student/progress' as any)}
                    activeOpacity={0.85}
                  >
                    <View style={[s.recordRow, idx < records.length - 1 && s.recordRowBorder]}>
                      {/* Rank */}
                      <View style={s.rankWrap}>
                        {idx < 3 ? (
                          <Ionicons name="trophy" size={16} color={TROPHY_COLORS[idx]} />
                        ) : (
                          <Text style={s.rankNum}>{idx + 1}</Text>
                        )}
                      </View>

                      {/* Name + date */}
                      <View style={{ flex: 1 }}>
                        <Text style={s.exerciseName}>{record.exercise_name}</Text>
                        <Text style={s.exerciseDate}>{formatDate(record.achieved_at)}</Text>
                      </View>

                      {/* PR value */}
                      <View style={s.prWrap}>
                        <Text style={s.prValue}>
                          {formatProgressValue(record.best_value, record.exercise_type)}
                        </Text>
                        <Text style={s.prSets}>× {record.best_sets} series</Text>
                      </View>

                      <Ionicons name="chevron-forward" size={14} color={C.border} style={{ marginLeft: 4 }} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  topLine:   { position: 'absolute', top: 0, left: 0, right: 0, height: 2, opacity: 0.4, zIndex: 10 },
  loading:   { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll:    { padding: 20, paddingBottom: 40 },

  // Section
  sectionRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginTop: 8 },
  sectionTitle: { color: C.neutral, fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 3, marginBottom: 12 },
  countBadge:   { marginLeft: 10, backgroundColor: C.primaryDim, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  countBadgeText: { color: C.primary, fontSize: 11, fontFamily: 'SpaceGrotesk_700Bold' },

  // Hero stats card
  heroCard:    { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.primary, marginBottom: 16, overflow: 'hidden' },
  heroTopLine: { height: 2, opacity: 0.6 },
  heroBody:    { flexDirection: 'row', padding: 20 },
  heroLeft:    { flex: 1, paddingRight: 16 },
  heroLabel:   { color: C.neutral, fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 2, marginBottom: 6 },
  heroValue:   { color: C.textHi, fontSize: 34, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: -1 },
  heroUnit:    { color: C.neutral, fontSize: 18, fontFamily: 'SpaceGrotesk_400Regular' },
  changePill:  { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  changeText:  { fontSize: 12, fontFamily: 'SpaceGrotesk_600SemiBold' },
  heroRight:   { borderLeftWidth: 1, borderLeftColor: C.border, paddingLeft: 16, justifyContent: 'center', gap: 0 },
  miniStat:    { paddingVertical: 10, alignItems: 'center', minWidth: 72 },
  miniValue:   { color: C.textHi, fontSize: 22, fontFamily: 'SpaceGrotesk_700Bold' },
  miniLabel:   { color: C.textLo, fontSize: 9, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 2, marginTop: 2 },

  // CTA card
  ctaCard:     { borderRadius: 12, marginBottom: 28, overflow: 'hidden', borderWidth: 1, borderColor: C.primaryDim },
  ctaGradient: { flexDirection: 'row', alignItems: 'center', padding: 18, gap: 14 },
  ctaIcon:     { width: 44, height: 44, borderRadius: 10, backgroundColor: 'rgba(0,209,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  ctaTitle:    { color: C.primary, fontSize: 13, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1, marginBottom: 3 },
  ctaSub:      { color: C.textLo, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular' },

  // Records
  recordList:      { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  recordRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  recordRowBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  rankWrap:        { width: 28, alignItems: 'center', marginRight: 12 },
  rankNum:         { color: C.neutral, fontSize: 13, fontFamily: 'SpaceGrotesk_700Bold' },
  exerciseName:    { color: C.textHi, fontSize: 13, fontFamily: 'SpaceGrotesk_600SemiBold', marginBottom: 2 },
  exerciseDate:    { color: C.textLo, fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular' },
  prWrap:          { alignItems: 'flex-end', marginRight: 4 },
  prValue:         { color: C.primary, fontSize: 15, fontFamily: 'SpaceGrotesk_700Bold' },
  prSets:          { color: C.neutral, fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular', marginTop: 1 },

  // Empty
  emptyCard:  { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 40, alignItems: 'center' },
  emptyIcon:  { width: 64, height: 64, borderRadius: 32, backgroundColor: '#2a1f00', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { color: C.textHi, fontSize: 13, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 2, marginBottom: 8 },
  emptyDesc:  { color: C.neutral, fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular', textAlign: 'center', lineHeight: 20 },
});

import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { router, useFocusEffect, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BarChart } from 'react-native-chart-kit';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeTokens } from '@/constants/theme';
import {
  getWorkoutHistory,
  getWeeklyStats,
  formatDurationMinutes,
  WeeklyStats,
} from '@/lib/services/todayService';
import { WorkoutSession } from '@/lib/services/workoutService';
import {
  getGeneralStats,
  getWeeklySessionsBars,
  GeneralStats,
  WeeklySessionsBar,
} from '@/lib/services/progressService';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_W = SCREEN_WIDTH - 80;

interface SessionWithDetails extends WorkoutSession {
  routine_name?: string;
  plan_name?: string;
}

export default function HistoryScreen() {
  const { user } = useAuth();
  const { T, activeTheme } = useTheme();
  const isDark = activeTheme === 'dark';
  const actionDimBg = isDark ? '#00566a' : '#e8e4dc';
  const s = useMemo(() => createStyles(T, actionDimBg, isDark), [T, actionDimBg, isDark]);
  const [sessions, setSessions] = useState<SessionWithDetails[]>([]);
  const [stats, setStats] = useState<WeeklyStats | null>(null);
  const [generalStats, setGeneralStats] = useState<GeneralStats | null>(null);
  const [weeklyBars, setWeeklyBars] = useState<WeeklySessionsBar[]>([]);
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
    const [historyResult, statsResult, generalStatsResult, barsResult] = await Promise.all([
      getWorkoutHistory(user.id, 30),
      getWeeklyStats(user.id),
      getGeneralStats(user.id),
      getWeeklySessionsBars(user.id, 8),
    ]);
    setSessions(historyResult.sessions);
    setStats(statsResult.stats);
    setGeneralStats(generalStatsResult.stats);
    setWeeklyBars(barsResult.bars);
    setIsLoading(false);
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const diffDays = Math.floor((Date.now() - date.getTime()) / 86400000);
    if (diffDays === 0) return 'HOY';
    if (diffDays === 1) return 'AYER';
    if (diffDays < 7) return `HACE ${diffDays} DÍAS`;
    return date.toLocaleDateString('es-AR', {
      day: 'numeric', month: 'short',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    }).toUpperCase();
  };

  const formatTime = (dateString: string) =>
    new Date(dateString).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

  const groupedSessions = sessions.reduce((groups, session) => {
    const key = new Date(session.started_at).toDateString();
    if (!groups[key]) groups[key] = [];
    groups[key].push(session);
    return groups;
  }, {} as Record<string, SessionWithDetails[]>);

  const sortedDates = Object.keys(groupedSessions).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  const hasBarData = weeklyBars.some(b => b.count > 0);

  return (
    <>
      <Stack.Screen options={{ title: 'HISTORIAL' }} />
      <View style={s.container}>
        <LinearGradient
          colors={['transparent', T.action, 'transparent']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={s.topLine}
        />

        {isLoading ? (
          <View style={s.loading}>
            <ActivityIndicator size="large" color={T.action} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={s.scroll}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh}
                tintColor={T.action} colors={[T.action]} />
            }
          >
            {/* ── Stats strip ───────────────────────────────────────── */}
            <View style={s.statsRow}>
              <View style={[s.statCard, { flex: 1, marginRight: 8 }]}>
                <View style={[s.statIcon, { backgroundColor: actionDimBg }]}>
                  <Ionicons name="fitness-outline" size={18} color={T.action} />
                </View>
                <Text style={s.statValue}>{sessions.length}</Text>
                <Text style={s.statLabel}>SESIONES</Text>
              </View>
              <View style={[s.statCard, { flex: 1, marginHorizontal: 4 }]}>
                <View style={[s.statIcon, s.statIconAttention]}>
                  <Ionicons name="flame" size={18} color={T.attention} />
                </View>
                <Text style={[s.statValue, { color: T.attention }]}>{stats?.streak ?? 0}</Text>
                <Text style={s.statLabel}>RACHA</Text>
              </View>
              <View style={[s.statCard, { flex: 1, marginLeft: 8 }]}>
                <View style={[s.statIcon, { backgroundColor: actionDimBg }]}>
                  <Ionicons name="calendar-outline" size={18} color={T.action} />
                </View>
                <Text style={s.statValue}>{stats?.workoutsCompleted ?? 0}</Text>
                <Text style={s.statLabel}>ESTA SEM.</Text>
              </View>
            </View>

            {/* ── Volumen semanal ────────────────────────────────────── */}
            {generalStats && (
              <>
                <Text style={s.sectionTitle}>VOLUMEN SEMANAL</Text>
                <View style={s.volumeCard}>
                  <LinearGradient
                    colors={['transparent', T.action, 'transparent']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={s.cardTopLine}
                  />
                  <View style={s.volumeBody}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.volumeValue}>
                        {generalStats.volumeThisWeek.toLocaleString()}
                        <Text style={s.volumeUnit}> kg</Text>
                      </Text>
                      <View style={s.changePill}>
                        <Ionicons
                          name={generalStats.volumeChange >= 0 ? 'trending-up' : 'trending-down'}
                          size={13}
                          color={generalStats.volumeChange >= 0 ? T.done : '#f87171'}
                        />
                        <Text style={[s.changeText, { color: generalStats.volumeChange >= 0 ? T.done : '#f87171' }]}>
                          {generalStats.volumeChange >= 0 ? '+' : ''}{generalStats.volumeChange}% vs sem. ant.
                        </Text>
                      </View>
                    </View>
                    <View style={s.volumeDivider} />
                    <View style={s.volumeSide}>
                      <Text style={s.miniValue}>{generalStats.totalSets}</Text>
                      <Text style={s.miniLabel}>SERIES</Text>
                    </View>
                  </View>
                </View>
              </>
            )}

            {/* ── Barras semanales ───────────────────────────────────── */}
            {hasBarData && (
              <>
                <Text style={s.sectionTitle}>SESIONES POR SEMANA</Text>
                <View style={s.chartCard}>
                  <BarChart
                    data={{
                      labels: weeklyBars.map(b => b.label),
                      datasets: [{ data: weeklyBars.map(b => b.count) }],
                    }}
                    width={CHART_W}
                    height={160}
                    yAxisLabel=""
                    yAxisSuffix=""
                    chartConfig={{
                      backgroundColor: T.surfaceElevated,
                      backgroundGradientFrom: T.surfaceElevated,
                      backgroundGradientTo: T.border,
                      decimalPlaces: 0,
                      color: (opacity = 1) => `rgba(0, 209, 255, ${opacity})`,
                      labelColor: () => T.textSecondary,
                      barPercentage: 0.6,
                      propsForBackgroundLines: { stroke: T.border, strokeDasharray: '' },
                    }}
                    style={{ borderRadius: 8, marginLeft: -10 }}
                    withInnerLines
                    showValuesOnTopOfBars
                    fromZero
                  />
                </View>
              </>
            )}

            {/* ── Lista de sesiones ─────────────────────────────────── */}
            {sessions.length === 0 ? (
              <View style={s.emptyCard}>
                <View style={s.emptyIcon}>
                  <Ionicons name="barbell-outline" size={32} color={T.action} />
                </View>
                <Text style={s.emptyTitle}>SIN ENTRENAMIENTOS</Text>
                <Text style={s.emptyDesc}>Completá tu primer entrenamiento para verlo aquí.</Text>
              </View>
            ) : (
              <>
                <Text style={s.sectionTitle}>ÚLTIMAS SESIONES</Text>
                {sortedDates.map(dateKey => (
                  <View key={dateKey} style={{ marginBottom: 20 }}>
                    <Text style={s.dateLabel}>{formatDate(groupedSessions[dateKey][0].started_at)}</Text>
                    <View style={s.sessionGroup}>
                      {groupedSessions[dateKey].map((session, idx) => (
                        <TouchableOpacity
                          key={session.id}
                          onPress={() => router.push(`/student/session/${session.id}` as any)}
                          activeOpacity={0.85}
                        >
                          <View style={[s.sessionRow, idx < groupedSessions[dateKey].length - 1 && s.sessionBorder]}>
                            <View style={s.sessionIcon}>
                              <Ionicons name="checkmark" size={20} color={T.done} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={s.sessionName}>
                                {session.routine_name || 'Entrenamiento'}
                              </Text>
                              {session.plan_name && (
                                <Text style={s.sessionPlan}>{session.plan_name}</Text>
                              )}
                              <View style={s.sessionMeta}>
                                <Ionicons name="time-outline" size={12} color={T.textSecondary} />
                                <Text style={s.sessionMetaText}>{formatTime(session.started_at)}</Text>
                                {session.finished_at && (
                                  <>
                                    <Text style={s.sessionDot}>·</Text>
                                    <Text style={s.sessionMetaText}>
                                      {formatDurationMinutes(session.started_at, session.finished_at)} min
                                    </Text>
                                  </>
                                )}
                              </View>
                            </View>
                            <Ionicons name="chevron-forward" size={14} color={T.border} />
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))}
              </>
            )}

            {/* ── Racha motivacional ────────────────────────────────── */}
            {stats && stats.streak > 2 && (
              <View style={s.streakCard}>
                <Ionicons name="flame" size={22} color={T.attention} />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={s.streakTitle}>
                    ¡{stats.streak} día{stats.streak !== 1 ? 's' : ''} seguidos!
                  </Text>
                  <Text style={s.streakDesc}>Seguí así para mantener tu racha</Text>
                </View>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function createStyles(T: ThemeTokens, actionDimBg: string, isDark: boolean) {
  const doneIconBg = isDark ? 'rgba(74,222,128,0.12)' : 'rgba(44,140,78,0.10)';
  const doneIconBorder = isDark ? 'rgba(74,222,128,0.35)' : 'rgba(44,140,78,0.30)';
  const attentionIconBg = isDark ? 'rgba(254,177,39,0.12)' : '#FDF6E8';
  const streakBg = isDark ? 'rgba(254,177,39,0.09)' : '#FDF6E8';
  const streakBorder = isDark ? 'rgba(254,177,39,0.30)' : 'rgba(184,121,26,0.35)';
  const streakTitleColor = isDark ? T.attention : '#8A5A11';

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: T.surface },
    topLine:   { position: 'absolute', top: 0, left: 0, right: 0, height: 2, opacity: 0.4, zIndex: 10 },
    loading:   { flex: 1, alignItems: 'center', justifyContent: 'center' },
    scroll:    { padding: 20, paddingBottom: 48 },

    sectionTitle: { color: T.textSecondary, fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 3, marginBottom: 12 },

    // Stats strip
    statsRow: { flexDirection: 'row', marginBottom: 24 },
    statCard: { backgroundColor: T.surfaceElevated, borderRadius: 12, borderWidth: 1, borderColor: T.border, padding: 14, alignItems: 'center', gap: 6 },
    statIcon: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    statIconAttention: { backgroundColor: attentionIconBg },
    statValue:{ color: T.textPrimary, fontSize: 22, fontFamily: 'SpaceGrotesk_700Bold' },
    statLabel:{ color: T.textSecondary, fontSize: 9, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 2 },

    // Volume card
    volumeCard:   { backgroundColor: T.surfaceElevated, borderRadius: 14, borderWidth: 1, borderColor: T.action, marginBottom: 24, overflow: 'hidden' },
    cardTopLine:  { height: 2, opacity: 0.6 },
    volumeBody:   { flexDirection: 'row', alignItems: 'center', padding: 18 },
    volumeValue:  { color: T.textPrimary, fontSize: 30, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: -1 },
    volumeUnit:   { color: T.textSecondary, fontSize: 16, fontFamily: 'SpaceGrotesk_400Regular' },
    changePill:   { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
    changeText:   { fontSize: 12, fontFamily: 'SpaceGrotesk_600SemiBold' },
    volumeDivider:{ width: 1, height: 48, backgroundColor: T.border, marginHorizontal: 18 },
    volumeSide:   { alignItems: 'center' },
    miniValue:    { color: T.textPrimary, fontSize: 22, fontFamily: 'SpaceGrotesk_700Bold' },
    miniLabel:    { color: T.textSecondary, fontSize: 9, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 2, marginTop: 3 },

    // Chart
    chartCard: { backgroundColor: T.surfaceElevated, borderRadius: 14, borderWidth: 1, borderColor: T.border, padding: 20, marginBottom: 24, overflow: 'hidden' },

    // Session list
    dateLabel:    { color: T.textSecondary, fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 3, marginBottom: 8 },
    sessionGroup: { backgroundColor: T.surfaceElevated, borderRadius: 12, borderWidth: 1, borderColor: T.border, overflow: 'hidden' },
    sessionRow:   { flexDirection: 'row', alignItems: 'center', padding: 14 },
    sessionBorder:{ borderBottomWidth: 1, borderBottomColor: T.border },
    sessionIcon:  { width: 38, height: 38, borderRadius: 10, backgroundColor: doneIconBg, borderWidth: 1, borderColor: doneIconBorder, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    sessionName:  { color: T.textPrimary, fontSize: 13, fontFamily: 'SpaceGrotesk_600SemiBold', marginBottom: 2 },
    sessionPlan:  { color: T.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular', marginBottom: 3 },
    sessionMeta:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
    sessionMetaText: { color: T.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular' },
    sessionDot:   { color: T.border, fontSize: 11 },

    // Empty
    emptyCard:  { backgroundColor: T.surfaceElevated, borderRadius: 12, borderWidth: 1, borderColor: T.border, padding: 40, alignItems: 'center', gap: 12 },
    emptyIcon:  { width: 64, height: 64, borderRadius: 32, backgroundColor: actionDimBg, alignItems: 'center', justifyContent: 'center' },
    emptyTitle: { color: T.textPrimary, fontSize: 13, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 2 },
    emptyDesc:  { color: T.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular', textAlign: 'center', lineHeight: 20 },

    // Streak
    streakCard:  { flexDirection: 'row', alignItems: 'center', backgroundColor: streakBg, borderRadius: 12, borderWidth: 1, borderColor: streakBorder, padding: 16, marginTop: 8 },
    streakTitle: { color: streakTitleColor, fontSize: 14, fontFamily: 'SpaceGrotesk_700Bold', marginBottom: 2 },
    streakDesc:  { color: T.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular' },
  });
}

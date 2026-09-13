import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useRootNavigationState, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { useTraining } from '@/contexts/TrainingContext';
import { ActiveTrainer } from '@/lib/services/trainerService';
import { getUserPlans, getFrequencyLabel, Plan } from '@/lib/services/planService';
import {
  getTodayRoutine,
  getWeeklyStats,
  getWeeklyCompletedDays,
  TodayRoutineResult,
  TodayRoutineItem,
  WeeklyStats,
  WEEKDAYS,
  getDayLabel,
  getCurrentDayOfWeek,
} from '@/lib/services/todayService';
import { Profile } from '@/lib/services/profileService';
import {
  getActiveSnapshot,
  ActiveWorkoutSnapshot,
} from '@/lib/services/activeSessionService';
import { getRoutineById } from '@/lib/services/routineService';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeTokens } from '@/constants/theme';

export default function StudentHome() {
  const { user, profile } = useAuth();
  const {
    mode,
    selectedTrainer,
    trainers,
    isLoading,
    hasTrainers,
    selectPersonalPlan,
    selectTrainer,
  } = useTraining();
  const { T, activeTheme } = useTheme();
  const actionDimBg = activeTheme === 'dark' ? '#00566a' : '#e0f7fa';
  const s = useMemo(() => createStyles(T, actionDimBg, activeTheme === 'dark'), [T, actionDimBg, activeTheme]);
  const ctaGradColors: [string, string] = activeTheme === 'dark'
    ? [actionDimBg, '#003d4d']
    : [T.border, T.surface];

  const rootNavigationState = useRootNavigationState();
  const isNavigationReady = Boolean(rootNavigationState?.key);

  const PILL_H = 52;
  const pillHeight = useRef(new Animated.Value(PILL_H)).current;
  const lastScrollY = useRef(0);
  const pillVisible = useRef(true);

  const [plans, setPlans] = useState<Plan[]>([]);
  const [todayData, setTodayData] = useState<TodayRoutineResult | null>(null);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats | null>(null);
  const [weeklyCompletedDays, setWeeklyCompletedDays] = useState<number[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeSnapshot, setActiveSnapshot] = useState<ActiveWorkoutSnapshot | null>(null);
  const [activeRoutineName, setActiveRoutineName] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      const checkActive = async () => {
        if (!user?.id) return;
        const snap = await getActiveSnapshot(user.id);
        if (cancelled) return;
        if (!snap) {
          setActiveSnapshot(null);
          setActiveRoutineName(null);
          return;
        }
        setActiveSnapshot(snap);
        const { routine } = await getRoutineById(snap.routineId);
        if (cancelled) return;
        setActiveRoutineName(routine?.name ?? null);
      };
      checkActive();
      return () => { cancelled = true; };
    }, [user?.id])
  );

  useEffect(() => {
    if (user?.id && mode === 'personal') {
      loadData();
    }
  }, [user?.id, mode]);

  const loadData = async () => {
    if (!user?.id) return;
    setIsLoadingPlans(true);
    try {
      const [plansResult, todayResult, statsResult, completedDaysResult] = await Promise.all([
        getUserPlans(user.id),
        getTodayRoutine(user.id),
        getWeeklyStats(user.id),
        getWeeklyCompletedDays(user.id),
      ]);
      setPlans(plansResult.plans);
      setTodayData(todayResult.result);
      setWeeklyStats(statsResult.stats);
      setWeeklyCompletedDays(completedDaysResult.days);
    } catch {
    } finally {
      setIsLoadingPlans(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const handleScroll = (e: { nativeEvent: { contentOffset: { y: number } } }) => {
    const y = e.nativeEvent.contentOffset.y;
    const diff = y - lastScrollY.current;
    if (diff > 8 && y > 30 && pillVisible.current) {
      pillVisible.current = false;
      Animated.timing(pillHeight, { toValue: 0, duration: 180, useNativeDriver: false }).start();
    } else if (diff < -8 && !pillVisible.current) {
      pillVisible.current = true;
      Animated.timing(pillHeight, { toValue: PILL_H, duration: 180, useNativeDriver: false }).start();
    }
    lastScrollY.current = y;
  };

  if (!isNavigationReady || isLoading || !user) {
    return (
      <View style={s.loadingContainer}>
        <ActivityIndicator size="large" color={T.action} />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <LinearGradient
        colors={['transparent', T.action, 'transparent']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={s.topLine}
      />

      <SafeAreaView style={{ flex: 1 }}>
        {/* ── Plan selector (se oculta al scrollear) ──────────────── */}
        <Animated.View style={[s.planSelectorWrap, { height: pillHeight }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.planSelectorContent}
          >
            <TouchableOpacity onPress={selectPersonalPlan} activeOpacity={0.8}>
              <View style={[s.planChip, mode === 'personal' && s.planChipActive]}>
                <Text style={[s.planChipText, mode === 'personal' && s.planChipTextActive]}>
                  PLAN PERSONAL
                </Text>
              </View>
            </TouchableOpacity>

            {trainers.map(t => {
              const active = mode === 'trainer' && selectedTrainer?.id === t.id;
              return (
                <TouchableOpacity key={t.id} onPress={() => selectTrainer(t)} activeOpacity={0.8}>
                  <View style={[s.planChip, active && s.planChipActive]}>
                    <Text style={[s.planChipText, active && s.planChipTextActive]}>
                      {t.full_name.toUpperCase()}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* ── Scroll content ──────────────────────────────────────── */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
          scrollEventThrottle={16}
          onScroll={handleScroll}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh}
              tintColor={T.action} colors={[T.action]} />
          }
        >
          {activeSnapshot && (
            <ResumeWorkoutBanner
              routineId={activeSnapshot.routineId}
              routineName={activeRoutineName}
              startedAt={activeSnapshot.startedAt}
              T={T}
              s={s}
              ctaGradColors={ctaGradColors}
            />
          )}

          {mode === 'personal' ? (
            <PersonalPlanView
              plans={plans}
              isLoading={isLoadingPlans}
              hasTrainers={hasTrainers}
              todayData={todayData}
              weeklyStats={weeklyStats}
              weeklyCompletedDays={weeklyCompletedDays}
              profile={profile}
              T={T}
              s={s}
              actionDimBg={actionDimBg}
              isDark={activeTheme === 'dark'}
            />
          ) : (
            <TrainerView
              trainer={selectedTrainer!}
              userId={user?.id}
              T={T}
              s={s}
            />
          )}
        </ScrollView>

        {/* ── Coach IA (botón flotante) ──────────────────────────── */}
        <TouchableOpacity
          style={s.coachFab}
          activeOpacity={0.85}
          onPress={() => router.push('/student/coach')}
        >
          <Ionicons name="sparkles" size={22} color={T.actionFg} />
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

// ─── Resume Workout Banner ────────────────────────────────────────────────────

function ResumeWorkoutBanner({ routineId, routineName, startedAt, T, s, ctaGradColors }: {
  routineId: string;
  routineName: string | null;
  startedAt: string;
  T: ThemeTokens;
  s: ReturnType<typeof createStyles>;
  ctaGradColors: [string, string];
}) {
  const elapsedMin = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000));
  const handleResume = () => router.push(`/student/workout/${routineId}`);

  return (
    <TouchableOpacity onPress={handleResume} activeOpacity={0.85} style={s.resumeWrap}>
      <LinearGradient
        colors={ctaGradColors}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={s.resumeCard}
      >
        <View style={s.resumeIcon}>
          <Ionicons name="play" size={18} color={T.actionFg} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.resumeLabel}>ENTRENAMIENTO EN CURSO</Text>
          <Text style={s.resumeTitle} numberOfLines={1}>
            {routineName?.toUpperCase() ?? 'CONTINUAR'}
          </Text>
          <Text style={s.resumeMeta}>Hace {elapsedMin} min · Tocá para continuar</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={T.action} />
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ─── Personal Plan View ───────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function PersonalPlanView({ plans, isLoading, hasTrainers, todayData, weeklyStats, weeklyCompletedDays, profile, T, s, actionDimBg, isDark }: {
  plans: Plan[];
  isLoading: boolean;
  hasTrainers: boolean;
  todayData: TodayRoutineResult | null;
  weeklyStats: WeeklyStats | null;
  weeklyCompletedDays: number[];
  profile: Profile | null;
  T: ThemeTokens;
  s: ReturnType<typeof createStyles>;
  actionDimBg: string;
  isDark: boolean;
}) {
  const handleCreatePlan = () => router.push('/student/plan/create');
  const handleOpenPlan = (id: string) => router.push(`/student/plan/${id}`);
  const dayLabel = getDayLabel(getCurrentDayOfWeek());

  const firstName = profile?.full_name?.split(' ')[0] ?? '';
  const greeting = getGreeting();

  // Union of all active plans' training days
  const trainingDays = Array.from(new Set(
    plans.filter(p => p.is_active).flatMap(p => p.training_days ?? [])
  ));

  return (
    <View>
      {/* ── Greeting header ─────────────────────────────────────── */}
      <View style={s.greetingWrap}>
        <Text style={s.greetingText}>
          {greeting}{firstName ? `, ${firstName}` : ''}
        </Text>
      </View>

      {/* ── Weekly mini calendar ────────────────────────────────── */}
      {plans.length > 0 && (
        <WeeklyCalendar
          trainingDays={trainingDays}
          completedDays={weeklyCompletedDays}
          todayDay={getCurrentDayOfWeek()}
          T={T}
          s={s}
          actionDimBg={actionDimBg}
        />
      )}

      {/* ── Today hero ──────────────────────────────────────────── */}
      {plans.length > 0 && (
        <View style={{ marginBottom: 28 }}>
          {todayData?.isRestDay ? (
            <RestCard dayLabel={dayLabel} T={T} s={s} />
          ) : (
            (todayData?.items ?? []).map(item => (
              <TodayRoutineCard key={item.routine.id} item={item} dayLabel={dayLabel} T={T} s={s} actionDimBg={actionDimBg} />
            ))
          )}

          {/* Stats strip */}
          {weeklyStats && (
            <View style={s.statsStrip}>
              <View style={s.statBlock}>
                <View style={s.statIconWrap}>
                  <Ionicons name="calendar-outline" size={16} color={T.action} />
                </View>
                <View>
                  <Text style={s.statValue}>
                    {weeklyStats.workoutsCompleted}
                    {weeklyStats.workoutsPlanned > 0 && (
                      <Text style={s.statValueDim}>/{weeklyStats.workoutsPlanned}</Text>
                    )}
                  </Text>
                  <Text style={s.statLabel}>ESTA SEMANA</Text>
                </View>
              </View>
              <View style={s.statSep} />
              <View style={s.statBlock}>
                <View style={[s.statIconWrap, s.statIconAttention]}>
                  <Ionicons name="flame" size={16} color={T.attention} />
                </View>
                <View>
                  <Text style={[s.statValue, s.statValueStreak]}>
                    {weeklyStats.streak}
                    <Text style={[s.statValueDim, s.statValueStreakDim]}>
                      {' '}día{weeklyStats.streak !== 1 ? 's' : ''}
                    </Text>
                  </Text>
                  <Text style={s.statLabel}>RACHA</Text>
                </View>
              </View>
            </View>
          )}
        </View>
      )}

      {/* ── Plans header ────────────────────────────────────────── */}
      <View style={s.sectionRow}>
        <Text style={s.sectionTitle}>MIS PLANES</Text>
        <TouchableOpacity onPress={handleCreatePlan} style={s.addBtn} activeOpacity={0.85}>
          <Ionicons name="add" size={16} color={actionDimBg} />
          <Text style={s.addBtnText}>NUEVO</Text>
        </TouchableOpacity>
      </View>

      {/* style instead of className: avoids NavigationStateContext race on initial load */}
      {isLoading ? (
        <View style={{ paddingVertical: 32, alignItems: 'center' }}>
          <ActivityIndicator size="large" color={T.action} />
        </View>
      ) : plans.length === 0 ? (
        <EmptyPlans onCreatePlan={handleCreatePlan} T={T} s={s} actionDimBg={actionDimBg} />
      ) : (
        <View style={[s.planList, { marginBottom: 28 }]}>
          {plans.filter(p => p.is_active).map((plan, idx, arr) => (
            <TouchableOpacity key={plan.id} onPress={() => handleOpenPlan(plan.id)} activeOpacity={0.85}>
              <View style={[s.planListItem, idx < arr.length - 1 && s.planListSep]}>
                <View style={[s.planListAccent, plan.trainer_id != null && { backgroundColor: T.attention }]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.planListName}>{plan.name.toUpperCase()}</Text>
                  <Text style={s.planListMeta}>{plan.discipline} · {getFrequencyLabel(plan.weekly_frequency)}</Text>
                  {plan.trainer_id != null && (
                    <View style={s.planTrainerChip}>
                      <Ionicons name="person-outline" size={9} color={T.attention} />
                      <Text style={s.planTrainerChipText}>DE TU ENTRENADOR</Text>
                    </View>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={14} color={T.textSecondary} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ── No trainer nudge ────────────────────────────────────── */}
      {!hasTrainers && (
        <View style={s.nudgeCard}>
          <Ionicons name="person-add-outline" size={20} color={T.textSecondary} />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={s.nudgeTitle}>¿Querés un entrenador?</Text>
            <Text style={s.nudgeDesc}>Revisá tus invitaciones en tu perfil.</Text>
          </View>
        </View>
      )}

      {/* ── Retos ───────────────────────────────────────────────── */}
      <ChallengesSection T={T} s={s} isDark={isDark} />

      {/* ── Para vos ────────────────────────────────────────────── */}
      <FeedSection s={s} />
    </View>
  );
}

// ─── Challenges Section ───────────────────────────────────────────────────────

const DUMMY_CHALLENGES = [
  {
    id: '1',
    icon: 'flame-outline' as const,
    accentColor: '#FEB127',
    accentBgDark: '#130d00',
    accentBgLight: '#FDF6E8',
    label: 'RACHA',
    current: 3,
    total: 5,
    title: 'días seguidos',
    progress: 0.6,
  },
  {
    id: '2',
    icon: 'barbell-outline' as const,
    accentColor: '#00D1FF',
    accentBgDark: '#001820',
    accentBgLight: '#e0f7fa',
    label: 'SEMANA',
    current: 2,
    total: 5,
    title: 'para tu meta',
    progress: 0.4,
  },
  {
    id: '3',
    icon: 'sparkles-outline' as const,
    accentColor: '#a78bfa',
    accentBgDark: '#0c0920',
    accentBgLight: '#f3e8ff',
    label: 'IA · PERSONAL',
    current: 0,
    total: 100,
    title: '100 sentadillas',
    progress: 0,
  },
];

function ChallengesSection({ T, s, isDark }: { T: ThemeTokens; s: ReturnType<typeof createStyles>; isDark: boolean }) {
  return (
    <View style={{ marginBottom: 32 }}>
      <View style={[s.sectionRow, { marginBottom: 14 }]}>
        <Text style={s.sectionTitle}>RETOS</Text>
        <View style={s.comingSoonPill}>
          <Text style={s.comingSoonText}>PRÓXIMAMENTE</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingRight: 4 }}
      >
        {DUMMY_CHALLENGES.map(ch => (
          <View key={ch.id} style={[s.chCard, { borderColor: ch.accentColor + '30' }]}>
            <LinearGradient
              colors={[isDark ? ch.accentBgDark : ch.accentBgLight, T.surfaceElevated]}
              start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={s.chTopRow}>
              <Ionicons name={ch.icon} size={12} color={ch.accentColor} />
              <Text style={[s.chLabel, { color: ch.accentColor }]}>{ch.label}</Text>
            </View>

            <View style={s.chNumRow}>
              <Text style={[s.chBigNum, { color: ch.progress > 0 ? ch.accentColor : T.border }]}>
                {ch.progress > 0 ? ch.current : '—'}
              </Text>
              {ch.progress > 0 && (
                <Text style={s.chDenom}>/{ch.total}</Text>
              )}
            </View>
            <Text style={s.chUnitText}>{ch.title}</Text>

            <View style={{ flex: 1 }} />
            <View style={s.chTrack}>
              <View style={[s.chFill, {
                width: `${ch.progress * 100}%` as any,
                backgroundColor: ch.progress > 0 ? ch.accentColor : 'transparent',
              }]} />
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

// ─── Feed Section (consejos / curiosidades / noticias) ────────────────────────

const DUMMY_FEED = [
  {
    id: '1',
    category: 'CONSEJO DEL DÍA',
    categoryColor: '#00D1FF',
    title: 'Hidratate antes de entrenar',
    body: 'Tomar 500 ml de agua 30 min antes mejora tu rendimiento hasta un 10%.',
    icon: 'water-outline' as const,
  },
  {
    id: '2',
    category: 'CURIOSIDAD',
    categoryColor: '#a78bfa',
    title: '¿Sabías esto del músculo?',
    body: 'El tejido muscular sigue reparándose 48 h después del ejercicio de fuerza.',
    icon: 'bulb-outline' as const,
  },
  {
    id: '3',
    category: 'TU DATO',
    categoryColor: '#FEB127',
    title: 'Tu mejor día es el miércoles',
    body: 'Tus sesiones del miércoles son 12% más largas en promedio.',
    icon: 'stats-chart-outline' as const,
  },
  {
    id: '4',
    category: 'CONSEJO',
    categoryColor: '#4ade80',
    title: 'Dormí más, rendí más',
    body: '8 h de sueño aumentan la síntesis proteica muscular un 20% vs. 6 h.',
    icon: 'moon-outline' as const,
  },
];

function FeedSection({ s }: { s: ReturnType<typeof createStyles> }) {
  const [featured, ...rest] = DUMMY_FEED;

  return (
    <View style={{ marginBottom: 24 }}>
      <View style={[s.sectionRow, { marginBottom: 14 }]}>
        <Text style={s.sectionTitle}>PARA VOS</Text>
        <View style={s.comingSoonPill}>
          <Text style={s.comingSoonText}>PRÓXIMAMENTE</Text>
        </View>
      </View>

      {/* Featured card — full width, editorial */}
      <View style={s.feedFeatured}>
        <View style={[s.feedFeaturedAccent, { backgroundColor: featured.categoryColor }]} />
        <View style={{ flex: 1, paddingVertical: 16, paddingRight: 16, paddingLeft: 18 }}>
          <View style={s.feedTagRow}>
            <Ionicons name={featured.icon} size={10} color={featured.categoryColor} />
            <Text style={[s.feedTag, { color: featured.categoryColor }]}>{featured.category}</Text>
          </View>
          <Text style={s.feedFeaturedTitle}>{featured.title}</Text>
          <Text style={s.feedFeaturedBody}>{featured.body}</Text>
        </View>
      </View>

      {/* Mini cards — horizontal scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 10, paddingRight: 4 }}
      >
        {rest.map(item => (
          <View key={item.id} style={[s.feedMiniCard, { borderTopColor: item.categoryColor }]}>
            <View style={s.feedTagRow}>
              <Ionicons name={item.icon} size={9} color={item.categoryColor} />
              <Text style={[s.feedMiniTag, { color: item.categoryColor }]}>{item.category}</Text>
            </View>
            <Text style={s.feedMiniTitle} numberOfLines={3}>{item.title}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

// ─── Weekly Calendar ─────────────────────────────────────────────────────────

function WeeklyCalendar({ trainingDays, completedDays, todayDay, T, s, actionDimBg }: {
  trainingDays: number[];
  completedDays: number[];
  todayDay: number;
  T: ThemeTokens;
  s: ReturnType<typeof createStyles>;
  actionDimBg: string;
}) {
  return (
    <View style={s.calendarWrap}>
      {WEEKDAYS.map(({ value, short }) => {
        const isToday = value === todayDay;
        const isCompleted = completedDays.includes(value);
        const isTraining = trainingDays.includes(value);

        let circleStyle: object = s.calDayCircle;
        let letterStyle: object = s.calDayLetter;
        let showDot = false;
        let dotColor = T.action;

        if (isToday && isCompleted) {
          circleStyle = [s.calDayCircle, s.calDayCircleGreen];
          letterStyle = [s.calDayLetter, s.calDayLetterOnAction];
        } else if (isToday && isTraining) {
          circleStyle = [s.calDayCircle, s.calDayCirclePrimary];
          letterStyle = [s.calDayLetter, s.calDayLetterOnAction];
        } else if (isToday) {
          circleStyle = [s.calDayCircle, s.calDayCircleToday];
          letterStyle = [s.calDayLetter, { color: T.action }];
        } else if (isCompleted) {
          showDot = true;
          dotColor = T.done;
          letterStyle = [s.calDayLetter, { color: T.textPrimary }];
        } else if (isTraining) {
          showDot = true;
          dotColor = actionDimBg;
        }

        return (
          <View key={value} style={s.calDayCol}>
            <View style={circleStyle}>
              {isToday && isCompleted ? (
                <Ionicons name="checkmark" size={14} color="#fff" />
              ) : (
                <Text style={letterStyle}>{short.charAt(0)}</Text>
              )}
            </View>
            <View style={[s.calDot, { backgroundColor: showDot ? dotColor : 'transparent' }]} />
          </View>
        );
      })}
    </View>
  );
}

// ─── Today Routine Card ───────────────────────────────────────────────────────

function TodayRoutineCard({ item, dayLabel, T, s, actionDimBg }: {
  item: TodayRoutineItem;
  dayLabel: string;
  T: ThemeTokens;
  s: ReturnType<typeof createStyles>;
  actionDimBg: string;
}) {
  const handleStart = () => router.push(`/student/workout/${item.routine.id}`);

  if (item.alreadyTrainedToday) {
    return (
      <View style={s.heroCard}>
        {/* green top line */}
        <LinearGradient colors={['transparent', T.done, 'transparent']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.heroTopLine} />
        <View style={s.heroBody}>
          <View style={s.heroMeta}>
            <Ionicons name="checkmark-circle" size={32} color={T.done} />
            <View style={{ marginLeft: 14, flex: 1 }}>
              <Text style={s.heroDayLabel}>{dayLabel.toUpperCase()}</Text>
              <Text style={s.heroTitle}>¡YA ENTRENASTE!</Text>
              <Text style={s.heroSub}>{item.routine.name}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={s.heroCard}>
      {/* cyan top line */}
      <LinearGradient colors={['transparent', T.action, 'transparent']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.heroTopLine} />
      <View style={s.heroBody}>
        <Text style={s.heroDayLabel}>{dayLabel.toUpperCase()} · RUTINA DE HOY</Text>
        <Text style={s.heroTitle}>{item.routine.name.toUpperCase()}</Text>
        <Text style={s.heroSub}>{item.plan.name}</Text>
        <TouchableOpacity onPress={handleStart} activeOpacity={0.9} style={{ marginTop: 20 }}>
          <LinearGradient colors={[T.action, '#0099cc']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.heroPrimaryBtn}>
            <Ionicons name="play-circle" size={22} color={T.actionFg} />
            <Text style={[s.heroPrimaryBtnText, { color: T.actionFg }]}>ENTRENAR AHORA</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Rest Card ────────────────────────────────────────────────────────────────

function RestCard({ dayLabel, T, s }: { dayLabel: string; T: ThemeTokens; s: ReturnType<typeof createStyles> }) {
  return (
    <View style={[s.heroCard, { borderColor: T.border }]}>
      <View style={s.heroBody}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={s.restIcon}>
            <Ionicons name="moon" size={26} color={T.textSecondary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.heroDayLabel}>{dayLabel.toUpperCase()}</Text>
            <Text style={s.heroTitle}>DÍA DE DESCANSO</Text>
            <Text style={s.heroSub}>Recuperate. Mañana volvés más fuerte.</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Empty Plans ──────────────────────────────────────────────────────────────

function EmptyPlans({ onCreatePlan, T, s, actionDimBg }: {
  onCreatePlan: () => void;
  T: ThemeTokens;
  s: ReturnType<typeof createStyles>;
  actionDimBg: string;
}) {
  return (
    <View style={s.emptyCard}>
      <View style={s.emptyIcon}>
        <Ionicons name="barbell-outline" size={36} color={T.action} />
      </View>
      <Text style={s.emptyTitle}>SIN PLANES AÚN</Text>
      <Text style={s.emptyDesc}>Creá tu primer plan para comenzar a entrenar.</Text>
      <TouchableOpacity onPress={onCreatePlan} style={s.addBtn} activeOpacity={0.85}>
        <Ionicons name="add" size={16} color={actionDimBg} />
        <Text style={s.addBtnText}>CREAR PLAN</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Trainer View ─────────────────────────────────────────────────────────────

function TrainerDetailRow({ icon, label, value, s, T }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  s: ReturnType<typeof createStyles>;
  T: ThemeTokens;
}) {
  return (
    <View style={s.trainerDetailRow}>
      <View style={s.trainerDetailLeft}>
        <Ionicons name={icon} size={14} color={T.attention} />
        <Text style={s.trainerDetailLabel}>{label}</Text>
      </View>
      <Text style={s.trainerDetailValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function TrainerView({ trainer, userId, T, s }: {
  trainer: ActiveTrainer;
  userId?: string;
  T: ThemeTokens;
  s: ReturnType<typeof createStyles>;
}) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);

  const loadPlans = useCallback(async () => {
    if (!userId) return;
    setIsLoadingPlans(true);
    const { plans: allPlans } = await getUserPlans(userId);
    setPlans(allPlans.filter(p => p.trainer_id === trainer.id));
    setIsLoadingPlans(false);
  }, [userId, trainer.id]);

  useEffect(() => { loadPlans(); }, [loadPlans]);

  const initial = trainer.full_name.charAt(0).toUpperCase();
  const firstName = trainer.full_name.split(' ')[0];
  const memberSince = new Date(trainer.accepted_at).toLocaleDateString('es-AR', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <View>
      {/* ── Hero entrenador ─────────────────────────────────────── */}
      <View style={s.trainerHero}>
        <LinearGradient
          colors={['transparent', T.attention, 'transparent']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={s.trainerHeroLine}
        />
        <View style={s.trainerHeroBody}>
          <View style={s.trainerHeroTop}>
            <View style={s.trainerAvatar}>
              <Text style={s.trainerAvatarLetter}>{initial}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={s.trainerBadge}>
                <Ionicons name="person-circle-outline" size={11} color={T.attention} />
                <Text style={s.trainerBadgeText}>TU ENTRENADOR</Text>
              </View>
              <Text style={s.trainerName}>{trainer.full_name}</Text>
              <Text style={s.trainerSince}>Entrenando juntos desde {memberSince}</Text>
            </View>
          </View>

          <View style={s.trainerDetailsPanel}>
            <TrainerDetailRow icon="fitness-outline" label="DISCIPLINA" value={trainer.discipline} s={s} T={T} />
            <View style={s.trainerDetailSep} />
            <TrainerDetailRow icon="document-text-outline" label="TIPO DE PLAN" value={trainer.plan_type} s={s} T={T} />
            <View style={s.trainerDetailSep} />
            <TrainerDetailRow icon="calendar-outline" label="FRECUENCIA" value={trainer.frequency} s={s} T={T} />
          </View>
        </View>
      </View>

      {/* ── Planes asignados ────────────────────────────────────── */}
      <View style={[s.sectionRow, { marginBottom: 12 }]}>
        <Text style={s.sectionTitle}>PLANES ASIGNADOS</Text>
        {plans.length > 0 && (
          <View style={s.trainerPlanCount}>
            <Text style={s.trainerPlanCountText}>{plans.length}</Text>
          </View>
        )}
      </View>

      {isLoadingPlans ? (
        <View style={{ paddingVertical: 28, alignItems: 'center' }}>
          <ActivityIndicator size="small" color={T.attention} />
        </View>
      ) : plans.length === 0 ? (
        <View style={s.trainerEmptyCard}>
          <View style={s.trainerEmptyIcon}>
            <Ionicons name="clipboard-outline" size={26} color={T.attention} />
          </View>
          <Text style={s.trainerEmptyTitle}>Sin plan asignado aún</Text>
          <Text style={s.trainerEmptyDesc}>
            {firstName} todavía no te cargó un plan. Aparecerá acá cuando lo publique.
          </Text>
        </View>
      ) : (
        <View style={[s.planList, { marginBottom: 20 }]}>
          {plans.map((plan, idx, arr) => (
            <TouchableOpacity
              key={plan.id}
              onPress={() => router.push(`/student/plan/${plan.id}`)}
              activeOpacity={0.85}
            >
              <View style={[s.planListItem, idx < arr.length - 1 && s.planListSep]}>
                <View style={[s.planListAccent, { backgroundColor: T.attention }]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.planListName}>{plan.name.toUpperCase()}</Text>
                  <Text style={s.planListMeta}>
                    {plan.discipline} · {getFrequencyLabel(plan.weekly_frequency)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={T.textSecondary} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ── Ayuda ───────────────────────────────────────────────── */}
      <View style={s.trainerTipCard}>
        <Ionicons name="information-circle-outline" size={18} color={T.textSecondary} style={{ marginTop: 1 }} />
        <Text style={s.trainerTipText}>
          {plans.length > 0
            ? `Tocá un plan para ver las rutinas que ${firstName} te asignó.`
            : `Mientras tanto podés seguir con tu plan personal desde el selector de arriba.`}
        </Text>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function createStyles(T: ThemeTokens, actionDimBg = '#00566a', isDark = true) {
  const trainerChipBg = isDark ? '#130d00' : '#fff3e0';
  const trainerChipBorder = isDark ? '#4a3200' : '#ffe0b2';
  const attentionIconBg = isDark ? 'rgba(254,177,39,0.12)' : '#FDF6E8';
  const attentionBg = isDark ? 'rgba(254,177,39,0.09)' : '#FDF6E8';
  const attentionLine = isDark ? 'rgba(254,177,39,0.30)' : 'rgba(184,121,26,0.35)';
  const attentionText = isDark ? T.attention : '#8A5A11';
  const streakValueColor = attentionText;

  return StyleSheet.create({
    container:       { flex: 1, backgroundColor: T.surface },
    loadingContainer:{ flex: 1, backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center' },
    topLine:         { position: 'absolute', top: 0, left: 0, right: 0, height: 2, opacity: 0.4, zIndex: 10 },

    // Greeting header
    greetingWrap:    { marginBottom: 16, marginTop: 4 },
    greetingText:    { color: T.textPrimary, fontSize: 22, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: -0.5 },

    // Weekly calendar
    calendarWrap:        { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: T.surfaceElevated, borderRadius: 12, borderWidth: 1, borderColor: T.border, paddingVertical: 14, paddingHorizontal: 12, marginBottom: 20 },
    calDayCol:           { alignItems: 'center', gap: 4, flex: 1 },
    calDayCircle:        { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    calDayCirclePrimary: { backgroundColor: T.action },
    calDayCircleGreen:   { backgroundColor: T.done },
    calDayCircleToday:   { borderWidth: 1.5, borderColor: T.action },
    calDayLetter:        { color: T.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk_700Bold' },
    calDayLetterOnAction:{ color: T.actionFg },
    calDot:              { width: 5, height: 5, borderRadius: 3 },

    // Plan selector
    planSelectorWrap:    { overflow: 'hidden', borderBottomWidth: 1, borderBottomColor: T.border },
    planSelectorContent: { flexGrow: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
    planChip:            { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: T.border, backgroundColor: T.surfaceElevated },
    planChipActive:      { borderColor: T.action, backgroundColor: actionDimBg },
    planChipText:        { color: T.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1 },
    planChipTextActive:  { color: T.action },

    // Hero card (today's workout)
    heroCard:       { backgroundColor: T.surfaceElevated, borderRadius: 14, borderWidth: 1, borderColor: T.action, marginBottom: 14, overflow: 'hidden' },
    heroTopLine:    { height: 2, opacity: 0.6 },
    heroBody:       { padding: 20 },
    heroDayLabel:   { color: T.textSecondary, fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 3, marginBottom: 6 },
    heroTitle:      { color: T.textPrimary, fontSize: 20, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: -0.5, lineHeight: 26 },
    heroSub:        { color: T.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular', marginTop: 4 },
    heroMeta:       { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    heroPrimaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 8, gap: 10 },
    heroPrimaryBtnText: { color: T.actionFg, fontSize: 15, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 2 },

    // Rest card
    restIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: T.border, alignItems: 'center', justifyContent: 'center', marginRight: 16 },

    // Stats strip
    statsStrip: { flexDirection: 'row', backgroundColor: T.surfaceElevated, borderRadius: 10, borderWidth: 1, borderColor: T.border, overflow: 'hidden' },
    statBlock:  { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
    statSep:    { width: 1, backgroundColor: T.border },
    statIconWrap:      { width: 32, height: 32, borderRadius: 8, backgroundColor: actionDimBg, alignItems: 'center', justifyContent: 'center' },
    statIconAttention: { backgroundColor: attentionIconBg },
    statValue:         { color: T.textPrimary, fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold' },
    statValueStreak:   { color: streakValueColor },
    statValueStreakDim:{ color: streakValueColor, opacity: 0.6 },
    statValueDim:      { color: T.textSecondary, fontSize: 14, fontFamily: 'SpaceGrotesk_400Regular' },
    statLabel:  { color: T.textSecondary, fontSize: 9, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 2, marginTop: 1 },

    // Section
    sectionRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    sectionTitle:{ color: T.textSecondary, fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 3 },
    addBtn:      { flexDirection: 'row', alignItems: 'center', backgroundColor: T.action, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 6, gap: 4 },
    addBtnText:  { color: T.actionFg, fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1.5 },

    // Empty
    emptyCard: { backgroundColor: T.surfaceElevated, borderRadius: 12, borderWidth: 1, borderColor: T.border, padding: 32, alignItems: 'center', marginBottom: 8 },
    emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: actionDimBg, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    emptyTitle:{ color: T.textPrimary, fontSize: 14, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 2, marginBottom: 8 },
    emptyDesc: { color: T.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular', textAlign: 'center', lineHeight: 20, marginBottom: 20 },


    // Nudge
    nudgeCard:  { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: T.surfaceElevated, borderRadius: 10, borderWidth: 1, borderColor: T.textSecondary, padding: 14, marginTop: 8, marginBottom: 24 },
    nudgeTitle: { color: T.textPrimary, fontSize: 13, fontFamily: 'SpaceGrotesk_700Bold', marginBottom: 4 },
    nudgeDesc:  { color: T.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular', lineHeight: 18 },

    // Coming soon pill
    comingSoonPill: { backgroundColor: T.border, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: T.border },
    comingSoonText: { color: T.textSecondary, fontSize: 8, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 2 },

    // Plan list (minimal)
    planList:       { backgroundColor: T.surfaceElevated, borderRadius: 12, borderWidth: 1, borderColor: T.border, overflow: 'hidden' },
    planListItem:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingRight: 16, paddingLeft: 20, gap: 12 },
    planListSep:    { borderBottomWidth: 1, borderBottomColor: T.border },
    planListAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: T.action },
    planListName:   { color: T.textPrimary, fontSize: 14, fontFamily: 'SpaceGrotesk_700Bold', marginBottom: 3 },
    planListMeta:   { color: T.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular' },
    planTrainerChip:     { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginTop: 5, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5, backgroundColor: trainerChipBg, borderWidth: 1, borderColor: trainerChipBorder },
    planTrainerChipText: { color: T.attention, fontSize: 7, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1.2 },

    // Challenge achievement chips (horizontal scroll)
    chCard:     { width: 160, height: 178, borderRadius: 16, borderWidth: 1, padding: 16, overflow: 'hidden', justifyContent: 'flex-start' },
    chTopRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
    chLabel:    { fontSize: 9, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 2 },
    chNumRow:   { flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginBottom: 4 },
    chBigNum:   { fontSize: 44, fontFamily: 'SpaceGrotesk_700Bold', lineHeight: 50 },
    chDenom:    { color: T.textSecondary, fontSize: 20, fontFamily: 'SpaceGrotesk_400Regular', marginBottom: 5 },
    chUnitText: { color: T.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular' },
    chTrack:    { height: 3, backgroundColor: T.border, borderRadius: 2, overflow: 'hidden', marginTop: 14 },
    chFill:     { height: 3, borderRadius: 2 },

    // Feed — featured card (full-width editorial)
    feedFeatured:       { flexDirection: 'row', backgroundColor: T.surfaceElevated, borderRadius: 12, borderWidth: 1, borderColor: T.border, overflow: 'hidden', marginBottom: 10 },
    feedFeaturedAccent: { width: 4 },
    feedTagRow:         { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10 },
    feedTag:            { fontSize: 9, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 2 },
    feedFeaturedTitle:  { color: T.textPrimary, fontSize: 16, fontFamily: 'SpaceGrotesk_700Bold', lineHeight: 22, marginBottom: 8 },
    feedFeaturedBody:   { color: T.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular', lineHeight: 17 },

    // Feed — mini cards (horizontal scroll)
    feedMiniCard:  { width: 140, backgroundColor: T.surfaceElevated, borderRadius: 10, borderWidth: 1, borderColor: T.border, borderTopWidth: 2.5, padding: 12 },
    feedMiniTag:   { fontSize: 9, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1.5, marginBottom: 8 },
    feedMiniTitle: { color: T.textPrimary, fontSize: 13, fontFamily: 'SpaceGrotesk_700Bold', lineHeight: 18 },

    // Trainer view
    trainerHero:         { backgroundColor: attentionBg, borderRadius: 16, borderWidth: 1, borderColor: attentionLine, marginBottom: 24, overflow: 'hidden' },
    trainerHeroLine:     { height: 2, opacity: 0.7 },
    trainerHeroBody:     { padding: 20 },
    trainerHeroTop:      { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 },
    trainerAvatar:       { width: 56, height: 56, borderRadius: 28, backgroundColor: trainerChipBg, borderWidth: 2, borderColor: T.attention, alignItems: 'center', justifyContent: 'center' },
    trainerAvatarLetter: { color: attentionText, fontSize: 22, fontFamily: 'SpaceGrotesk_700Bold' },
    trainerBadge:        { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: T.surfaceElevated, borderWidth: 1, borderColor: attentionLine, marginBottom: 8 },
    trainerBadgeText:    { color: attentionText, fontSize: 9, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1.5 },
    trainerName:         { color: T.textPrimary, fontSize: 22, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: -0.4, marginBottom: 4 },
    trainerSince:        { color: T.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular' },
    trainerDetailsPanel: { backgroundColor: T.surfaceElevated, borderRadius: 12, borderWidth: 1, borderColor: T.border, overflow: 'hidden' },
    trainerDetailRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, gap: 12 },
    trainerDetailLeft:   { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
    trainerDetailLabel:  { color: T.textSecondary, fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1.2 },
    trainerDetailValue:  { color: T.textPrimary, fontSize: 13, fontFamily: 'SpaceGrotesk_600SemiBold', flexShrink: 1, textAlign: 'right' },
    trainerDetailSep:    { height: 1, backgroundColor: T.border },
    trainerPlanCount:    { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: attentionIconBg, borderWidth: 1, borderColor: attentionLine, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
    trainerPlanCountText:{ color: attentionText, fontSize: 11, fontFamily: 'SpaceGrotesk_700Bold' },
    trainerEmptyCard:    { backgroundColor: T.surfaceElevated, borderRadius: 14, borderWidth: 1, borderColor: T.border, padding: 28, alignItems: 'center', marginBottom: 20 },
    trainerEmptyIcon:    { width: 56, height: 56, borderRadius: 28, backgroundColor: attentionIconBg, borderWidth: 1, borderColor: attentionLine, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
    trainerEmptyTitle:   { color: T.textPrimary, fontSize: 14, fontFamily: 'SpaceGrotesk_700Bold', marginBottom: 6 },
    trainerEmptyDesc:    { color: T.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular', textAlign: 'center', lineHeight: 19 },
    trainerTipCard:      { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: T.surfaceElevated, borderRadius: 10, borderWidth: 1, borderColor: T.border, padding: 14 },
    trainerTipText:      { flex: 1, color: T.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular', lineHeight: 18 },

    // Resume workout banner
    resumeWrap:   { borderRadius: 14, overflow: 'hidden', marginBottom: 20 },
    resumeCard:   { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12, borderWidth: 1, borderColor: T.action, borderRadius: 14 },
    resumeIcon:   { width: 36, height: 36, borderRadius: 18, backgroundColor: T.action, alignItems: 'center', justifyContent: 'center' },
    resumeLabel:  { color: T.action, fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1.5, marginBottom: 2 },
    resumeTitle:  { color: T.textPrimary, fontSize: 15, fontFamily: 'SpaceGrotesk_700Bold', marginBottom: 2 },
    resumeMeta:   { color: T.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular' },

    // Coach IA floating button
    coachFab: {
      position: 'absolute', right: 20, bottom: 24,
      width: 56, height: 56, borderRadius: 28, backgroundColor: T.action,
      alignItems: 'center', justifyContent: 'center',
      shadowColor: T.action, shadowOpacity: 0.5, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
      elevation: 8,
    },

  });
}

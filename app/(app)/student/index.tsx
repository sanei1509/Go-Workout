import { useState, useEffect, useRef, useCallback } from 'react';
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
  TodayRoutineResult,
  TodayRoutineItem,
  WeeklyStats,
  getDayLabel,
  getCurrentDayOfWeek,
} from '@/lib/services/todayService';
import {
  getActiveSnapshot,
  ActiveWorkoutSnapshot,
} from '@/lib/services/activeSessionService';
import { getRoutineById } from '@/lib/services/routineService';

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

export default function StudentHome() {
  const { user } = useAuth();
  const {
    mode,
    selectedTrainer,
    trainers,
    isLoading,
    hasTrainers,
    selectPersonalPlan,
    selectTrainer,
  } = useTraining();
  const rootNavigationState = useRootNavigationState();
  const isNavigationReady = Boolean(rootNavigationState?.key);

  const PILL_H = 52;
  const pillHeight = useRef(new Animated.Value(PILL_H)).current;
  const lastScrollY = useRef(0);
  const pillVisible = useRef(true);

  const [plans, setPlans] = useState<Plan[]>([]);
  const [todayData, setTodayData] = useState<TodayRoutineResult | null>(null);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats | null>(null);
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
      const [plansResult, todayResult, statsResult] = await Promise.all([
        getUserPlans(user.id),
        getTodayRoutine(user.id),
        getWeeklyStats(user.id),
      ]);
      setPlans(plansResult.plans);
      setTodayData(todayResult.result);
      setWeeklyStats(statsResult.stats);
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
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <LinearGradient
        colors={['transparent', C.primary, 'transparent']}
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
              tintColor={C.primary} colors={[C.primary]} />
          }
        >
          {activeSnapshot && (
            <ResumeWorkoutBanner
              routineId={activeSnapshot.routineId}
              routineName={activeRoutineName}
              startedAt={activeSnapshot.startedAt}
            />
          )}

          {mode === 'personal' ? (
            <PersonalPlanView
              plans={plans}
              isLoading={isLoadingPlans}
              hasTrainers={hasTrainers}
              todayData={todayData}
              weeklyStats={weeklyStats}
            />
          ) : (
            <TrainerView trainer={selectedTrainer!} />
          )}
        </ScrollView>

        {/* ── Coach IA (botón flotante) ──────────────────────────── */}
        <TouchableOpacity
          style={s.coachFab}
          activeOpacity={0.85}
          onPress={() => router.push('/student/coach')}
        >
          <Ionicons name="sparkles" size={22} color={C.bg} />
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

// ─── Resume Workout Banner ────────────────────────────────────────────────────

function ResumeWorkoutBanner({ routineId, routineName, startedAt }: {
  routineId: string;
  routineName: string | null;
  startedAt: string;
}) {
  const elapsedMin = Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000));
  const handleResume = () => router.push(`/student/workout/${routineId}`);

  return (
    <TouchableOpacity onPress={handleResume} activeOpacity={0.85} style={s.resumeWrap}>
      <LinearGradient
        colors={[C.primaryDim, '#003d4d']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={s.resumeCard}
      >
        <View style={s.resumeIcon}>
          <Ionicons name="play" size={18} color={C.bg} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.resumeLabel}>ENTRENAMIENTO EN CURSO</Text>
          <Text style={s.resumeTitle} numberOfLines={1}>
            {routineName?.toUpperCase() ?? 'CONTINUAR'}
          </Text>
          <Text style={s.resumeMeta}>Hace {elapsedMin} min · Tocá para continuar</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={C.primary} />
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ─── Personal Plan View ───────────────────────────────────────────────────────

function PersonalPlanView({ plans, isLoading, hasTrainers, todayData, weeklyStats }: {
  plans: Plan[];
  isLoading: boolean;
  hasTrainers: boolean;
  todayData: TodayRoutineResult | null;
  weeklyStats: WeeklyStats | null;
}) {
  const handleCreatePlan = () => router.push('/student/plan/create');
  const handleOpenPlan = (id: string) => router.push(`/student/plan/${id}`);
  const handleViewHistory = () => router.push('/student/history');
  const dayLabel = getDayLabel(getCurrentDayOfWeek());

  return (
    <View>
      {/* ── Today hero ──────────────────────────────────────────── */}
      {plans.length > 0 && (
        <View style={{ marginBottom: 28 }}>
          {todayData?.isRestDay ? (
            <RestCard dayLabel={dayLabel} />
          ) : (
            (todayData?.items ?? []).map(item => (
              <TodayRoutineCard key={item.routine.id} item={item} dayLabel={dayLabel} onViewHistory={handleViewHistory} />
            ))
          )}

          {/* Stats strip */}
          {weeklyStats && (
            <View style={s.statsStrip}>
              <View style={s.statBlock}>
                <View style={s.statIconWrap}>
                  <Ionicons name="calendar-outline" size={16} color={C.primary} />
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
                <View style={[s.statIconWrap, { backgroundColor: '#2a1f00' }]}>
                  <Ionicons name="flame" size={16} color={C.tertiary} />
                </View>
                <View>
                  <Text style={[s.statValue, { color: C.tertiary }]}>
                    {weeklyStats.streak}
                    <Text style={[s.statValueDim, { color: C.tertiary, opacity: 0.6 }]}>
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
          <Ionicons name="add" size={16} color={C.primaryDim} />
          <Text style={s.addBtnText}>NUEVO</Text>
        </TouchableOpacity>
      </View>

      {/* style instead of className: avoids NavigationStateContext race on initial load */}
      {isLoading ? (
        <View style={{ paddingVertical: 32, alignItems: 'center' }}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : plans.length === 0 ? (
        <EmptyPlans onCreatePlan={handleCreatePlan} />
      ) : (
        <View style={{ marginBottom: 28 }}>
          {plans.map((plan, i) => (
            <TouchableOpacity key={plan.id} onPress={() => handleOpenPlan(plan.id)} activeOpacity={0.85}>
              <View style={[s.planCard, i === 0 && s.planCardHighlight]}>
                {i === 0 && <View style={[s.planBar, { backgroundColor: C.primary }]} />}
                <View style={[s.planIcon, i === 0 && { backgroundColor: C.primaryDim }]}>
                  <Ionicons name="barbell" size={20} color={i === 0 ? C.primary : C.neutral} />
                </View>
                <View style={{ flex: 1 }}>
                  {i === 0 && <Text style={s.planBadge}>ACTIVO</Text>}
                  <Text style={[s.planName, i === 0 && { color: C.textHi }]}>{plan.name.toUpperCase()}</Text>
                  <Text style={s.planMeta}>{plan.discipline} · {getFrequencyLabel(plan.weekly_frequency)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={i === 0 ? C.secondary : C.border} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ── Quick actions ───────────────────────────────────────── */}
      {plans.length > 0 && (
        <View style={{ marginBottom: 16 }}>
          <Text style={[s.sectionTitle, { marginBottom: 12 }]}>MÁS OPCIONES</Text>
          <ActionRow icon="time-outline" label="HISTORIAL" desc="Ver entrenamientos anteriores" onPress={handleViewHistory} />
          <ActionRow icon="stats-chart-outline" label="ANÁLISIS DE PROGRESO" desc="PRs, volumen y evolución" onPress={() => router.push('/student/analytics' as any)} />
          <ActionRow icon="notifications-outline" label="RECORDATORIOS" desc="Configurá tus notificaciones" onPress={() => router.push('/student/notifications')} />
          <ActionRow icon="sparkles-outline" label="CREAR CON IA" desc="Generá un plan personalizado" badge="PRO" badgeColor={C.tertiary} badgeTextColor="#7a5500" />
        </View>
      )}

      {/* ── No trainer nudge ────────────────────────────────────── */}
      {!hasTrainers && (
        <View style={s.nudgeCard}>
          <Ionicons name="person-add-outline" size={20} color={C.secondary} />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={s.nudgeTitle}>¿Querés un entrenador?</Text>
            <Text style={s.nudgeDesc}>Revisá tus invitaciones en tu perfil.</Text>
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Today Routine Card ───────────────────────────────────────────────────────

function TodayRoutineCard({ item, dayLabel, onViewHistory }: {
  item: TodayRoutineItem;
  dayLabel: string;
  onViewHistory: () => void;
}) {
  const handleStart = () => router.push(`/student/workout/${item.routine.id}`);

  if (item.alreadyTrainedToday) {
    return (
      <View style={s.heroCard}>
        {/* green top line */}
        <LinearGradient colors={['transparent', '#4ade80', 'transparent']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.heroTopLine} />
        <View style={s.heroBody}>
          <View style={s.heroMeta}>
            <Ionicons name="checkmark-circle" size={32} color="#4ade80" />
            <View style={{ marginLeft: 14, flex: 1 }}>
              <Text style={s.heroDayLabel}>{dayLabel.toUpperCase()}</Text>
              <Text style={s.heroTitle}>¡YA ENTRENASTE!</Text>
              <Text style={s.heroSub}>{item.routine.name}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onViewHistory} style={s.heroSecBtn} activeOpacity={0.85}>
            <Ionicons name="time-outline" size={16} color={C.neutral} />
            <Text style={s.heroSecBtnText}>VER HISTORIAL</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={s.heroCard}>
      {/* cyan top line */}
      <LinearGradient colors={['transparent', C.primary, 'transparent']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.heroTopLine} />
      <View style={s.heroBody}>
        <Text style={s.heroDayLabel}>{dayLabel.toUpperCase()} · RUTINA DE HOY</Text>
        <Text style={s.heroTitle}>{item.routine.name.toUpperCase()}</Text>
        <Text style={s.heroSub}>{item.plan.name}</Text>
        <TouchableOpacity onPress={handleStart} activeOpacity={0.9} style={{ marginTop: 20 }}>
          <LinearGradient colors={[C.primary, '#0099cc']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.heroPrimaryBtn}>
            <Ionicons name="play-circle" size={22} color={C.primaryDim} />
            <Text style={s.heroPrimaryBtnText}>ENTRENAR AHORA</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Rest Card ────────────────────────────────────────────────────────────────

function RestCard({ dayLabel }: { dayLabel: string }) {
  return (
    <View style={[s.heroCard, { borderColor: C.border }]}>
      <View style={s.heroBody}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={s.restIcon}>
            <Ionicons name="moon" size={26} color={C.secondary} />
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

function EmptyPlans({ onCreatePlan }: { onCreatePlan: () => void }) {
  return (
    <View style={s.emptyCard}>
      <View style={s.emptyIcon}>
        <Ionicons name="barbell-outline" size={36} color={C.primary} />
      </View>
      <Text style={s.emptyTitle}>SIN PLANES AÚN</Text>
      <Text style={s.emptyDesc}>Creá tu primer plan para comenzar a entrenar.</Text>
      <TouchableOpacity onPress={onCreatePlan} style={s.addBtn} activeOpacity={0.85}>
        <Ionicons name="add" size={16} color={C.primaryDim} />
        <Text style={s.addBtnText}>CREAR PLAN</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Action Row ───────────────────────────────────────────────────────────────

function ActionRow({ icon, label, desc, onPress, badge, badgeColor, badgeTextColor }: {
  icon: string; label: string; desc: string;
  onPress?: () => void;
  badge?: string; badgeColor?: string; badgeTextColor?: string;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={onPress ? 0.85 : 1} style={s.actionRow}>
      <View style={s.actionIcon}>
        <Ionicons name={icon as any} size={20} color={C.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
          <Text style={s.actionLabel}>{label}</Text>
          {badge && (
            <View style={[s.badge, { backgroundColor: badgeColor ?? C.primary }]}>
              <Text style={[s.badgeText, { color: badgeTextColor ?? C.primaryDim }]}>{badge}</Text>
            </View>
          )}
        </View>
        <Text style={s.actionDesc}>{desc}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={C.border} />
    </TouchableOpacity>
  );
}

// ─── Trainer View ─────────────────────────────────────────────────────────────

function TrainerView({ trainer }: { trainer: ActiveTrainer }) {
  return (
    <View>
      <View style={s.trainerHero}>
        <LinearGradient colors={['transparent', C.primary, 'transparent']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.heroTopLine} />
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <View style={s.trainerAvatar}>
            <Text style={s.trainerAvatarLetter}>{trainer.full_name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.heroDayLabel}>ENTRENANDO CON</Text>
            <Text style={s.heroTitle}>{trainer.full_name.toUpperCase()}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {[trainer.discipline, trainer.plan_type, trainer.frequency].map(tag => (
            <View key={tag} style={s.tag}>
              <Text style={s.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>

      <Text style={[s.sectionTitle, { marginBottom: 12 }]}>RUTINAS PENDIENTES</Text>
      <View style={s.placeholderCard}>
        <Ionicons name="barbell-outline" size={28} color={C.border} />
        <Text style={s.placeholderText}>Tu entrenador aún no te asignó rutinas</Text>
      </View>

      <Text style={[s.sectionTitle, { marginTop: 24, marginBottom: 12 }]}>HISTORIAL RECIENTE</Text>
      <View style={s.placeholderCard}>
        <Ionicons name="time-outline" size={28} color={C.border} />
        <Text style={s.placeholderText}>Todavía no tenés entrenamientos registrados</Text>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: C.bg },
  loadingContainer:{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  topLine:         { position: 'absolute', top: 0, left: 0, right: 0, height: 2, opacity: 0.4, zIndex: 10 },

  // Plan selector
  planSelectorWrap:    { overflow: 'hidden', borderBottomWidth: 1, borderBottomColor: C.border },
  planSelectorContent: { flexGrow: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  planChip:            { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
  planChipActive:      { borderColor: C.primary, backgroundColor: C.primaryDim },
  planChipText:        { color: C.neutral, fontSize: 12, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1 },
  planChipTextActive:  { color: C.primary },

  // Hero card (today's workout)
  heroCard:       { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.primary, marginBottom: 14, overflow: 'hidden' },
  heroTopLine:    { height: 2, opacity: 0.6 },
  heroBody:       { padding: 20 },
  heroDayLabel:   { color: C.neutral, fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 3, marginBottom: 6 },
  heroTitle:      { color: C.textHi, fontSize: 20, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: -0.5, lineHeight: 26 },
  heroSub:        { color: C.neutral, fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular', marginTop: 4 },
  heroMeta:       { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  heroPrimaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 8, gap: 10 },
  heroPrimaryBtnText: { color: C.primaryDim, fontSize: 15, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 2 },
  heroSecBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: C.border, gap: 8 },
  heroSecBtnText: { color: C.neutral, fontSize: 12, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 2 },

  // Rest card
  restIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: C.cardDeep, alignItems: 'center', justifyContent: 'center', marginRight: 16 },

  // Stats strip
  statsStrip: { flexDirection: 'row', backgroundColor: C.card, borderRadius: 10, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  statBlock:  { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  statSep:    { width: 1, backgroundColor: C.border },
  statIconWrap: { width: 32, height: 32, borderRadius: 8, backgroundColor: C.primaryDim, alignItems: 'center', justifyContent: 'center' },
  statValue:  { color: C.textHi, fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold' },
  statValueDim: { color: C.neutral, fontSize: 14, fontFamily: 'SpaceGrotesk_400Regular' },
  statLabel:  { color: C.textLo, fontSize: 9, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 2, marginTop: 1 },

  // Section
  sectionRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle:{ color: C.neutral, fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 3 },
  addBtn:      { flexDirection: 'row', alignItems: 'center', backgroundColor: C.primary, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 6, gap: 4 },
  addBtnText:  { color: C.primaryDim, fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1.5 },

  // Plan card
  planCard:          { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 8, overflow: 'hidden' },
  planCardHighlight: { borderColor: C.secondary },
  planBar:           { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  planIcon:          { width: 40, height: 40, borderRadius: 8, backgroundColor: C.cardDeep, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  planBadge:         { color: C.primary, fontSize: 9, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 2, marginBottom: 3 },
  planName:          { color: C.textLo, fontSize: 13, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 0.5 },
  planMeta:          { color: C.neutral, fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular', marginTop: 2 },

  // Empty
  emptyCard: { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 32, alignItems: 'center', marginBottom: 8 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: C.primaryDim, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle:{ color: C.textHi, fontSize: 14, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 2, marginBottom: 8 },
  emptyDesc: { color: C.neutral, fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular', textAlign: 'center', lineHeight: 20, marginBottom: 20 },

  // Action rows
  actionRow:  { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 8 },
  actionIcon: { width: 38, height: 38, borderRadius: 8, backgroundColor: C.primaryDim, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  actionLabel:{ color: C.textHi, fontSize: 11, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1 },
  actionDesc: { color: C.neutral, fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular' },
  badge:      { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 },
  badgeText:  { fontSize: 9, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1 },

  // Nudge
  nudgeCard:  { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: C.card, borderRadius: 10, borderWidth: 1, borderColor: C.secondary, padding: 14, marginTop: 8 },
  nudgeTitle: { color: C.textHi, fontSize: 13, fontFamily: 'SpaceGrotesk_700Bold', marginBottom: 4 },
  nudgeDesc:  { color: C.neutral, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular', lineHeight: 18 },

  // Trainer view
  trainerHero:       { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.primary, marginBottom: 24, overflow: 'hidden' },
  trainerAvatar:     { width: 48, height: 48, borderRadius: 24, backgroundColor: C.primaryDim, borderWidth: 1.5, borderColor: C.primary, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  trainerAvatarLetter:{ color: C.primary, fontSize: 20, fontFamily: 'SpaceGrotesk_700Bold' },
  tag:       { backgroundColor: C.cardDeep, borderRadius: 4, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: C.border },
  tagText:   { color: C.neutral, fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular' },
  placeholderCard: { backgroundColor: C.card, borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 28, alignItems: 'center', gap: 10 },
  placeholderText: { color: C.neutral, fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular', textAlign: 'center' },

  // Resume workout banner
  resumeWrap:   { borderRadius: 14, overflow: 'hidden', marginBottom: 20 },
  resumeCard:   { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12, borderWidth: 1, borderColor: C.primary, borderRadius: 14 },
  resumeIcon:   { width: 36, height: 36, borderRadius: 18, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  resumeLabel:  { color: C.primary, fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1.5, marginBottom: 2 },
  resumeTitle:  { color: C.textHi, fontSize: 15, fontFamily: 'SpaceGrotesk_700Bold', marginBottom: 2 },
  resumeMeta:   { color: C.textLo, fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular' },

  // Coach IA floating button
  coachFab: {
    position: 'absolute', right: 20, bottom: 24,
    width: 56, height: 56, borderRadius: 28, backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.primary, shadowOpacity: 0.5, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },

});

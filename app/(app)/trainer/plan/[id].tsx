import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { useAlert } from '@/components/AppAlert';
import { Stack, useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  getPlanById,
  deletePlan,
  getFrequencyLabel,
  canPublishPlan,
  publishPlan,
  Plan,
} from '@/lib/services/planService';
import {
  getRoutinesByPlan,
  Routine,
} from '@/lib/services/routineService';
import { getProfile } from '@/lib/services/profileService';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeTokens } from '@/constants/theme';

// ─── Theme hook ───────────────────────────────────────────────────────────────

function useStyles() {
  const { T, activeTheme } = useTheme();
  const actionDimBg = activeTheme === 'dark' ? '#00566a' : '#e0f7fa';
  const s = useMemo(() => createStyles(T, actionDimBg), [T, actionDimBg]);
  return { s, T, actionDimBg };
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function TrainerPlanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { showAlert } = useAlert();
  const { s, T, actionDimBg } = useStyles();
  const [plan, setPlan]         = useState<Plan | null>(null);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [studentName, setStudentName] = useState<string>('');
  const [isLoading, setIsLoading]     = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [canPublish, setCanPublish]   = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  useFocusEffect(
    useCallback(() => { loadData(); }, [id])
  );

  const loadData = async () => {
    if (!id) return;
    const [planResult, routinesResult] = await Promise.all([
      getPlanById(id),
      getRoutinesByPlan(id),
    ]);
    if (planResult.error) {
      setError(planResult.error.message);
    } else {
      setPlan(planResult.plan);
      if (planResult.plan) {
        const { profile } = await getProfile(planResult.plan.user_id);
        setStudentName(profile?.full_name || profile?.email?.split('@')[0] || 'Alumno');
        if (!planResult.plan.is_published) {
          const { canPublish: ok } = await canPublishPlan(planResult.plan.id);
          setCanPublish(ok);
        }
      }
    }
    setRoutines(routinesResult.routines);
    setIsLoading(false);
  };

  const handlePublish = async () => {
    if (!id) return;
    setIsPublishing(true);
    const { success, error: err } = await publishPlan(id);
    setIsPublishing(false);
    if (!success) {
      showAlert('Error', err?.message ?? 'No se pudo publicar el plan');
      return;
    }
    setPlan((prev) => (prev ? { ...prev, is_published: true } : prev));
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const backToStudent = () => {
    if (plan?.user_id) router.navigate(`/trainer/students/${plan.user_id}`);
    else router.navigate('/trainer/students');
  };

  const handleDelete = () => {
    showAlert(
      'Eliminar plan',
      `¿Seguro que querés eliminar este plan de ${studentName}? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar', style: 'destructive',
          onPress: async () => {
            if (!id) return;
            const { success, error: err } = await deletePlan(id);
            if (err || !success) {
              showAlert('Error', err?.message || 'No se pudo eliminar el plan');
            } else {
              backToStudent();
            }
          },
        },
      ]
    );
  };

  const handleAddRoutine = () => {
    router.push(`/trainer/routine/create?planId=${id}`);
  };

  const handleOpenRoutine = (routineId: string) => {
    router.push(`/trainer/routine/${routineId}`);
  };

  return (
    <>
      <Stack.Screen options={{
        title: plan?.name ?? 'PLAN',
        headerLeft: () => (
          <TouchableOpacity onPress={backToStudent} style={{ marginLeft: 4, padding: 4 }}>
            <Ionicons name="chevron-back" size={24} color={T.action} />
          </TouchableOpacity>
        ),
        headerRight: () => (
          <TouchableOpacity onPress={handleDelete} style={{ marginRight: 4, padding: 4 }}>
            <Ionicons name="trash-outline" size={20} color="#f87171" />
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
        ) : error || !plan ? (
          <View style={s.center}>
            <Ionicons name="alert-circle-outline" size={48} color="#f87171" />
            <Text style={s.errorText}>{error ?? 'Plan no encontrado'}</Text>
            <TouchableOpacity onPress={() => router.navigate('/trainer/students')} style={s.errorBtn}>
              <Text style={s.errorBtnText}>VOLVER</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={s.scroll}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={T.action} />
            }
          >
            {/* ── Hero card ──────────────────────────────── */}
            <View style={s.heroCard}>
              <View style={s.heroIcon}>
                <Ionicons name="barbell" size={28} color={T.action} />
              </View>
              <View style={s.heroInfo}>
                <Text style={s.heroName}>{plan.name}</Text>
                <Text style={s.heroDiscipline}>{plan.discipline}</Text>
                <View style={s.badgeRow}>
                  <View style={s.assignedBadge}>
                    <Ionicons name="person-outline" size={10} color={T.attention} />
                    <Text style={s.assignedText}>ASIGNADO A {studentName.toUpperCase()}</Text>
                  </View>
                  {!plan.is_published && (
                    <View style={s.draftBadge}>
                      <Ionicons name="eye-off-outline" size={10} color={T.textSecondary} />
                      <Text style={s.draftText}>BORRADOR</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* ── Stats ──────────────────────────────────── */}
            <View style={s.statsRow}>
              <View style={s.statItem}>
                <Ionicons name="calendar-outline" size={16} color={T.action} style={{ marginBottom: 4 }} />
                <Text style={s.statValue}>{getFrequencyLabel(plan.weekly_frequency)}</Text>
                <Text style={s.statLabel}>FRECUENCIA</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statItem}>
                <Ionicons name="list-outline" size={16} color={T.action} style={{ marginBottom: 4 }} />
                <Text style={s.statValue}>{routines.length}</Text>
                <Text style={s.statLabel}>RUTINAS</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statItem}>
                <Ionicons
                  name={plan.is_active ? 'checkmark-circle-outline' : 'pause-circle-outline'}
                  size={16}
                  color={plan.is_active ? T.action : T.textSecondary}
                  style={{ marginBottom: 4 }}
                />
                <Text style={[s.statValue, !plan.is_active && { color: T.textSecondary }]}>
                  {plan.is_active ? 'Activo' : 'Inactivo'}
                </Text>
                <Text style={s.statLabel}>ESTADO</Text>
              </View>
            </View>

            {/* ── Rutinas ────────────────────────────────── */}
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>RUTINAS</Text>
              {routines.length > 0 && (
                <TouchableOpacity onPress={handleAddRoutine} activeOpacity={0.8} style={s.addBtn}>
                  <Ionicons name="add" size={16} color={T.action} />
                  <Text style={s.addBtnText}>AGREGAR</Text>
                </TouchableOpacity>
              )}
            </View>

            {routines.length === 0 ? (
              <EmptyRoutines onAdd={handleAddRoutine} frequency={plan.weekly_frequency} studentName={studentName} />
            ) : (
              <View style={s.routineList}>
                {routines.map((routine) => (
                  <TouchableOpacity
                    key={routine.id}
                    onPress={() => handleOpenRoutine(routine.id)}
                    activeOpacity={0.85}
                    style={s.routineCard}
                  >
                    <View style={s.routineDayBadge}>
                      <Text style={s.routineDayNum}>{routine.day_number}</Text>
                      <Text style={s.routineDayLabel}>DÍA</Text>
                    </View>
                    <View style={s.routineInfo}>
                      <Text style={s.routineName}>{routine.name}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={T.border} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {!plan.is_published && (
              <View style={s.publishSection}>
                <TouchableOpacity
                  onPress={handlePublish}
                  disabled={!canPublish || isPublishing}
                  activeOpacity={0.85}
                >
                  {canPublish ? (
                    <LinearGradient
                      colors={[actionDimBg, '#003d4d']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={s.publishBtn}
                    >
                      {isPublishing ? (
                        <ActivityIndicator color={T.action} />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle-outline" size={18} color={T.action} />
                          <Text style={s.publishBtnText}>PUBLICAR PLAN</Text>
                        </>
                      )}
                    </LinearGradient>
                  ) : (
                    <View style={[s.publishBtn, s.publishBtnDisabled]}>
                      <Text style={[s.publishBtnText, { color: T.textSecondary }]}>PUBLICAR PLAN</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <Text style={s.publishHint}>
                  {canPublish
                    ? `${studentName} todavía no ve este plan. Publicalo cuando esté listo.`
                    : 'Agregá al menos una rutina con ejercicios antes de publicar.'}
                </Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyRoutines({ onAdd, frequency, studentName }: {
  onAdd: () => void; frequency: number; studentName: string;
}) {
  const { s, T, actionDimBg } = useStyles();
  return (
    <View style={s.emptyCard}>
      <View style={s.emptyIconWrap}>
        <Ionicons name="calendar-outline" size={36} color={T.textSecondary} />
      </View>
      <Text style={s.emptyTitle}>Sin rutinas todavía</Text>
      <Text style={s.emptyText}>
        Creá una rutina para cada día de entrenamiento.{'\n'}
        El plan de {studentName} tiene {frequency} día{frequency !== 1 ? 's' : ''} por semana.
      </Text>

      <TouchableOpacity onPress={onAdd} activeOpacity={0.85} style={s.emptyBtn}>
        <LinearGradient
          colors={[actionDimBg, '#003d4d']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={s.emptyBtnGrad}
        >
          <Ionicons name="add-circle-outline" size={18} color={T.action} />
          <Text style={s.emptyBtnText}>CREAR PRIMERA RUTINA</Text>
        </LinearGradient>
      </TouchableOpacity>

      <View style={s.tipCard}>
        <Ionicons name="sparkles-outline" size={16} color="#a78bfa" />
        <Text style={s.tipText}>
          Dentro de cada rutina podés generar un borrador con IA a partir del perfil del alumno.
        </Text>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function createStyles(T: ThemeTokens, actionDimBg: string) {
  return StyleSheet.create({
    safe:    { flex: 1, backgroundColor: T.surface },
    topLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, opacity: 0.4, zIndex: 10 },
    scroll:  { padding: 20, paddingBottom: 48 },
    center:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },

    errorText:    { color: T.textSecondary, textAlign: 'center', marginTop: 12, fontFamily: 'SpaceGrotesk_400Regular' },
    errorBtn:     { marginTop: 20, backgroundColor: T.surfaceElevated, borderRadius: 10, borderWidth: 1, borderColor: T.border, paddingHorizontal: 24, paddingVertical: 10 },
    errorBtnText: { color: T.action, fontSize: 12, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1 },

    // Hero
    heroCard:       { flexDirection: 'row', alignItems: 'center', backgroundColor: T.surfaceElevated, borderRadius: 16, borderWidth: 1, borderColor: T.border, padding: 18, marginBottom: 12 },
    heroIcon:       { width: 52, height: 52, borderRadius: 12, backgroundColor: actionDimBg, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    heroInfo:       { flex: 1 },
    heroName:       { color: T.textPrimary, fontSize: 20, fontFamily: 'SpaceGrotesk_700Bold', marginBottom: 3 },
    heroDiscipline: { color: T.action, fontSize: 13, fontFamily: 'SpaceGrotesk_600SemiBold', marginBottom: 7 },
    badgeRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    assignedBadge:  { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: '#130d00', borderWidth: 1, borderColor: '#4a3200' },
    assignedText:   { color: T.attention, fontSize: 8, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1.2 },
    draftBadge:     { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: T.border, borderWidth: 1, borderColor: T.border },
    draftText:      { color: T.textSecondary, fontSize: 8, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1.2 },

    // Stats
    statsRow:    { flexDirection: 'row', backgroundColor: T.surfaceElevated, borderRadius: 12, borderWidth: 1, borderColor: T.border, marginBottom: 24, overflow: 'hidden' },
    statItem:    { flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 8 },
    statDivider: { width: 1, backgroundColor: T.border },
    statValue:   { color: T.textPrimary, fontSize: 13, fontFamily: 'SpaceGrotesk_700Bold', textAlign: 'center', marginBottom: 2 },
    statLabel:   { color: T.textSecondary, fontSize: 9, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1.5 },

    // Section header
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    sectionTitle:  { color: T.textSecondary, fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 3 },
    addBtn:        { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: actionDimBg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
    addBtnText:    { color: T.action, fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1 },

    // Routine list
    routineList:     { gap: 10 },
    routineCard:     { flexDirection: 'row', alignItems: 'center', backgroundColor: T.surfaceElevated, borderRadius: 12, borderWidth: 1, borderColor: T.border, padding: 14 },
    routineDayBadge: { width: 44, height: 44, borderRadius: 10, backgroundColor: actionDimBg, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
    routineDayNum:   { color: T.action, fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold', lineHeight: 20 },
    routineDayLabel: { color: T.action, fontSize: 8, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1, opacity: 0.7 },
    routineInfo:     { flex: 1 },
    routineName:     { color: T.textPrimary, fontSize: 14, fontFamily: 'SpaceGrotesk_600SemiBold' },

    // Empty
    emptyCard:     { backgroundColor: T.surfaceElevated, borderRadius: 16, borderWidth: 1, borderColor: T.border, padding: 28, alignItems: 'center' },
    emptyIconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: T.border, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    emptyTitle:    { color: T.textPrimary, fontSize: 17, fontFamily: 'SpaceGrotesk_700Bold', marginBottom: 8 },
    emptyText:     { color: T.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
    emptyBtn:      { width: '100%', borderRadius: 12, overflow: 'hidden', marginBottom: 20 },
    emptyBtnGrad:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
    emptyBtnText:  { color: T.action, fontSize: 13, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1 },
    tipCard:       { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: T.border, borderRadius: 10, borderWidth: 1, borderColor: T.border, padding: 12 },
    tipText:       { color: T.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular', flex: 1, lineHeight: 18 },

    // Publish
    publishSection:    { marginTop: 24 },
    publishBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: 12 },
    publishBtnDisabled: { backgroundColor: T.border, borderWidth: 1, borderColor: T.border },
    publishBtnText:     { color: T.action, fontSize: 13, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1.5 },
    publishHint:        { color: T.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular', textAlign: 'center', marginTop: 10, lineHeight: 17 },
  });
}

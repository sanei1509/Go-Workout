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
import { useAlert } from '@/components/AppAlert';
import { Stack, useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  getPlanById,
  deletePlan,
  getFrequencyLabel,
  Plan,
} from '@/lib/services/planService';
import {
  getRoutinesByPlan,
  Routine,
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
};

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function PlanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { showAlert } = useAlert();
  const [plan, setPlan]         = useState<Plan | null>(null);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => { loadData(); }, [id])
  );

  const loadData = async () => {
    if (!id) return;
    setIsLoading(true);
    const [planResult, routinesResult] = await Promise.all([
      getPlanById(id),
      getRoutinesByPlan(id),
    ]);
    if (planResult.error) {
      setError(planResult.error.message);
    } else {
      setPlan(planResult.plan);
    }
    setRoutines(routinesResult.routines);
    setIsLoading(false);
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const handleDelete = () => {
    showAlert(
      'Eliminar plan',
      '¿Seguro que querés eliminar este plan? Esta acción no se puede deshacer.',
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
              router.navigate('/student');
            }
          },
        },
      ]
    );
  };

  const handleAddRoutine = () => {
    router.push(`/student/routine/create?planId=${id}`);
  };

  const handleOpenRoutine = (routineId: string) => {
    router.push(`/student/routine/${routineId}`);
  };

  return (
    <>
      <Stack.Screen options={{
        title: plan?.name ?? 'PLAN',
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.navigate('/student')} style={{ marginLeft: 4, padding: 4 }}>
            <Ionicons name="chevron-back" size={24} color={C.primary} />
          </TouchableOpacity>
        ),
        // Los planes asignados por un entrenador no se pueden eliminar desde acá
        headerRight: () => (
          plan && !plan.trainer_id ? (
            <TouchableOpacity onPress={handleDelete} style={{ marginRight: 4, padding: 4 }}>
              <Ionicons name="trash-outline" size={20} color="#f87171" />
            </TouchableOpacity>
          ) : null
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
        ) : error || !plan ? (
          <View style={s.center}>
            <Ionicons name="alert-circle-outline" size={48} color="#f87171" />
            <Text style={s.errorText}>{error ?? 'Plan no encontrado'}</Text>
            <TouchableOpacity onPress={() => router.navigate('/student')} style={s.errorBtn}>
              <Text style={s.errorBtnText}>VOLVER</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={s.scroll}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={C.primary} />
            }
          >
            {/* ── Hero card ──────────────────────────────── */}
            <View style={s.heroCard}>
              <View style={s.heroIcon}>
                <Ionicons name="barbell" size={28} color={C.primary} />
              </View>
              <View style={s.heroInfo}>
                <Text style={s.heroName}>{plan.name}</Text>
                <Text style={s.heroDiscipline}>{plan.discipline}</Text>
                {plan.trainer_id != null && (
                  <View style={s.assignedBadge}>
                    <Ionicons name="person-outline" size={10} color={C.tertiary} />
                    <Text style={s.assignedText}>PLAN DE TU ENTRENADOR</Text>
                  </View>
                )}
              </View>
            </View>

            {/* ── Stats ──────────────────────────────────── */}
            <View style={s.statsRow}>
              <View style={s.statItem}>
                <Ionicons name="calendar-outline" size={16} color={C.primary} style={{ marginBottom: 4 }} />
                <Text style={s.statValue}>{getFrequencyLabel(plan.weekly_frequency)}</Text>
                <Text style={s.statLabel}>FRECUENCIA</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statItem}>
                <Ionicons name="list-outline" size={16} color={C.primary} style={{ marginBottom: 4 }} />
                <Text style={s.statValue}>{routines.length}</Text>
                <Text style={s.statLabel}>RUTINAS</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statItem}>
                <Ionicons
                  name={plan.is_active ? 'checkmark-circle-outline' : 'pause-circle-outline'}
                  size={16}
                  color={plan.is_active ? C.primary : C.neutral}
                  style={{ marginBottom: 4 }}
                />
                <Text style={[s.statValue, !plan.is_active && { color: C.neutral }]}>
                  {plan.is_active ? 'Activo' : 'Inactivo'}
                </Text>
                <Text style={s.statLabel}>ESTADO</Text>
              </View>
            </View>

            {/* ── Rutinas ────────────────────────────────── */}
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>RUTINAS</Text>
              {routines.length > 0 && !plan.trainer_id && (
                <TouchableOpacity onPress={handleAddRoutine} activeOpacity={0.8} style={s.addBtn}>
                  <Ionicons name="add" size={16} color={C.primary} />
                  <Text style={s.addBtnText}>AGREGAR</Text>
                </TouchableOpacity>
              )}
            </View>

            {routines.length === 0 ? (
              plan.trainer_id ? (
                <View style={s.emptyCard}>
                  <View style={s.emptyIconWrap}>
                    <Ionicons name="hourglass-outline" size={36} color={C.neutral} />
                  </View>
                  <Text style={s.emptyTitle}>Rutinas en camino</Text>
                  <Text style={s.emptyText}>
                    Tu entrenador todavía no cargó rutinas en este plan.{'\n'}Te van a aparecer acá cuando las asigne.
                  </Text>
                </View>
              ) : (
                <EmptyRoutines onAdd={handleAddRoutine} frequency={plan.weekly_frequency} />
              )
            ) : (
              <View style={s.routineList}>
                {routines.map((routine, idx) => (
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
                    <Ionicons name="chevron-forward" size={18} color={C.border} />
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

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyRoutines({ onAdd, frequency }: { onAdd: () => void; frequency: number }) {
  return (
    <View style={s.emptyCard}>
      <View style={s.emptyIconWrap}>
        <Ionicons name="calendar-outline" size={36} color={C.neutral} />
      </View>
      <Text style={s.emptyTitle}>Sin rutinas todavía</Text>
      <Text style={s.emptyText}>
        Creá una rutina para cada día de entrenamiento.{'\n'}
        Tu plan tiene {frequency} día{frequency !== 1 ? 's' : ''} por semana.
      </Text>

      <TouchableOpacity onPress={onAdd} activeOpacity={0.85} style={s.emptyBtn}>
        <LinearGradient
          colors={[C.primaryDim, '#003d4d']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={s.emptyBtnGrad}
        >
          <Ionicons name="add-circle-outline" size={18} color={C.primary} />
          <Text style={s.emptyBtnText}>CREAR PRIMERA RUTINA</Text>
        </LinearGradient>
      </TouchableOpacity>

      <View style={s.tipCard}>
        <Ionicons name="bulb-outline" size={16} color={C.tertiary} />
        <Text style={s.tipText}>
          Ejemplo: "Día 1 — Pecho y Tríceps", "Día 2 — Espalda y Bíceps"
        </Text>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: C.bg },
  topLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, opacity: 0.4, zIndex: 10 },
  scroll:  { padding: 20, paddingBottom: 48 },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },

  errorText:    { color: C.textLo, textAlign: 'center', marginTop: 12, fontFamily: 'SpaceGrotesk_400Regular' },
  errorBtn:     { marginTop: 20, backgroundColor: C.card, borderRadius: 10, borderWidth: 1, borderColor: C.border, paddingHorizontal: 24, paddingVertical: 10 },
  errorBtnText: { color: C.primary, fontSize: 12, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1 },

  // Hero
  heroCard:       { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 18, marginBottom: 12 },
  heroIcon:       { width: 52, height: 52, borderRadius: 12, backgroundColor: C.primaryDim, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  heroInfo:       { flex: 1 },
  heroName:       { color: C.textHi, fontSize: 20, fontFamily: 'SpaceGrotesk_700Bold', marginBottom: 3 },
  heroDiscipline: { color: C.primary, fontSize: 13, fontFamily: 'SpaceGrotesk_600SemiBold' },
  assignedBadge:  { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', marginTop: 7, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: '#130d00', borderWidth: 1, borderColor: '#4a3200' },
  assignedText:   { color: C.tertiary, fontSize: 8, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1.2 },

  // Stats
  statsRow:    { flexDirection: 'row', backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, marginBottom: 24, overflow: 'hidden' },
  statItem:    { flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 8 },
  statDivider: { width: 1, backgroundColor: C.border },
  statValue:   { color: C.textHi, fontSize: 13, fontFamily: 'SpaceGrotesk_700Bold', textAlign: 'center', marginBottom: 2 },
  statLabel:   { color: C.textLo, fontSize: 9, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1.5 },

  // Section header
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle:  { color: C.neutral, fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 3 },
  addBtn:        { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.primaryDim, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  addBtnText:    { color: C.primary, fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1 },

  // Routine list
  routineList:     { gap: 10 },
  routineCard:     { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 14 },
  routineDayBadge: { width: 44, height: 44, borderRadius: 10, backgroundColor: C.primaryDim, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  routineDayNum:   { color: C.primary, fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold', lineHeight: 20 },
  routineDayLabel: { color: C.primary, fontSize: 8, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1, opacity: 0.7 },
  routineInfo:     { flex: 1 },
  routineName:     { color: C.textHi, fontSize: 14, fontFamily: 'SpaceGrotesk_600SemiBold' },

  // Empty
  emptyCard:     { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 28, alignItems: 'center' },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.cardDeep, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle:    { color: C.textHi, fontSize: 17, fontFamily: 'SpaceGrotesk_700Bold', marginBottom: 8 },
  emptyText:     { color: C.textLo, fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  emptyBtn:      { width: '100%', borderRadius: 12, overflow: 'hidden', marginBottom: 20 },
  emptyBtnGrad:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  emptyBtnText:  { color: C.primary, fontSize: 13, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1 },
  tipCard:       { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: C.cardDeep, borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 12 },
  tipText:       { color: C.textLo, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular', flex: 1, lineHeight: 18 },
});

import { useEffect, useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Modal, StyleSheet, Vibration,
} from 'react-native';
import { useAlert } from '@/components/AppAlert';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import {
  getRoutineById,
  Routine,
  getBlockLabel,
  getBlockColor,
  getBlockIcon,
  formatExerciseValue,
} from '@/lib/services/routineService';
import {
  startWorkoutSession,
  finishWorkoutSession,
  logExercise,
  deleteSession,
  WorkoutSession,
} from '@/lib/services/workoutService';
import { setupWorkoutReminder, hasActiveReminder } from '@/lib/services/notificationService';
import {
  getActiveSnapshot,
  saveActiveSnapshot,
  clearActiveSnapshot,
  ExerciseProgressSnapshot,
} from '@/lib/services/activeSessionService';
import { ExerciseHelpModal } from '@/components/ExerciseHelpModal';
import { lookupExercise } from '@/lib/exercises/lookup';

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
  greenDim:   '#14532d',
  red:        '#f87171',
};

interface ExerciseProgress {
  exerciseId: string;
  setsCompleted: number;
  isComplete: boolean;
}

type FlatExercise = {
  id: string;
  name: string;
  sets: number;
  value: number;
  exercise_type: string;
  rest_seconds: number;
  target_weight_kg?: number | null;
  notes?: string | null;
  blockType: string;
};

export default function WorkoutScreen() {
  const { routineId } = useLocalSearchParams<{ routineId: string }>();
  const { user } = useAuth();
  const { showAlert } = useAlert();

  const [routine, setRoutine] = useState<Routine | null>(null);
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [progress, setProgress] = useState<Map<string, ExerciseProgress>>(new Map());
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  // Peso de hoy para el ejercicio actual — precargado con el objetivo, editable
  // por si el alumno levantó distinto. Se resetea al pasar de ejercicio.
  const [currentWeight, setCurrentWeight] = useState(0);

  // Exercise help modal
  const [helpExercise, setHelpExercise] = useState<string | null>(null);

  // Rest timer
  const [isResting, setIsResting] = useState(false);
  const [restTimeLeft, setRestTimeLeft] = useState(0);
  const [showRestModal, setShowRestModal] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Elapsed time (derived from startedAt so it survives app close/reopen)
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const allExercises: FlatExercise[] = routine?.blocks?.flatMap(block =>
    block.exercises.map(ex => ({ ...ex, blockType: block.block_type }))
  ) || [];

  const currentExercise = allExercises[currentExerciseIndex];
  const totalExercises = allExercises.length;

  useEffect(() => {
    setCurrentWeight(currentExercise?.target_weight_kg ?? 0);
  }, [currentExercise?.id]);

  useEffect(() => {
    loadRoutineAndStart();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    };
  }, [routineId]);

  useEffect(() => {
    if (startedAtMs && session && !session.finished_at) {
      const tick = () => setElapsedTime(Math.floor((Date.now() - startedAtMs) / 1000));
      tick();
      elapsedTimerRef.current = setInterval(tick, 1000);
    }
    return () => {
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    };
  }, [startedAtMs, session]);

  useEffect(() => {
    if (!user?.id || !session || !routineId || isLoading) return;
    saveActiveSnapshot({
      userId: user.id,
      routineId,
      sessionId: session.id,
      startedAt: session.started_at,
      currentExerciseIndex,
      progress: Array.from(progress.values()),
    });
  }, [progress, currentExerciseIndex, session, user?.id, routineId, isLoading]);

  const loadRoutineAndStart = async () => {
    if (!routineId || !user?.id) return;
    setIsLoading(true);

    const { routine: data, error: routineError } = await getRoutineById(routineId);
    if (routineError || !data) {
      setError(routineError?.message || 'Rutina no encontrada');
      setIsLoading(false);
      return;
    }
    setRoutine(data);

    const initialProgress = new Map<string, ExerciseProgress>();
    data.blocks?.forEach(block => {
      block.exercises.forEach(ex => {
        initialProgress.set(ex.id, { exerciseId: ex.id, setsCompleted: 0, isComplete: false });
      });
    });

    const snapshot = await getActiveSnapshot(user.id);
    const validExerciseIds = new Set(initialProgress.keys());

    if (snapshot && snapshot.routineId === routineId) {
      snapshot.progress.forEach(p => {
        if (validExerciseIds.has(p.exerciseId)) {
          initialProgress.set(p.exerciseId, {
            exerciseId: p.exerciseId,
            setsCompleted: p.setsCompleted,
            isComplete: p.isComplete,
          });
        }
      });
      setProgress(initialProgress);

      const totalEx = Array.from(validExerciseIds).length;
      const safeIndex = Math.min(snapshot.currentExerciseIndex, Math.max(0, totalEx - 1));
      setCurrentExerciseIndex(safeIndex);

      setSession({
        id: snapshot.sessionId,
        user_id: snapshot.userId,
        routine_id: snapshot.routineId,
        started_at: snapshot.startedAt,
        finished_at: null,
        created_at: snapshot.startedAt,
      });
      setStartedAtMs(new Date(snapshot.startedAt).getTime());
      setIsLoading(false);
      return;
    }

    if (snapshot && snapshot.routineId !== routineId) {
      await clearActiveSnapshot();
    }

    setProgress(initialProgress);

    const { session: newSession, error: sessionError } = await startWorkoutSession({
      user_id: user.id,
      routine_id: routineId,
    });
    if (sessionError || !newSession) {
      setError(sessionError?.message || 'No se pudo iniciar la sesión');
      setIsLoading(false);
      return;
    }
    setSession(newSession);
    setStartedAtMs(new Date(newSession.started_at).getTime());

    await saveActiveSnapshot({
      userId: user.id,
      routineId,
      sessionId: newSession.id,
      startedAt: newSession.started_at,
      currentExerciseIndex: 0,
      progress: Array.from(initialProgress.values()),
    });

    setIsLoading(false);
  };

  const handleCompleteSet = () => {
    if (!currentExercise) return;
    const cur = progress.get(currentExercise.id);
    if (!cur) return;

    const newSets = cur.setsCompleted + 1;
    const isComplete = newSets >= currentExercise.sets;

    setProgress(prev => {
      const m = new Map(prev);
      m.set(currentExercise.id, { ...cur, setsCompleted: newSets, isComplete });
      return m;
    });

    if (!isComplete && currentExercise.rest_seconds > 0) {
      startRestTimer(currentExercise.rest_seconds);
    } else if (isComplete) {
      if (session) {
        logExercise({
          session_id: session.id,
          exercise_id: currentExercise.id,
          sets_completed: currentExercise.sets,
          actual_value: currentExercise.value,
          actual_weight_kg:
            currentExercise.exercise_type === 'reps' && currentWeight > 0 ? currentWeight : null,
        });
      }
      if (currentExerciseIndex < totalExercises - 1) {
        setTimeout(() => setCurrentExerciseIndex(prev => prev + 1), 600);
      }
    }
  };

  const startRestTimer = (seconds: number) => {
    setRestTimeLeft(seconds);
    setIsResting(true);
    setShowRestModal(true);
    timerRef.current = setInterval(() => {
      setRestTimeLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setIsResting(false);
          setShowRestModal(false);
          Vibration.vibrate([0, 500, 200, 500]);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const skipRest = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsResting(false);
    setShowRestModal(false);
    setRestTimeLeft(0);
  };

  const handleFinishWorkout = () => {
    const completedCount = Array.from(progress.values()).filter(p => p.isComplete).length;
    const allDone = completedCount === totalExercises;
    showAlert(
      'Finalizar entrenamiento',
      allDone
        ? `¡Excelente! Completaste todos los ejercicios.\n\n¿Querés terminar?`
        : `Completaste ${completedCount} de ${totalExercises} ejercicios.\n\n¿Querés terminar?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Finalizar',
          onPress: async () => {
            if (session) {
              await finishWorkoutSession(session.id);
              if (user?.id) {
                const active = await hasActiveReminder();
                if (active) setupWorkoutReminder(user.id);
              }
            }
            await clearActiveSnapshot();
            router.back();
          },
        },
      ]
    );
  };

  const handleCancelWorkout = () => {
    showAlert(
      'Cancelar entrenamiento',
      '¿Estás seguro? Se perderá el progreso.',
      [
        { text: 'Continuar', style: 'cancel' },
        {
          text: 'Cancelar',
          style: 'destructive',
          onPress: async () => {
            if (session) await deleteSession(session.id);
            await clearActiveSnapshot();
            router.back();
          },
        },
      ]
    );
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const completedCount = Array.from(progress.values()).filter(p => p.isComplete).length;

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[s.safe, s.center]}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={[s.textLo, { marginTop: 16 }]}>Preparando entrenamiento...</Text>
        </View>
      </>
    );
  }

  // ── Error / no exercises ───────────────────────────────────────────────────
  if (error || !routine || !currentExercise) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[s.safe, s.center, { paddingHorizontal: 24 }]}>
          <Ionicons name="alert-circle-outline" size={56} color={C.red} />
          <Text style={[s.textHi, { textAlign: 'center', marginTop: 16 }]}>
            {error || 'No hay ejercicios en esta rutina'}
          </Text>
          <TouchableOpacity onPress={() => router.back()} style={s.errorBtn}>
            <Text style={s.errorBtnText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  const cur = progress.get(currentExercise.id);
  const blockColor = getBlockColor(currentExercise.blockType as any);
  const setsCompleted = cur?.setsCompleted ?? 0;
  const isComplete = cur?.isComplete ?? false;
  const progressPct = totalExercises > 0 ? completedCount / totalExercises : 0;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Rest Modal */}
      <Modal visible={showRestModal} animationType="fade" transparent>
        <View style={s.restOverlay}>
          <View style={s.restCard}>
            <LinearGradient
              colors={['transparent', C.primary, 'transparent']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={s.restTopLine}
            />
            <Text style={s.restLabel}>DESCANSANDO</Text>
            <Text style={s.restTimer}>{formatTime(restTimeLeft)}</Text>
            <Text style={s.restNext}>
              Siguiente: serie {setsCompleted + 1} de {currentExercise.sets}
            </Text>
            <TouchableOpacity onPress={skipRest} style={s.skipBtn}>
              <Text style={s.skipBtnText}>SALTAR DESCANSO</Text>
              <Ionicons name="arrow-forward" size={16} color={C.bg} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={s.safe}>
        {/* ── Top bar ──────────────────────────────────────────────────────── */}
        <View style={s.topBar}>
          <TouchableOpacity onPress={handleCancelWorkout} style={s.topBarBtn}>
            <Ionicons name="close" size={24} color={C.neutral} />
          </TouchableOpacity>

          <View style={s.topBarCenter}>
            <Text style={s.topBarTitle} numberOfLines={1}>{routine.name}</Text>
            <Text style={s.topBarTime}>{formatTime(elapsedTime)}</Text>
          </View>

          <TouchableOpacity onPress={handleFinishWorkout} style={s.topBarBtn}>
            <Ionicons name="checkmark-done" size={24} color={C.green} />
          </TouchableOpacity>
        </View>

        {/* ── Progress bar ─────────────────────────────────────────────────── */}
        <View style={s.progressWrap}>
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${progressPct * 100}%` }]} />
          </View>
          <Text style={s.progressLabel}>
            {completedCount}/{totalExercises} ejercicios
          </Text>
        </View>

        {/* ── Exercise dots (all exercises) ────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.dotsRow}
          style={s.dotsScroll}
        >
          {allExercises.map((ex, idx) => {
            const exProgress = progress.get(ex.id);
            const done = exProgress?.isComplete;
            const active = idx === currentExerciseIndex;
            const color = getBlockColor(ex.blockType as any);
            return (
              <TouchableOpacity
                key={ex.id}
                onPress={() => setCurrentExerciseIndex(idx)}
                style={[
                  s.dot,
                  { borderColor: color },
                  active && { backgroundColor: color },
                  done && { backgroundColor: C.green, borderColor: C.green },
                ]}
              >
                {done
                  ? <Ionicons name="checkmark" size={10} color={C.bg} />
                  : <Text style={[s.dotNum, active && { color: C.bg }]}>{idx + 1}</Text>
                }
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Main content ─────────────────────────────────────────────────── */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Block badge */}
          <View style={s.blockBadgeRow}>
            <View style={[s.blockBadge, { backgroundColor: `${blockColor}22`, borderColor: `${blockColor}44` }]}>
              <Ionicons name={getBlockIcon(currentExercise.blockType as any) as any} size={14} color={blockColor} />
              <Text style={[s.blockBadgeText, { color: blockColor }]}>
                {getBlockLabel(currentExercise.blockType as any)}
              </Text>
            </View>
          </View>

          {/* Exercise name */}
          <Text style={s.exName}>{currentExercise.name}</Text>
          <Text style={s.exDetail}>
            {currentExercise.sets} series × {formatExerciseValue(currentExercise.exercise_type as any, currentExercise.value)}
          </Text>
          {lookupExercise(currentExercise.name) && (
            <TouchableOpacity
              onPress={() => setHelpExercise(currentExercise.name)}
              style={s.techBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="information-circle-outline" size={14} color={C.neutral} />
              <Text style={s.techBtnText}>Ver técnica</Text>
            </TouchableOpacity>
          )}

          {/* Sets bubbles */}
          <View style={[s.setsCard, { borderLeftColor: blockColor }]}>
            <Text style={s.setsLabel}>SERIES</Text>
            <View style={s.setsRow}>
              {Array.from({ length: currentExercise.sets }).map((_, idx) => {
                const done = setsCompleted > idx;
                const active = setsCompleted === idx;
                return (
                  <View
                    key={idx}
                    style={[
                      s.setBubble,
                      done && s.setBubbleDone,
                      active && !isComplete && { borderColor: blockColor },
                    ]}
                  >
                    {done
                      ? <Ionicons name="checkmark" size={20} color={C.bg} />
                      : <Text style={[s.setBubbleNum, active && { color: blockColor }]}>{idx + 1}</Text>
                    }
                  </View>
                );
              })}
            </View>
          </View>

          {/* Peso de hoy (solo si el ejercicio trackea peso) */}
          {currentExercise.exercise_type === 'reps' && currentExercise.target_weight_kg != null && (
            <View style={[s.setsCard, { borderLeftColor: blockColor }]}>
              <Text style={s.setsLabel}>PESO DE HOY (KG)</Text>
              <View style={s.weightRow}>
                <TouchableOpacity
                  onPress={() => setCurrentWeight(w => Math.max(0, w - 2.5))}
                  style={s.weightBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="remove" size={20} color={blockColor} />
                </TouchableOpacity>
                <Text style={s.weightValue}>{currentWeight}</Text>
                <TouchableOpacity
                  onPress={() => setCurrentWeight(w => Math.min(500, w + 2.5))}
                  style={s.weightBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add" size={20} color={blockColor} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Notes */}
          {currentExercise.notes ? (
            <View style={s.notesCard}>
              <Ionicons name="information-circle-outline" size={18} color={C.neutral} />
              <Text style={s.notesText}>{currentExercise.notes}</Text>
            </View>
          ) : null}

          {/* Rest info */}
          {currentExercise.rest_seconds > 0 && !isResting && (
            <View style={s.restInfo}>
              <Ionicons name="timer-outline" size={16} color={C.textLo} />
              <Text style={s.restInfoText}>
                Descanso: {currentExercise.rest_seconds}s entre series
              </Text>
            </View>
          )}
        </ScrollView>

        {/* ── Bottom actions ───────────────────────────────────────────────── */}
        <View style={s.bottom}>
          {/* Prev / Next */}
          <View style={s.navRow}>
            <TouchableOpacity
              onPress={() => setCurrentExerciseIndex(p => p - 1)}
              disabled={currentExerciseIndex === 0}
              style={[s.navBtn, currentExerciseIndex === 0 && s.navBtnDisabled]}
            >
              <Ionicons name="chevron-back" size={18} color={currentExerciseIndex === 0 ? C.border : C.textLo} />
              <Text style={[s.navBtnText, currentExerciseIndex === 0 && { color: C.border }]}>Anterior</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setCurrentExerciseIndex(p => p + 1)}
              disabled={currentExerciseIndex === totalExercises - 1}
              style={[s.navBtn, currentExerciseIndex === totalExercises - 1 && s.navBtnDisabled]}
            >
              <Text style={[s.navBtnText, currentExerciseIndex === totalExercises - 1 && { color: C.border }]}>Siguiente</Text>
              <Ionicons name="chevron-forward" size={18} color={currentExerciseIndex === totalExercises - 1 ? C.border : C.textLo} />
            </TouchableOpacity>
          </View>

          {/* CTA */}
          {!isComplete ? (
            <TouchableOpacity onPress={handleCompleteSet} activeOpacity={0.85} style={s.ctaBtn}>
              <LinearGradient
                colors={[C.primaryDim, '#003d4d']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={s.ctaGrad}
              >
                <Text style={s.ctaText}>COMPLETAR SERIE {setsCompleted + 1}</Text>
                <Ionicons name="checkmark-circle-outline" size={20} color={C.primary} />
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <View style={s.doneCard}>
              <Ionicons name="checkmark-circle" size={26} color={C.green} />
              <Text style={s.doneText}>EJERCICIO COMPLETADO</Text>
            </View>
          )}
        </View>
      </View>

      <ExerciseHelpModal
        exerciseName={helpExercise}
        onClose={() => setHelpExercise(null)}
      />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: C.bg },
  center:  { alignItems: 'center', justifyContent: 'center' },
  scroll:  { padding: 20, paddingBottom: 8 },

  // ── Loading / error ──
  textHi:     { color: C.textHi, fontSize: 16, fontFamily: 'SpaceGrotesk_600SemiBold' },
  textLo:     { color: C.textLo, fontSize: 14, fontFamily: 'SpaceGrotesk_400Regular' },
  errorBtn:   { marginTop: 20, backgroundColor: C.card, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, borderWidth: 1, borderColor: C.border },
  errorBtnText: { color: C.primary, fontFamily: 'SpaceGrotesk_700Bold', fontSize: 14 },

  // ── Rest modal ──
  restOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  restCard:    { width: '100%', backgroundColor: C.card, borderRadius: 24, padding: 32, alignItems: 'center', overflow: 'hidden', borderWidth: 1, borderColor: C.border },
  restTopLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, opacity: 0.5 },
  restLabel:   { color: C.neutral, fontSize: 11, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 2, marginBottom: 16 },
  restTimer:   { color: C.primary, fontSize: 80, fontFamily: 'SpaceGrotesk_700Bold', lineHeight: 88 },
  restNext:    { color: C.textLo, fontSize: 14, fontFamily: 'SpaceGrotesk_400Regular', marginTop: 8, marginBottom: 28 },
  skipBtn:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.primary, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 },
  skipBtnText: { color: C.bg, fontFamily: 'SpaceGrotesk_700Bold', fontSize: 13, letterSpacing: 1.5 },

  // ── Top bar ──
  topBar:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12 },
  topBarBtn:    { padding: 8 },
  topBarCenter: { flex: 1, alignItems: 'center' },
  topBarTitle:  { color: C.textHi, fontSize: 15, fontFamily: 'SpaceGrotesk_700Bold' },
  topBarTime:   { color: C.primary, fontSize: 13, fontFamily: 'SpaceGrotesk_700Bold', marginTop: 2 },

  // ── Progress ──
  progressWrap:  { paddingHorizontal: 20, marginBottom: 8 },
  progressTrack: { height: 4, backgroundColor: C.cardDeep, borderRadius: 4, overflow: 'hidden' },
  progressFill:  { height: '100%', backgroundColor: C.green, borderRadius: 4 },
  progressLabel: { color: C.textLo, fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular', textAlign: 'center', marginTop: 6 },

  // ── Exercise dots ──
  dotsScroll: { maxHeight: 40, flexGrow: 0 },
  dotsRow:    { paddingHorizontal: 20, gap: 6, alignItems: 'center' },
  dot:        { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center', backgroundColor: C.cardDeep },
  dotNum:     { color: C.neutral, fontSize: 11, fontFamily: 'SpaceGrotesk_700Bold' },

  // ── Main content ──
  blockBadgeRow: { alignItems: 'center', marginBottom: 20 },
  blockBadge:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  blockBadgeText:{ fontSize: 12, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 0.5 },

  exName:   { color: C.textHi, fontSize: 30, fontFamily: 'SpaceGrotesk_700Bold', textAlign: 'center', lineHeight: 36, marginBottom: 8 },
  exDetail: { color: C.textLo, fontSize: 16, fontFamily: 'SpaceGrotesk_600SemiBold', textAlign: 'center', marginBottom: 12 },
  techBtn:  { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'center', marginBottom: 20, opacity: 0.6 },
  techBtnText: { color: C.neutral, fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular' },

  setsCard:  { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, borderLeftWidth: 3, padding: 20, marginBottom: 16 },
  setsLabel: { color: C.neutral, fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 2, marginBottom: 16, textAlign: 'center' },
  setsRow:   { flexDirection: 'row', justifyContent: 'center', gap: 10, flexWrap: 'wrap' },
  setBubble: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: C.border, alignItems: 'center', justifyContent: 'center', backgroundColor: C.cardDeep },
  setBubbleDone: { backgroundColor: C.green, borderColor: C.green },
  setBubbleNum:  { color: C.neutral, fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold' },

  weightRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 },
  weightBtn:   { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center', backgroundColor: C.cardDeep },
  weightValue: { color: C.textHi, fontSize: 22, fontFamily: 'SpaceGrotesk_700Bold', minWidth: 56, textAlign: 'center' },

  notesCard: { flexDirection: 'row', gap: 10, backgroundColor: C.cardDeep, borderRadius: 12, padding: 14, marginBottom: 12 },
  notesText: { flex: 1, color: C.textLo, fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular', lineHeight: 20 },

  restInfo:     { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', marginTop: 4 },
  restInfoText: { color: C.textLo, fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular' },

  // ── Bottom ──
  bottom:   { padding: 20, paddingBottom: 36, gap: 12 },
  navRow:   { flexDirection: 'row', justifyContent: 'space-between' },
  navBtn:   { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 8 },
  navBtnDisabled: { opacity: 0.4 },
  navBtnText: { color: C.textLo, fontSize: 13, fontFamily: 'SpaceGrotesk_600SemiBold' },

  ctaBtn:  { borderRadius: 16, overflow: 'hidden' },
  ctaGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18 },
  ctaText: { color: C.primary, fontSize: 14, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1.5 },

  doneCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: `${C.green}15`, borderRadius: 16, paddingVertical: 18, borderWidth: 1.5, borderColor: C.green },
  doneText: { color: C.green, fontFamily: 'SpaceGrotesk_700Bold', fontSize: 14, letterSpacing: 1.5 },
});

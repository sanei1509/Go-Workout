import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
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
  deleteSession,
  WorkoutSession,
} from '@/lib/services/workoutService';
import { aggregateSessionExerciseLogs } from '@/lib/services/setLogService';
import {
  enqueueSetLog,
  flushSyncQueue,
  processSyncQueue,
  getPendingSyncCount,
  type SyncStatus,
} from '@/lib/services/workoutSyncQueue';
import { setupWorkoutReminder, hasActiveReminder } from '@/lib/services/notificationService';
import {
  getActiveSnapshot,
  saveActiveSnapshot,
  clearActiveSnapshot,
  type SetLogSnapshot,
} from '@/lib/services/activeSessionService';
import { ExerciseHelpModal } from '@/components/ExerciseHelpModal';
import { SetCompleteModal, type SetCompletePayload } from '@/components/workout/SetCompleteModal';
import { SubstituteExerciseModal } from '@/components/workout/SubstituteExerciseModal';
import { lookupExercise } from '@/lib/exercises/lookup';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeTokens } from '@/constants/theme';

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
  const { T, activeTheme } = useTheme();
  const actionDimBg = activeTheme === 'dark' ? '#00566a' : '#e0f7fa';
  const s = useMemo(() => createStyles(T, actionDimBg), [T, actionDimBg]);

  const [routine, setRoutine] = useState<Routine | null>(null);
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [progress, setProgress] = useState<Map<string, ExerciseProgress>>(new Map());
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  // Peso de hoy para el ejercicio actual — precargado con el objetivo, editable
  // por si el alumno levantó distinto. Se resetea al pasar de ejercicio.
  const [currentWeight, setCurrentWeight] = useState(0);
  const [exerciseWeights, setExerciseWeights] = useState<Map<string, number>>(new Map());
  const [setLogs, setSetLogs] = useState<SetLogSnapshot[]>([]);
  const [substitutions, setSubstitutions] = useState<Map<string, string>>(new Map());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const [pendingSync, setPendingSync] = useState(0);

  const [showSetModal, setShowSetModal] = useState(false);
  const [showSubstituteModal, setShowSubstituteModal] = useState(false);

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
    if (!currentExercise) return;
    setCurrentWeight(
      exerciseWeights.get(currentExercise.id) ?? currentExercise.target_weight_kg ?? 0
    );
  }, [currentExercise?.id]);

  const updateCurrentWeight = useCallback((updater: number | ((prev: number) => number)) => {
    setCurrentWeight(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      if (currentExercise) {
        setExerciseWeights(m => new Map(m).set(currentExercise.id, next));
      }
      return next;
    });
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
      setLogs,
      substitutions: Object.fromEntries(substitutions),
    });
  }, [progress, currentExerciseIndex, session, user?.id, routineId, isLoading, setLogs, substitutions]);

  useEffect(() => {
    getPendingSyncCount().then(setPendingSync);
  }, [setLogs]);

  const refreshSyncStatus = async () => {
    setSyncStatus('syncing');
    const { status, pending } = await processSyncQueue();
    setSyncStatus(status);
    setPendingSync(pending);
  };

  const displayName = (ex: FlatExercise) => substitutions.get(ex.id) ?? ex.name;

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
      setSetLogs(snapshot.setLogs ?? []);
      setSubstitutions(new Map(Object.entries(snapshot.substitutions ?? {})));
      setIsLoading(false);
      refreshSyncStatus();
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
      setLogs: [],
      substitutions: {},
    });

    setIsLoading(false);
  };

  const handleCompleteSet = () => {
    if (!currentExercise) return;
    const cur = progress.get(currentExercise.id);
    if (cur?.isComplete) return;
    setShowSetModal(true);
  };

  const handleSetConfirm = async (payload: SetCompletePayload) => {
    if (!currentExercise || !session) return;
    setShowSetModal(false);

    const cur = progress.get(currentExercise.id);
    if (!cur) return;

    const setNumber = cur.setsCompleted + 1;
    const performedName = substitutions.get(currentExercise.id) ?? null;

    const snapshot: SetLogSnapshot = {
      exerciseId: currentExercise.id,
      setNumber,
      repsCompleted: currentExercise.exercise_type === 'reps' ? payload.reps : null,
      actualValue: currentExercise.exercise_type !== 'reps' ? payload.reps : null,
      weightKg: payload.skipped ? null : (payload.weightKg > 0 ? payload.weightKg : null),
      rir: payload.rir,
      skipped: payload.skipped,
      performedName,
    };

    setSetLogs(prev => [...prev.filter(l =>
      !(l.exerciseId === snapshot.exerciseId && l.setNumber === snapshot.setNumber)
    ), snapshot]);

    if (!payload.skipped && payload.weightKg > 0) {
      updateCurrentWeight(payload.weightKg);
    }

    await enqueueSetLog({
      session_id: session.id,
      exercise_id: currentExercise.id,
      set_number: setNumber,
      reps_completed: snapshot.repsCompleted,
      actual_value: snapshot.actualValue,
      weight_kg: snapshot.weightKg,
      rir: snapshot.rir,
      skipped: snapshot.skipped,
      performed_name: performedName,
    });

    refreshSyncStatus();

    const newSets = cur.setsCompleted + 1;
    const isComplete = newSets >= currentExercise.sets;

    setProgress(prev => {
      const m = new Map(prev);
      m.set(currentExercise.id, { ...cur, setsCompleted: newSets, isComplete });
      return m;
    });

    if (!isComplete && !payload.skipped && currentExercise.rest_seconds > 0) {
      startRestTimer(currentExercise.rest_seconds);
    } else if (isComplete && currentExerciseIndex < totalExercises - 1) {
      setTimeout(() => setCurrentExerciseIndex(prev => prev + 1), 600);
    }
  };

  const handleSubstitute = (name: string) => {
    if (!currentExercise) return;
    setSubstitutions(prev => new Map(prev).set(currentExercise.id, name));
    setHelpExercise(name);
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
    const loggedCount = Array.from(progress.values()).filter(p => p.setsCompleted > 0).length;
    const allDone = completedCount === totalExercises;
    showAlert(
      'Finalizar entrenamiento',
      allDone
        ? `¡Excelente! Completaste todos los ejercicios.\n\n¿Querés terminar?`
        : `Registraste progreso en ${loggedCount} de ${totalExercises} ejercicios.\n\n¿Querés terminar y guardar?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Finalizar',
          onPress: async () => {
            if (!session) return;
            setSyncStatus('syncing');
            const { success, error: syncError } = await flushSyncQueue();
            if (!success) {
              setSyncStatus('error');
              showAlert(
                'Error de sincronización',
                syncError?.message ?? 'No se guardaron todos los registros. Reintentá.',
                [{ text: 'OK' }]
              );
              return;
            }
            const { error: aggError } = await aggregateSessionExerciseLogs(session.id);
            if (aggError) {
              showAlert('Error', aggError.message);
              setSyncStatus('error');
              return;
            }
            const { error: finishError } = await finishWorkoutSession(session.id);
            if (finishError) {
              showAlert('Error', finishError.message);
              setSyncStatus('error');
              return;
            }
            if (user?.id) {
              const active = await hasActiveReminder();
              if (active) setupWorkoutReminder(user.id);
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

  const ctaGradColors: [string, string] = activeTheme === 'dark'
    ? [actionDimBg, '#003d4d']
    : [T.border, T.surface];

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[s.safe, s.center]}>
          <ActivityIndicator size="large" color={T.action} />
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
          <Ionicons name="alert-circle-outline" size={56} color={'#EF4444'} />
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
              colors={['transparent', T.action, 'transparent']}
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
              <Ionicons name="arrow-forward" size={16} color={T.surface} />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={s.safe}>
        {/* ── Top bar ──────────────────────────────────────────────────────── */}
        <View style={s.topBar}>
          <TouchableOpacity onPress={handleCancelWorkout} style={s.topBarBtn}>
            <Ionicons name="close" size={24} color={T.textSecondary} />
          </TouchableOpacity>

          <View style={s.topBarCenter}>
            <Text style={s.topBarTitle} numberOfLines={1}>{routine.name}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
              <Text style={s.topBarTime}>{formatTime(elapsedTime)}</Text>
              {pendingSync > 0 || syncStatus === 'error' ? (
                <TouchableOpacity onPress={refreshSyncStatus} style={s.syncBadge}>
                  <Ionicons
                    name={syncStatus === 'error' ? 'cloud-offline-outline' : 'cloud-upload-outline'}
                    size={12}
                    color={syncStatus === 'error' ? '#f87171' : T.attention}
                  />
                  <Text style={[s.syncText, syncStatus === 'error' && { color: '#f87171' }]}>
                    {syncStatus === 'syncing' ? '...' : pendingSync}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Ionicons name="cloud-done-outline" size={14} color={T.done} />
              )}
            </View>
          </View>

          <TouchableOpacity onPress={handleFinishWorkout} style={s.topBarBtn}>
            <Ionicons name="checkmark-done" size={24} color={T.done} />
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
                  done && { backgroundColor: T.done, borderColor: T.done },
                ]}
              >
                {done
                  ? <Ionicons name="checkmark" size={10} color={T.surface} />
                  : <Text style={[s.dotNum, active && { color: T.surface }]}>{idx + 1}</Text>
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
          <Text style={s.exName}>{displayName(currentExercise)}</Text>
          {substitutions.has(currentExercise.id) && (
            <Text style={s.substitutedFrom}>En lugar de: {currentExercise.name}</Text>
          )}
          <Text style={s.exDetail}>
            {currentExercise.sets} series × {formatExerciseValue(currentExercise.exercise_type as any, currentExercise.value)}
          </Text>
          <View style={s.actionLinks}>
            {lookupExercise(displayName(currentExercise)) && (
              <TouchableOpacity
                onPress={() => setHelpExercise(displayName(currentExercise))}
                style={s.techBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="information-circle-outline" size={14} color={T.textSecondary} />
                <Text style={s.techBtnText}>Técnica</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => setShowSubstituteModal(true)} style={s.techBtn} activeOpacity={0.7}>
              <Ionicons name="swap-horizontal-outline" size={14} color={T.action} />
              <Text style={[s.techBtnText, { color: T.action }]}>Sustituir</Text>
            </TouchableOpacity>
          </View>

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
                      ? <Ionicons name="checkmark" size={20} color={T.surface} />
                      : <Text style={[s.setBubbleNum, active && { color: blockColor }]}>{idx + 1}</Text>
                    }
                  </View>
                );
              })}
            </View>
          </View>

          {/* Notes */}
          {currentExercise.notes ? (
            <View style={s.notesCard}>
              <Ionicons name="information-circle-outline" size={18} color={T.textSecondary} />
              <Text style={s.notesText}>{currentExercise.notes}</Text>
            </View>
          ) : null}

          {/* Rest info */}
          {currentExercise.rest_seconds > 0 && !isResting && (
            <View style={s.restInfo}>
              <Ionicons name="timer-outline" size={16} color={T.textSecondary} />
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
              <Ionicons name="chevron-back" size={18} color={currentExerciseIndex === 0 ? T.border : T.textSecondary} />
              <Text style={[s.navBtnText, currentExerciseIndex === 0 && { color: T.border }]}>Anterior</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setCurrentExerciseIndex(p => p + 1)}
              disabled={currentExerciseIndex === totalExercises - 1}
              style={[s.navBtn, currentExerciseIndex === totalExercises - 1 && s.navBtnDisabled]}
            >
              <Text style={[s.navBtnText, currentExerciseIndex === totalExercises - 1 && { color: T.border }]}>Siguiente</Text>
              <Ionicons name="chevron-forward" size={18} color={currentExerciseIndex === totalExercises - 1 ? T.border : T.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* CTA */}
          {!isComplete ? (
            <TouchableOpacity onPress={handleCompleteSet} activeOpacity={0.85} style={s.ctaBtn}>
              <LinearGradient
                colors={ctaGradColors}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={s.ctaGrad}
              >
                <Text style={s.ctaText}>COMPLETAR SERIE {setsCompleted + 1}</Text>
                <Ionicons name="checkmark-circle-outline" size={20} color={T.action} />
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <View style={s.doneCard}>
              <Ionicons name="checkmark-circle" size={26} color={T.done} />
              <Text style={s.doneText}>EJERCICIO COMPLETADO</Text>
            </View>
          )}
        </View>
      </View>

      <SetCompleteModal
        visible={showSetModal}
        setNumber={setsCompleted + 1}
        totalSets={currentExercise.sets}
        exerciseName={displayName(currentExercise)}
        exerciseType={currentExercise.exercise_type}
        defaultReps={currentExercise.value}
        defaultWeight={currentWeight}
        onConfirm={handleSetConfirm}
        onClose={() => setShowSetModal(false)}
      />

      <SubstituteExerciseModal
        visible={showSubstituteModal}
        exerciseName={currentExercise.name}
        onSelect={handleSubstitute}
        onClose={() => setShowSubstituteModal(false)}
      />

      <ExerciseHelpModal
        exerciseName={helpExercise}
        onClose={() => setHelpExercise(null)}
      />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function createStyles(T: ThemeTokens, actionDimBg = '#00566a') {
  return StyleSheet.create({
    safe:    { flex: 1, backgroundColor: T.surface },
    center:  { alignItems: 'center', justifyContent: 'center' },
    scroll:  { padding: 20, paddingBottom: 8 },

    // ── Loading / error ──
    textHi:     { color: T.textPrimary, fontSize: 16, fontFamily: 'SpaceGrotesk_600SemiBold' },
    textLo:     { color: T.textSecondary, fontSize: 14, fontFamily: 'SpaceGrotesk_400Regular' },
    errorBtn:   { marginTop: 20, backgroundColor: T.surfaceElevated, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, borderWidth: 1, borderColor: T.border },
    errorBtnText: { color: T.action, fontFamily: 'SpaceGrotesk_700Bold', fontSize: 14 },

    // ── Rest modal ──
    restOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', alignItems: 'center', justifyContent: 'center', padding: 24 },
    restCard:    { width: '100%', backgroundColor: T.surfaceElevated, borderRadius: 24, padding: 32, alignItems: 'center', overflow: 'hidden', borderWidth: 1, borderColor: T.border },
    restTopLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, opacity: 0.5 },
    restLabel:   { color: T.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 2, marginBottom: 16 },
    restTimer:   { color: T.action, fontSize: 80, fontFamily: 'SpaceGrotesk_700Bold', lineHeight: 88 },
    restNext:    { color: T.textSecondary, fontSize: 14, fontFamily: 'SpaceGrotesk_400Regular', marginTop: 8, marginBottom: 28 },
    skipBtn:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: T.action, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 },
    skipBtnText: { color: T.surface, fontFamily: 'SpaceGrotesk_700Bold', fontSize: 13, letterSpacing: 1.5 },

    // ── Top bar ──
    topBar:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12 },
    topBarBtn:    { padding: 8 },
    topBarCenter: { flex: 1, alignItems: 'center' },
    topBarTitle:  { color: T.textPrimary, fontSize: 15, fontFamily: 'SpaceGrotesk_700Bold' },
    topBarTime:   { color: T.action, fontSize: 13, fontFamily: 'SpaceGrotesk_700Bold' },
    syncBadge:    { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: T.border, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
    syncText:     { color: T.attention, fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold' },

    // ── Progress ──
    progressWrap:  { paddingHorizontal: 20, marginBottom: 8 },
    progressTrack: { height: 4, backgroundColor: T.border, borderRadius: 4, overflow: 'hidden' },
    progressFill:  { height: '100%', backgroundColor: T.done, borderRadius: 4 },
    progressLabel: { color: T.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular', textAlign: 'center', marginTop: 6 },

    // ── Exercise dots ──
    dotsScroll: { maxHeight: 40, flexGrow: 0 },
    dotsRow:    { paddingHorizontal: 20, gap: 6, alignItems: 'center' },
    dot:        { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: T.border, alignItems: 'center', justifyContent: 'center', backgroundColor: T.border },
    dotNum:     { color: T.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk_700Bold' },

    // ── Main content ──
    blockBadgeRow: { alignItems: 'center', marginBottom: 20 },
    blockBadge:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
    blockBadgeText:{ fontSize: 12, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 0.5 },

    exName:   { color: T.textPrimary, fontSize: 30, fontFamily: 'SpaceGrotesk_700Bold', textAlign: 'center', lineHeight: 36, marginBottom: 4 },
    substitutedFrom: { color: T.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular', textAlign: 'center', marginBottom: 8, fontStyle: 'italic' },
    exDetail: { color: T.textSecondary, fontSize: 16, fontFamily: 'SpaceGrotesk_600SemiBold', textAlign: 'center', marginBottom: 12 },
    actionLinks: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 20 },
    techBtn:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
    techBtnText: { color: T.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular' },

    setsCard:  { backgroundColor: T.surfaceElevated, borderRadius: 16, borderWidth: 1, borderColor: T.border, borderLeftWidth: 3, padding: 20, marginBottom: 16 },
    setsLabel: { color: T.textSecondary, fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 2, marginBottom: 16, textAlign: 'center' },
    setsRow:   { flexDirection: 'row', justifyContent: 'center', gap: 10, flexWrap: 'wrap' },
    setBubble: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: T.border, alignItems: 'center', justifyContent: 'center', backgroundColor: T.border },
    setBubbleDone: { backgroundColor: T.done, borderColor: T.done },
    setBubbleNum:  { color: T.textSecondary, fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold' },

    weightHint:  { color: T.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular', textAlign: 'center', marginBottom: 12, opacity: 0.8 },
    weightRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 },
    weightBtn:   { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: T.border, alignItems: 'center', justifyContent: 'center', backgroundColor: T.border },
    weightValue: { color: T.textPrimary, fontSize: 22, fontFamily: 'SpaceGrotesk_700Bold', minWidth: 56, textAlign: 'center' },

    notesCard: { flexDirection: 'row', gap: 10, backgroundColor: T.border, borderRadius: 12, padding: 14, marginBottom: 12 },
    notesText: { flex: 1, color: T.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular', lineHeight: 20 },

    restInfo:     { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', marginTop: 4 },
    restInfoText: { color: T.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular' },

    // ── Bottom ──
    bottom:   { padding: 20, paddingBottom: 36, gap: 12 },
    navRow:   { flexDirection: 'row', justifyContent: 'space-between' },
    navBtn:   { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 8 },
    navBtnDisabled: { opacity: 0.4 },
    navBtnText: { color: T.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk_600SemiBold' },

    ctaBtn:  { borderRadius: 16, overflow: 'hidden' },
    ctaGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18 },
    ctaText: { color: T.action, fontSize: 14, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1.5 },

    doneCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: `${T.done}15`, borderRadius: 16, paddingVertical: 18, borderWidth: 1.5, borderColor: T.done },
    doneText: { color: T.done, fontFamily: 'SpaceGrotesk_700Bold', fontSize: 14, letterSpacing: 1.5 },
  });
}

import { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import {
  getRoutineById,
  Routine,
  Block,
  Exercise,
  getBlockLabel,
  getBlockColor,
  getBlockIcon,
  formatExerciseValue,
} from '@/lib/services/routineService';
import {
  startWorkoutSession,
  finishWorkoutSession,
  logExercise,
  WorkoutSession,
  formatDuration,
} from '@/lib/services/workoutService';
import { setupWorkoutReminder, hasActiveReminder } from '@/lib/services/notificationService';

interface ExerciseProgress {
  exerciseId: string;
  setsCompleted: number;
  isComplete: boolean;
}

export default function WorkoutScreen() {
  const { routineId } = useLocalSearchParams<{ routineId: string }>();
  const { user } = useAuth();

  const [routine, setRoutine] = useState<Routine | null>(null);
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Progress tracking
  const [progress, setProgress] = useState<Map<string, ExerciseProgress>>(new Map());
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);

  // Timer
  const [isResting, setIsResting] = useState(false);
  const [restTimeLeft, setRestTimeLeft] = useState(0);
  const [showRestModal, setShowRestModal] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Elapsed time
  const [elapsedTime, setElapsedTime] = useState(0);
  const elapsedTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Flatten exercises for navigation
  const allExercises = routine?.blocks?.flatMap(block =>
    block.exercises.map(ex => ({ ...ex, blockType: block.block_type }))
  ) || [];

  const currentExercise = allExercises[currentExerciseIndex];
  const totalExercises = allExercises.length;

  useEffect(() => {
    loadRoutineAndStart();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    };
  }, [routineId]);

  // Elapsed time counter
  useEffect(() => {
    if (session && !session.finished_at) {
      elapsedTimerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
    };
  }, [session]);

  const loadRoutineAndStart = async () => {
    if (!routineId || !user?.id) return;

    setIsLoading(true);

    // Load routine
    const { routine: data, error: routineError } = await getRoutineById(routineId);
    if (routineError || !data) {
      setError(routineError?.message || 'Rutina no encontrada');
      setIsLoading(false);
      return;
    }
    setRoutine(data);

    // Initialize progress
    const initialProgress = new Map<string, ExerciseProgress>();
    data.blocks?.forEach(block => {
      block.exercises.forEach(ex => {
        initialProgress.set(ex.id, {
          exerciseId: ex.id,
          setsCompleted: 0,
          isComplete: false,
        });
      });
    });
    setProgress(initialProgress);

    // Start session
    const { session: newSession, error: sessionError } = await startWorkoutSession({
      user_id: user.id,
      routine_id: routineId,
    });

    if (sessionError) {
      setError(sessionError.message);
      setIsLoading(false);
      return;
    }

    setSession(newSession);
    setIsLoading(false);
  };

  const handleCompleteSet = () => {
    if (!currentExercise) return;

    const currentProgress = progress.get(currentExercise.id);
    if (!currentProgress) return;

    const newSetsCompleted = currentProgress.setsCompleted + 1;
    const isComplete = newSetsCompleted >= currentExercise.sets;

    setProgress(prev => {
      const newMap = new Map(prev);
      newMap.set(currentExercise.id, {
        ...currentProgress,
        setsCompleted: newSetsCompleted,
        isComplete,
      });
      return newMap;
    });

    // Start rest timer if not last set
    if (!isComplete && currentExercise.rest_seconds > 0) {
      startRestTimer(currentExercise.rest_seconds);
    } else if (isComplete) {
      // Log the completed exercise
      if (session) {
        logExercise({
          session_id: session.id,
          exercise_id: currentExercise.id,
          sets_completed: currentExercise.sets,
          actual_value: currentExercise.value,
        });
      }

      // Move to next exercise if available
      if (currentExerciseIndex < totalExercises - 1) {
        setCurrentExerciseIndex(prev => prev + 1);
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

  const handlePreviousExercise = () => {
    if (currentExerciseIndex > 0) {
      setCurrentExerciseIndex(prev => prev - 1);
    }
  };

  const handleNextExercise = () => {
    if (currentExerciseIndex < totalExercises - 1) {
      setCurrentExerciseIndex(prev => prev + 1);
    }
  };

  const handleFinishWorkout = () => {
    const completedCount = Array.from(progress.values()).filter(p => p.isComplete).length;
    const message = completedCount === totalExercises
      ? '¡Excelente! Completaste todos los ejercicios.'
      : `Completaste ${completedCount} de ${totalExercises} ejercicios.`;

    Alert.alert(
      'Finalizar entrenamiento',
      message + '\n\n¿Querés terminar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Finalizar',
          onPress: async () => {
            if (session) {
              await finishWorkoutSession(session.id);
              // Recalcular recordatorio basado en el historial actualizado
              if (user?.id) {
                const active = await hasActiveReminder();
                if (active) setupWorkoutReminder(user.id);
              }
            }
            router.back();
          },
        },
      ]
    );
  };

  const handleCancelWorkout = () => {
    Alert.alert(
      'Cancelar entrenamiento',
      '¿Estás seguro? Se perderá el progreso.',
      [
        { text: 'Continuar', style: 'cancel' },
        {
          text: 'Cancelar',
          style: 'destructive',
          onPress: () => router.back(),
        },
      ]
    );
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCompletedExercisesCount = (): number => {
    return Array.from(progress.values()).filter(p => p.isComplete).length;
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-900">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text className="text-white mt-4">Preparando entrenamiento...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !routine || !currentExercise) {
    return (
      <SafeAreaView className="flex-1 bg-gray-900">
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="alert-circle" size={64} color="#EF4444" />
          <Text className="text-white text-center mt-4">
            {error || 'No hay ejercicios en esta rutina'}
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="mt-4 bg-blue-500 px-6 py-3 rounded-lg"
          >
            <Text className="text-white font-semibold">Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentProgress = progress.get(currentExercise.id);

  return (
    <SafeAreaView className="flex-1 bg-gray-900">
      {/* Rest Timer Modal */}
      <Modal
        visible={showRestModal}
        animationType="fade"
        transparent
      >
        <View className="flex-1 bg-black/80 items-center justify-center">
          <View className="bg-gray-800 rounded-3xl p-8 mx-6 items-center">
            <Text className="text-gray-400 text-lg mb-2">Descanso</Text>
            <Text className="text-white text-7xl font-bold mb-6">
              {formatTime(restTimeLeft)}
            </Text>
            <TouchableOpacity
              onPress={skipRest}
              className="bg-blue-500 px-8 py-3 rounded-xl"
            >
              <Text className="text-white font-semibold text-lg">Saltar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <TouchableOpacity onPress={handleCancelWorkout} className="p-2">
          <Ionicons name="close" size={28} color="#9CA3AF" />
        </TouchableOpacity>
        <View className="items-center">
          <Text className="text-gray-400 text-sm">{routine.name}</Text>
          <Text className="text-white font-semibold">{formatTime(elapsedTime)}</Text>
        </View>
        <TouchableOpacity onPress={handleFinishWorkout} className="p-2">
          <Ionicons name="checkmark-done" size={28} color="#10B981" />
        </TouchableOpacity>
      </View>

      {/* Progress Bar */}
      <View className="px-4 mb-4">
        <View className="flex-row h-1 bg-gray-700 rounded-full overflow-hidden">
          {allExercises.map((ex, index) => {
            const exProgress = progress.get(ex.id);
            const isComplete = exProgress?.isComplete;
            const isCurrent = index === currentExerciseIndex;
            return (
              <View
                key={ex.id}
                className={`flex-1 mx-0.5 rounded-full ${
                  isComplete ? 'bg-green-500' : isCurrent ? 'bg-blue-500' : 'bg-gray-700'
                }`}
              />
            );
          })}
        </View>
        <Text className="text-gray-400 text-center mt-2 text-sm">
          {getCompletedExercisesCount()}/{totalExercises} ejercicios completados
        </Text>
      </View>

      {/* Current Exercise */}
      <ScrollView className="flex-1 px-4">
        {/* Block Badge */}
        <View className="flex-row justify-center mb-4">
          <View
            className="flex-row items-center px-3 py-1 rounded-full"
            style={{ backgroundColor: `${getBlockColor(currentExercise.blockType)}30` }}
          >
            <Ionicons
              name={getBlockIcon(currentExercise.blockType) as any}
              size={16}
              color={getBlockColor(currentExercise.blockType)}
            />
            <Text
              className="ml-2 font-medium"
              style={{ color: getBlockColor(currentExercise.blockType) }}
            >
              {getBlockLabel(currentExercise.blockType)}
            </Text>
          </View>
        </View>

        {/* Exercise Name */}
        <Text className="text-white text-3xl font-bold text-center mb-2">
          {currentExercise.name}
        </Text>

        {/* Exercise Details */}
        <Text className="text-gray-400 text-center text-lg mb-8">
          {currentExercise.sets} series × {formatExerciseValue(currentExercise.exercise_type, currentExercise.value)}
        </Text>

        {/* Sets Progress */}
        <View className="bg-gray-800 rounded-2xl p-6 mb-6">
          <Text className="text-gray-400 text-center mb-4">Series completadas</Text>
          <View className="flex-row justify-center items-center">
            {Array.from({ length: currentExercise.sets }).map((_, index) => {
              const isCompleted = (currentProgress?.setsCompleted || 0) > index;
              return (
                <View
                  key={index}
                  className={`w-12 h-12 rounded-full mx-2 items-center justify-center ${
                    isCompleted ? 'bg-green-500' : 'bg-gray-700'
                  }`}
                >
                  {isCompleted ? (
                    <Ionicons name="checkmark" size={24} color="white" />
                  ) : (
                    <Text className="text-gray-400 font-bold">{index + 1}</Text>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Notes */}
        {currentExercise.notes && (
          <View className="bg-gray-800/50 rounded-xl p-4 mb-6">
            <View className="flex-row items-start">
              <Ionicons name="information-circle" size={20} color="#9CA3AF" />
              <Text className="text-gray-300 ml-2 flex-1">{currentExercise.notes}</Text>
            </View>
          </View>
        )}

        {/* Rest Info */}
        {currentExercise.rest_seconds > 0 && (
          <Text className="text-gray-500 text-center">
            Descanso: {currentExercise.rest_seconds}s entre series
          </Text>
        )}
      </ScrollView>

      {/* Bottom Actions */}
      <View className="px-4 pb-4">
        {/* Navigation */}
        <View className="flex-row justify-between mb-4">
          <TouchableOpacity
            onPress={handlePreviousExercise}
            disabled={currentExerciseIndex === 0}
            className={`flex-row items-center px-4 py-2 rounded-lg ${
              currentExerciseIndex === 0 ? 'opacity-30' : ''
            }`}
          >
            <Ionicons name="chevron-back" size={20} color="#9CA3AF" />
            <Text className="text-gray-400 ml-1">Anterior</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleNextExercise}
            disabled={currentExerciseIndex === totalExercises - 1}
            className={`flex-row items-center px-4 py-2 rounded-lg ${
              currentExerciseIndex === totalExercises - 1 ? 'opacity-30' : ''
            }`}
          >
            <Text className="text-gray-400 mr-1">Siguiente</Text>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Complete Set Button */}
        {!currentProgress?.isComplete ? (
          <TouchableOpacity
            onPress={handleCompleteSet}
            className="bg-blue-500 py-5 rounded-2xl"
          >
            <Text className="text-white text-center font-bold text-xl">
              Completar serie {(currentProgress?.setsCompleted || 0) + 1}
            </Text>
          </TouchableOpacity>
        ) : (
          <View className="bg-green-500/20 py-5 rounded-2xl border-2 border-green-500">
            <View className="flex-row items-center justify-center">
              <Ionicons name="checkmark-circle" size={28} color="#10B981" />
              <Text className="text-green-500 text-center font-bold text-xl ml-2">
                Ejercicio completado
              </Text>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

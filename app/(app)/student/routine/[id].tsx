import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  getRoutineById,
  deleteRoutine,
  addBlock,
  deleteBlock,
  addExercise,
  updateExercise,
  deleteExercise,
  Routine,
  Block,
  Exercise,
  BlockType,
  ExerciseType,
  BLOCK_TYPES,
  EXERCISE_TYPES,
  getBlockLabel,
  getBlockColor,
  getBlockIcon,
  formatExerciseValue,
  CreateExerciseData,
} from '@/lib/services/routineService';

export default function RoutineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

  // Exercise form
  const [exerciseName, setExerciseName] = useState('');
  const [exerciseType, setExerciseType] = useState<ExerciseType>('reps');
  const [exerciseSets, setExerciseSets] = useState('3');
  const [exerciseValue, setExerciseValue] = useState('10');
  const [exerciseRest, setExerciseRest] = useState('60');
  const [exerciseNotes, setExerciseNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadRoutine();
    }, [id])
  );

  const loadRoutine = async () => {
    if (!id) return;

    setIsLoading(true);
    const { routine: data, error: err } = await getRoutineById(id);

    if (err) {
      setError(err.message);
    } else {
      setRoutine(data);
    }
    setIsLoading(false);
  };

  const handleGoBack = () => {
    router.back();
  };

  const handleStartWorkout = () => {
    const hasExercises = routine?.blocks?.some(b => b.exercises.length > 0);
    if (!hasExercises) {
      Alert.alert(
        'Sin ejercicios',
        'Agregá al menos un ejercicio a la rutina para poder entrenar.'
      );
      return;
    }
    router.push(`/student/workout/${id}`);
  };

  const handleDelete = () => {
    Alert.alert(
      'Eliminar rutina',
      '¿Estás seguro? Se eliminarán todos los bloques y ejercicios.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            if (!id) return;
            const { success, error: err } = await deleteRoutine(id);
            if (err || !success) {
              Alert.alert('Error', err?.message || 'No se pudo eliminar');
            } else {
              router.back();
            }
          },
        },
      ]
    );
  };

  const handleAddBlock = async (blockType: BlockType) => {
    if (!id) return;

    setIsSaving(true);
    const { block, error: err } = await addBlock(id, blockType);
    setIsSaving(false);
    setShowBlockModal(false);

    if (err) {
      Alert.alert('Error', err.message);
    } else if (block && routine) {
      setRoutine({
        ...routine,
        blocks: [...(routine.blocks || []), block],
      });
    }
  };

  const handleDeleteBlock = (block: Block) => {
    Alert.alert(
      'Eliminar bloque',
      `¿Eliminar el bloque "${getBlockLabel(block.block_type)}" y todos sus ejercicios?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            const { success, error: err } = await deleteBlock(block.id);
            if (err || !success) {
              Alert.alert('Error', err?.message || 'No se pudo eliminar');
            } else if (routine) {
              setRoutine({
                ...routine,
                blocks: routine.blocks?.filter(b => b.id !== block.id) || [],
              });
            }
          },
        },
      ]
    );
  };

  const openExerciseModal = (block: Block, exercise?: Exercise) => {
    setSelectedBlock(block);
    if (exercise) {
      setSelectedExercise(exercise);
      setExerciseName(exercise.name);
      setExerciseType(exercise.exercise_type);
      setExerciseSets(exercise.sets.toString());
      setExerciseValue(exercise.value.toString());
      setExerciseRest(exercise.rest_seconds.toString());
      setExerciseNotes(exercise.notes || '');
    } else {
      setSelectedExercise(null);
      setExerciseName('');
      setExerciseType('reps');
      setExerciseSets('3');
      setExerciseValue('10');
      setExerciseRest('60');
      setExerciseNotes('');
    }
    setShowExerciseModal(true);
  };

  const handleSaveExercise = async () => {
    if (!selectedBlock) return;

    if (exerciseName.trim().length < 2) {
      Alert.alert('Error', 'El nombre del ejercicio es requerido');
      return;
    }

    const sets = parseInt(exerciseSets) || 3;
    const value = parseInt(exerciseValue) || 10;
    const rest = parseInt(exerciseRest) || 60;

    const exerciseData: CreateExerciseData = {
      name: exerciseName.trim(),
      exercise_type: exerciseType,
      sets,
      value,
      rest_seconds: rest,
      notes: exerciseNotes.trim() || undefined,
    };

    setIsSaving(true);

    if (selectedExercise) {
      // Update existing
      const { exercise, error: err } = await updateExercise(selectedExercise.id, exerciseData);
      setIsSaving(false);

      if (err) {
        Alert.alert('Error', err.message);
      } else if (exercise && routine) {
        setRoutine({
          ...routine,
          blocks: routine.blocks?.map(b =>
            b.id === selectedBlock.id
              ? { ...b, exercises: b.exercises.map(e => e.id === exercise.id ? exercise : e) }
              : b
          ) || [],
        });
        setShowExerciseModal(false);
      }
    } else {
      // Create new
      const { exercise, error: err } = await addExercise(selectedBlock.id, exerciseData);
      setIsSaving(false);

      if (err) {
        Alert.alert('Error', err.message);
      } else if (exercise && routine) {
        setRoutine({
          ...routine,
          blocks: routine.blocks?.map(b =>
            b.id === selectedBlock.id
              ? { ...b, exercises: [...b.exercises, exercise] }
              : b
          ) || [],
        });
        setShowExerciseModal(false);
      }
    }
  };

  const handleDeleteExercise = (exercise: Exercise) => {
    Alert.alert(
      'Eliminar ejercicio',
      `¿Eliminar "${exercise.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            const { success, error: err } = await deleteExercise(exercise.id);
            if (err || !success) {
              Alert.alert('Error', err?.message || 'No se pudo eliminar');
            } else if (routine) {
              setRoutine({
                ...routine,
                blocks: routine.blocks?.map(b => ({
                  ...b,
                  exercises: b.exercises.filter(e => e.id !== exercise.id),
                })) || [],
              });
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !routine) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-red-500 text-center">
            {error || 'Rutina no encontrada'}
          </Text>
          <TouchableOpacity
            onPress={handleGoBack}
            className="mt-4 bg-blue-500 px-6 py-3 rounded-lg"
          >
            <Text className="text-white font-semibold">Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Block Type Modal */}
      <Modal
        visible={showBlockModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowBlockModal(false)}
      >
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
            <Text className="text-lg font-semibold text-gray-900">
              Agregar bloque
            </Text>
            <TouchableOpacity onPress={() => setShowBlockModal(false)} className="p-2">
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <ScrollView className="flex-1 p-4">
            {BLOCK_TYPES.map((type) => (
              <TouchableOpacity
                key={type.value}
                onPress={() => handleAddBlock(type.value)}
                disabled={isSaving}
                className="flex-row items-center p-4 bg-white rounded-xl mb-3 border border-gray-200"
              >
                <View
                  className="w-12 h-12 rounded-xl items-center justify-center mr-4"
                  style={{ backgroundColor: `${type.color}20` }}
                >
                  <Ionicons
                    name={type.icon as any}
                    size={24}
                    color={type.color}
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 font-semibold text-lg">
                    {type.label}
                  </Text>
                </View>
                <Ionicons name="add-circle" size={24} color={type.color} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Exercise Modal */}
      <Modal
        visible={showExerciseModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowExerciseModal(false)}
      >
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
            <TouchableOpacity onPress={() => setShowExerciseModal(false)} className="p-2 -ml-2">
              <Text className="text-gray-500">Cancelar</Text>
            </TouchableOpacity>
            <Text className="text-lg font-semibold text-gray-900">
              {selectedExercise ? 'Editar ejercicio' : 'Nuevo ejercicio'}
            </Text>
            <TouchableOpacity
              onPress={handleSaveExercise}
              disabled={isSaving}
              className="p-2 -mr-2"
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#3B82F6" />
              ) : (
                <Text className="text-blue-500 font-semibold">Guardar</Text>
              )}
            </TouchableOpacity>
          </View>
          <ScrollView className="flex-1 p-4" keyboardShouldPersistTaps="handled">
            {/* Nombre */}
            <Text className="text-gray-700 font-medium mb-2">Nombre del ejercicio</Text>
            <TextInput
              value={exerciseName}
              onChangeText={setExerciseName}
              placeholder="Ej: Press de banca"
              placeholderTextColor="#9CA3AF"
              className="bg-gray-100 rounded-xl px-4 py-3 text-gray-900 mb-4"
            />

            {/* Tipo */}
            <Text className="text-gray-700 font-medium mb-2">Tipo de medición</Text>
            <View className="flex-row mb-4">
              {EXERCISE_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  onPress={() => setExerciseType(type.value)}
                  className={`flex-1 p-3 rounded-xl mr-2 border-2 ${
                    exerciseType === type.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <Text
                    className={`text-center font-medium ${
                      exerciseType === type.value ? 'text-blue-600' : 'text-gray-600'
                    }`}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Series y Valor */}
            <View className="flex-row mb-4">
              <View className="flex-1 mr-2">
                <Text className="text-gray-700 font-medium mb-2">Series</Text>
                <TextInput
                  value={exerciseSets}
                  onChangeText={setExerciseSets}
                  keyboardType="numeric"
                  className="bg-gray-100 rounded-xl px-4 py-3 text-gray-900"
                />
              </View>
              <View className="flex-1 ml-2">
                <Text className="text-gray-700 font-medium mb-2">
                  {exerciseType === 'reps' ? 'Repeticiones' : exerciseType === 'time' ? 'Segundos' : 'Metros'}
                </Text>
                <TextInput
                  value={exerciseValue}
                  onChangeText={setExerciseValue}
                  keyboardType="numeric"
                  className="bg-gray-100 rounded-xl px-4 py-3 text-gray-900"
                />
              </View>
            </View>

            {/* Descanso */}
            <Text className="text-gray-700 font-medium mb-2">Descanso (segundos)</Text>
            <TextInput
              value={exerciseRest}
              onChangeText={setExerciseRest}
              keyboardType="numeric"
              className="bg-gray-100 rounded-xl px-4 py-3 text-gray-900 mb-4"
            />

            {/* Notas */}
            <Text className="text-gray-700 font-medium mb-2">Notas (opcional)</Text>
            <TextInput
              value={exerciseNotes}
              onChangeText={setExerciseNotes}
              placeholder="Ej: Mantener codos a 45°"
              placeholderTextColor="#9CA3AF"
              className="bg-gray-100 rounded-xl px-4 py-3 text-gray-900"
              multiline
              numberOfLines={2}
            />

            {/* Delete button for editing */}
            {selectedExercise && (
              <TouchableOpacity
                onPress={() => {
                  setShowExerciseModal(false);
                  setTimeout(() => handleDeleteExercise(selectedExercise), 300);
                }}
                className="mt-6 py-3"
              >
                <Text className="text-red-500 text-center font-medium">
                  Eliminar ejercicio
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={handleGoBack} className="p-2 -ml-2">
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900 flex-1 text-center" numberOfLines={1}>
          {routine.name}
        </Text>
        <TouchableOpacity onPress={handleDelete} className="p-2 -mr-2">
          <Ionicons name="trash-outline" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        {/* Info */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <View className="flex-row items-center">
            <View className="w-12 h-12 bg-blue-100 rounded-xl items-center justify-center mr-4">
              <Text className="text-blue-600 font-bold text-lg">
                {routine.day_number}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-gray-900 font-semibold text-lg">{routine.name}</Text>
              <Text className="text-gray-500">Día {routine.day_number}</Text>
            </View>
          </View>
          {routine.notes && (
            <Text className="text-gray-600 mt-3 pt-3 border-t border-gray-100">
              {routine.notes}
            </Text>
          )}
        </View>

        {/* Blocks */}
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-gray-700 font-semibold text-lg">Bloques</Text>
          <TouchableOpacity
            onPress={() => setShowBlockModal(true)}
            className="flex-row items-center"
          >
            <Ionicons name="add-circle" size={20} color="#3B82F6" />
            <Text className="text-blue-500 font-medium ml-1">Agregar</Text>
          </TouchableOpacity>
        </View>

        {routine.blocks && routine.blocks.length > 0 ? (
          routine.blocks.map((block) => (
            <View
              key={block.id}
              className="bg-white rounded-xl mb-4 shadow-sm overflow-hidden"
            >
              {/* Block Header */}
              <View
                className="flex-row items-center justify-between p-4"
                style={{ borderLeftWidth: 4, borderLeftColor: getBlockColor(block.block_type) }}
              >
                <View className="flex-row items-center flex-1">
                  <View
                    className="w-10 h-10 rounded-lg items-center justify-center mr-3"
                    style={{ backgroundColor: `${getBlockColor(block.block_type)}20` }}
                  >
                    <Ionicons
                      name={getBlockIcon(block.block_type) as any}
                      size={20}
                      color={getBlockColor(block.block_type)}
                    />
                  </View>
                  <Text className="text-gray-900 font-semibold">
                    {getBlockLabel(block.block_type)}
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <TouchableOpacity
                    onPress={() => openExerciseModal(block)}
                    className="p-2"
                  >
                    <Ionicons name="add" size={24} color="#3B82F6" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDeleteBlock(block)}
                    className="p-2"
                  >
                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Exercises */}
              {block.exercises.length > 0 ? (
                <View className="px-4 pb-2">
                  {block.exercises.map((exercise, index) => (
                    <TouchableOpacity
                      key={exercise.id}
                      onPress={() => openExerciseModal(block, exercise)}
                      className={`py-3 flex-row items-center ${
                        index < block.exercises.length - 1 ? 'border-b border-gray-100' : ''
                      }`}
                    >
                      <View className="flex-1">
                        <Text className="text-gray-900 font-medium">
                          {exercise.name}
                        </Text>
                        <Text className="text-gray-500 text-sm">
                          {exercise.sets} series × {formatExerciseValue(exercise.exercise_type, exercise.value)}
                          {exercise.rest_seconds > 0 && ` • ${exercise.rest_seconds}s descanso`}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View className="px-4 pb-4">
                  <Text className="text-gray-400 text-sm italic">
                    Sin ejercicios. Tocá + para agregar.
                  </Text>
                </View>
              )}
            </View>
          ))
        ) : (
          <View className="bg-white rounded-xl p-8 shadow-sm items-center">
            <View className="w-20 h-20 bg-gray-100 rounded-full items-center justify-center mb-4">
              <Ionicons name="layers-outline" size={40} color="#9CA3AF" />
            </View>
            <Text className="text-gray-900 font-semibold text-lg text-center mb-2">
              Sin bloques todavía
            </Text>
            <Text className="text-gray-500 text-center mb-4">
              Los bloques organizan tus ejercicios por tipo
            </Text>
            <TouchableOpacity
              onPress={() => setShowBlockModal(true)}
              className="bg-blue-500 px-6 py-3 rounded-xl flex-row items-center"
            >
              <Ionicons name="add" size={20} color="white" />
              <Text className="text-white font-semibold ml-2">Agregar bloque</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Tip */}
        {routine.blocks && routine.blocks.length > 0 && (
          <View className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-2 mb-20">
            <View className="flex-row items-start">
              <Ionicons name="bulb-outline" size={24} color="#3B82F6" />
              <View className="ml-3 flex-1">
                <Text className="text-blue-800 font-semibold">Tip</Text>
                <Text className="text-blue-700 mt-1">
                  Tocá un ejercicio para editarlo o agregá más con el botón +
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Start Workout Button */}
      {routine.blocks && routine.blocks.some(b => b.exercises.length > 0) && (
        <View className="absolute bottom-0 left-0 right-0 p-4 bg-gray-50">
          <TouchableOpacity
            onPress={handleStartWorkout}
            className="bg-green-500 py-4 rounded-xl flex-row items-center justify-center shadow-lg"
          >
            <Ionicons name="play" size={24} color="white" />
            <Text className="text-white font-bold text-lg ml-2">
              Iniciar entrenamiento
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

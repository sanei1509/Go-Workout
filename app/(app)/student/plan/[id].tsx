import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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

export default function PlanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [id])
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

  const handleGoBack = () => {
    router.back();
  };

  const handleDelete = () => {
    Alert.alert(
      'Eliminar plan',
      '¿Estás seguro de que querés eliminar este plan? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            if (!id) return;

            const { success, error: err } = await deletePlan(id);

            if (err || !success) {
              Alert.alert('Error', err?.message || 'No se pudo eliminar el plan');
            } else {
              router.back();
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

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !plan) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-red-500 text-center">
            {error || 'Plan no encontrado'}
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
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={handleGoBack} className="p-2 -ml-2">
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900 flex-1 text-center">
          {plan.name}
        </Text>
        <TouchableOpacity onPress={handleDelete} className="p-2 -mr-2">
          <Ionicons name="trash-outline" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        {/* Info del plan */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <View className="flex-row items-center mb-4">
            <View className="w-14 h-14 bg-blue-100 rounded-xl items-center justify-center mr-4">
              <Ionicons name="barbell" size={28} color="#3B82F6" />
            </View>
            <View className="flex-1">
              <Text className="text-xl font-bold text-gray-900">{plan.name}</Text>
              <Text className="text-gray-500">{plan.discipline}</Text>
            </View>
          </View>

          <View className="flex-row">
            <View className="flex-1 bg-gray-50 rounded-lg p-3 mr-2">
              <Text className="text-gray-500 text-sm">Frecuencia</Text>
              <Text className="text-gray-900 font-semibold">
                {getFrequencyLabel(plan.weekly_frequency)}
              </Text>
            </View>
            <View className="flex-1 bg-gray-50 rounded-lg p-3 ml-2">
              <Text className="text-gray-500 text-sm">Rutinas</Text>
              <Text className="text-gray-900 font-semibold">
                {routines.length} creada{routines.length !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* Rutinas */}
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-gray-700 font-semibold text-lg">Rutinas</Text>
          <TouchableOpacity
            onPress={handleAddRoutine}
            className="flex-row items-center"
          >
            <Ionicons name="add-circle" size={20} color="#3B82F6" />
            <Text className="text-blue-500 font-medium ml-1">Agregar</Text>
          </TouchableOpacity>
        </View>

        {routines.length === 0 ? (
          /* Estado vacío */
          <View className="bg-white rounded-xl p-8 shadow-sm items-center">
            <View className="w-20 h-20 bg-gray-100 rounded-full items-center justify-center mb-4">
              <Ionicons name="calendar-outline" size={40} color="#9CA3AF" />
            </View>
            <Text className="text-gray-900 font-semibold text-lg text-center mb-2">
              Sin rutinas todavía
            </Text>
            <Text className="text-gray-500 text-center mb-4">
              Agregá tu primera rutina para empezar a entrenar
            </Text>
            <TouchableOpacity
              onPress={handleAddRoutine}
              className="bg-blue-500 px-6 py-3 rounded-xl flex-row items-center"
            >
              <Ionicons name="add" size={20} color="white" />
              <Text className="text-white font-semibold ml-2">Crear rutina</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Lista de rutinas */
          <View>
            {routines.map((routine) => (
              <TouchableOpacity
                key={routine.id}
                onPress={() => handleOpenRoutine(routine.id)}
                className="bg-white rounded-xl p-4 mb-3 shadow-sm"
              >
                <View className="flex-row items-center">
                  <View className="w-12 h-12 bg-blue-100 rounded-xl items-center justify-center mr-4">
                    <Text className="text-blue-600 font-bold text-lg">
                      {routine.day_number}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-gray-900 font-semibold text-lg">
                      {routine.name}
                    </Text>
                    <Text className="text-gray-500 text-sm">
                      Día {routine.day_number}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Info de ayuda */}
        {routines.length === 0 && (
          <View className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-4">
            <View className="flex-row items-start">
              <Ionicons name="bulb-outline" size={24} color="#3B82F6" />
              <View className="ml-3 flex-1">
                <Text className="text-blue-800 font-semibold">Tip</Text>
                <Text className="text-blue-700 mt-1">
                  Creá una rutina para cada día de entrenamiento. Por ejemplo: "Día 1 - Pecho y Tríceps"
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

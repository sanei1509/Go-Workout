import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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

export default function StudentHome() {
  const { profile, signOut, user } = useAuth();
  const {
    mode,
    selectedTrainer,
    trainers,
    isLoading,
    hasTrainers,
    selectPersonalPlan,
    selectTrainer,
  } = useTraining();

  const [showContextSelector, setShowContextSelector] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [todayData, setTodayData] = useState<TodayRoutineResult | null>(null);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats | null>(null);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Cargar planes cuando el componente se enfoca
  useFocusEffect(
    useCallback(() => {
      if (user?.id && mode === 'personal') {
        loadData();
      }
    }, [user?.id, mode])
  );

  const loadData = async () => {
    if (!user?.id) return;

    setIsLoadingPlans(true);

    const [plansResult, todayResult, statsResult] = await Promise.all([
      getUserPlans(user.id),
      getTodayRoutine(user.id),
      getWeeklyStats(user.id),
    ]);

    setPlans(plansResult.plans);
    setTodayData(todayResult.result);
    setWeeklyStats(statsResult.stats);
    setIsLoadingPlans(false);
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const handleLogout = async () => {
    await signOut();
    router.replace('/login');
  };

  const handleSelectTrainer = (trainer: ActiveTrainer) => {
    selectTrainer(trainer);
    setShowContextSelector(false);
  };

  const handleSelectPersonal = () => {
    selectPersonalPlan();
    setShowContextSelector(false);
  };

  const getContextLabel = () => {
    if (mode === 'trainer' && selectedTrainer) {
      return selectedTrainer.full_name;
    }
    return 'Plan personal';
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Modal Selector de Contexto */}
      <Modal
        visible={showContextSelector}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowContextSelector(false)}
      >
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
            <Text className="text-lg font-semibold text-gray-900">
              Elegí cómo entrenar
            </Text>
            <TouchableOpacity
              onPress={() => setShowContextSelector(false)}
              className="p-2"
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 px-4 py-4">
            {/* Plan Personal */}
            <TouchableOpacity
              onPress={handleSelectPersonal}
              className={`p-4 rounded-xl mb-3 border-2 ${
                mode === 'personal'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <View className="flex-row items-center">
                <View className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${
                  mode === 'personal' ? 'bg-blue-500' : 'bg-gray-100'
                }`}>
                  <Ionicons
                    name="person"
                    size={24}
                    color={mode === 'personal' ? 'white' : '#6B7280'}
                  />
                </View>
                <View className="flex-1">
                  <Text className={`font-semibold text-lg ${
                    mode === 'personal' ? 'text-blue-900' : 'text-gray-900'
                  }`}>
                    Plan personal
                  </Text>
                  <Text className="text-gray-500 text-sm">
                    Armá tus propias rutinas
                  </Text>
                </View>
                {mode === 'personal' && (
                  <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
                )}
              </View>
            </TouchableOpacity>

            {/* Lista de Entrenadores */}
            {trainers.length > 0 && (
              <>
                <Text className="text-gray-500 font-medium mb-3 mt-4">
                  Mis entrenadores
                </Text>
                {trainers.map((trainer) => (
                  <TouchableOpacity
                    key={trainer.id}
                    onPress={() => handleSelectTrainer(trainer)}
                    className={`p-4 rounded-xl mb-3 border-2 ${
                      mode === 'trainer' && selectedTrainer?.id === trainer.id
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <View className="flex-row items-center">
                      <View className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${
                        mode === 'trainer' && selectedTrainer?.id === trainer.id
                          ? 'bg-green-500'
                          : 'bg-purple-100'
                      }`}>
                        <Text className={`font-bold text-xl ${
                          mode === 'trainer' && selectedTrainer?.id === trainer.id
                            ? 'text-white'
                            : 'text-purple-600'
                        }`}>
                          {trainer.full_name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text className={`font-semibold text-lg ${
                          mode === 'trainer' && selectedTrainer?.id === trainer.id
                            ? 'text-green-900'
                            : 'text-gray-900'
                        }`}>
                          {trainer.full_name}
                        </Text>
                        <View className="flex-row flex-wrap mt-1">
                          <Text className="text-gray-500 text-sm">
                            {trainer.discipline} • {trainer.plan_type}
                          </Text>
                        </View>
                      </View>
                      {mode === 'trainer' && selectedTrainer?.id === trainer.id && (
                        <Ionicons name="checkmark-circle" size={24} color="#16A34A" />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Header */}
      <View className="px-4 py-4 bg-white border-b border-gray-100">
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="text-gray-500 text-sm">Hola,</Text>
            <Text className="text-xl font-bold text-gray-900">
              {profile?.full_name || user?.email?.split('@')[0]}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleLogout}
            className="p-2"
          >
            <Ionicons name="log-out-outline" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Context Selector Button */}
        <TouchableOpacity
          onPress={() => setShowContextSelector(true)}
          className="mt-4 bg-gray-100 p-3 rounded-xl flex-row items-center justify-between"
        >
          <View className="flex-row items-center">
            <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
              mode === 'personal' ? 'bg-blue-500' : 'bg-green-500'
            }`}>
              {mode === 'personal' ? (
                <Ionicons name="person" size={20} color="white" />
              ) : (
                <Text className="text-white font-bold">
                  {selectedTrainer?.full_name.charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
            <View>
              <Text className="text-gray-500 text-xs">Entrenando con</Text>
              <Text className="text-gray-900 font-semibold">{getContextLabel()}</Text>
            </View>
          </View>
          <Ionicons name="chevron-down" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
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
    </SafeAreaView>
  );
}

// Componente para vista de Plan Personal
function PersonalPlanView({
  plans,
  isLoading,
  hasTrainers,
  todayData,
  weeklyStats,
}: {
  plans: Plan[];
  isLoading: boolean;
  hasTrainers: boolean;
  todayData: TodayRoutineResult | null;
  weeklyStats: WeeklyStats | null;
}) {
  const handleCreatePlan = () => {
    router.push('/student/plan/create');
  };

  const handleOpenPlan = (planId: string) => {
    router.push(`/student/plan/${planId}`);
  };

  const handleViewHistory = () => {
    router.push('/student/history');
  };

  const currentDay = getCurrentDayOfWeek();
  const dayLabel = getDayLabel(currentDay);

  return (
    <View>
      {/* Cards Rutina del Día - Solo si tiene planes */}
      {plans.length > 0 && (
        <View className="mb-6">
          {todayData?.isRestDay ? (
            // Día de descanso
            <View className="bg-gray-800 rounded-2xl p-6 shadow-lg">
              <View className="flex-row items-center mb-3">
                <View className="w-14 h-14 bg-white/10 rounded-full items-center justify-center mr-4">
                  <Ionicons name="moon" size={28} color="white" />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-400 text-sm">{dayLabel}</Text>
                  <Text className="text-white text-xl font-bold">Día de descanso</Text>
                </View>
              </View>
              <Text className="text-gray-400 text-sm">
                No tenés rutina programada para hoy. ¡Descansá y recuperate!
              </Text>
            </View>
          ) : (
            // Una card por cada plan con rutina hoy
            todayData?.items.map(item => (
              <TodayRoutineCard
                key={item.routine.id}
                item={item}
                dayLabel={dayLabel}
                onViewHistory={handleViewHistory}
              />
            ))
          )}

          {/* Stats rápidos */}
          {weeklyStats && (
            <View className="flex-row mt-4">
              {/* Entrenamientos esta semana */}
              <View className="flex-1 bg-white rounded-xl p-4 mr-2 shadow-sm">
                <View className="flex-row items-center">
                  <View className="w-10 h-10 bg-blue-100 rounded-lg items-center justify-center mr-3">
                    <Ionicons name="calendar" size={20} color="#3B82F6" />
                  </View>
                  <View>
                    <Text className="text-gray-500 text-xs">Esta semana</Text>
                    <Text className="text-gray-900 font-bold text-lg">
                      {weeklyStats.workoutsCompleted}
                      {weeklyStats.workoutsPlanned > 0 && (
                        <Text className="text-gray-400 font-normal">
                          /{weeklyStats.workoutsPlanned}
                        </Text>
                      )}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Racha */}
              <View className="flex-1 bg-white rounded-xl p-4 ml-2 shadow-sm">
                <View className="flex-row items-center">
                  <View className="w-10 h-10 bg-orange-100 rounded-lg items-center justify-center mr-3">
                    <Ionicons name="flame" size={20} color="#F97316" />
                  </View>
                  <View>
                    <Text className="text-gray-500 text-xs">Racha</Text>
                    <Text className="text-gray-900 font-bold text-lg">
                      {weeklyStats.streak} día{weeklyStats.streak !== 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Header Mis planes */}
      <View className="flex-row items-center justify-between mb-4">
        <Text className="text-xl font-bold text-gray-900">Mis planes</Text>
        <TouchableOpacity
          onPress={handleCreatePlan}
          className="bg-blue-500 px-4 py-2 rounded-lg flex-row items-center"
        >
          <Ionicons name="add" size={20} color="white" />
          <Text className="text-white font-semibold ml-1">Nuevo</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View className="py-8 items-center">
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : plans.length === 0 ? (
        // Estado vacío
        <View className="bg-white rounded-2xl p-8 shadow-sm items-center">
          <View className="w-20 h-20 bg-blue-100 rounded-full items-center justify-center mb-4">
            <Ionicons name="barbell-outline" size={40} color="#3B82F6" />
          </View>
          <Text className="text-xl font-bold text-gray-900 text-center mb-2">
            Creá tu primer plan
          </Text>
          <Text className="text-gray-500 text-center mb-6">
            Un plan agrupa tus rutinas de entrenamiento. Empezá creando uno.
          </Text>
          <TouchableOpacity
            onPress={handleCreatePlan}
            className="bg-blue-500 px-6 py-3 rounded-xl flex-row items-center"
          >
            <Ionicons name="add" size={20} color="white" />
            <Text className="text-white font-semibold ml-2">Crear plan</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // Lista de planes
        <View>
          {plans.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              onPress={() => handleOpenPlan(plan.id)}
              className="bg-white rounded-xl p-4 mb-3 shadow-sm"
            >
              <View className="flex-row items-center">
                <View className="w-12 h-12 bg-blue-100 rounded-xl items-center justify-center mr-4">
                  <Ionicons name="barbell" size={24} color="#3B82F6" />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-900 font-semibold text-lg">
                    {plan.name}
                  </Text>
                  <Text className="text-gray-500 text-sm">
                    {plan.discipline} • {getFrequencyLabel(plan.weekly_frequency)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Acciones adicionales */}
      {plans.length > 0 && (
        <View className="mt-6">
          <Text className="text-gray-700 font-semibold mb-3">Más opciones</Text>

          <TouchableOpacity
            onPress={handleViewHistory}
            className="bg-white rounded-xl p-4 mb-3 shadow-sm flex-row items-center"
          >
            <View className="w-12 h-12 bg-green-100 rounded-xl items-center justify-center mr-4">
              <Ionicons name="time" size={24} color="#16A34A" />
            </View>
            <View className="flex-1">
              <Text className="text-gray-900 font-semibold">Historial</Text>
              <Text className="text-gray-500 text-sm">Ver entrenamientos anteriores</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity className="bg-white rounded-xl p-4 mb-3 shadow-sm flex-row items-center">
            <View className="w-12 h-12 bg-purple-100 rounded-xl items-center justify-center mr-4">
              <Ionicons name="sparkles" size={24} color="#9333EA" />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center">
                <Text className="text-gray-900 font-semibold">Crear con IA</Text>
                <View className="bg-amber-400 px-2 py-0.5 rounded ml-2">
                  <Text className="text-amber-900 text-xs font-bold">PRO</Text>
                </View>
              </View>
              <Text className="text-gray-500 text-sm">Generá un plan personalizado</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Info si no tiene entrenadores */}
      {!hasTrainers && (
        <View className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-4">
          <View className="flex-row items-start">
            <Ionicons name="information-circle" size={24} color="#3B82F6" />
            <View className="ml-3 flex-1">
              <Text className="text-blue-800 font-semibold">¿Querés un entrenador?</Text>
              <Text className="text-blue-700 mt-1">
                Revisá tus invitaciones en la pestaña "Invitaciones".
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

// Card individual para una rutina del día
function TodayRoutineCard({
  item,
  dayLabel,
  onViewHistory,
}: {
  item: TodayRoutineItem;
  dayLabel: string;
  onViewHistory: () => void;
}) {
  const handleStartWorkout = () => {
    router.push(`/student/workout/${item.routine.id}`);
  };

  if (item.alreadyTrainedToday) {
    return (
      <View className="bg-green-500 rounded-2xl p-6 shadow-lg mb-3">
        <View className="flex-row items-center mb-3">
          <View className="w-14 h-14 bg-white/20 rounded-full items-center justify-center mr-4">
            <Ionicons name="checkmark-circle" size={32} color="white" />
          </View>
          <View className="flex-1">
            <Text className="text-green-100 text-sm">{dayLabel}</Text>
            <Text className="text-white text-xl font-bold">¡Ya entrenaste!</Text>
            <Text className="text-green-200 text-sm">{item.routine.name}</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={onViewHistory}
          className="bg-white/20 py-3 rounded-xl flex-row items-center justify-center"
        >
          <Ionicons name="time-outline" size={20} color="white" />
          <Text className="text-white font-semibold ml-2">Ver historial</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="bg-blue-500 rounded-2xl p-6 shadow-lg mb-3">
      <View className="flex-row items-center mb-4">
        <View className="w-14 h-14 bg-white/20 rounded-full items-center justify-center mr-4">
          <Ionicons name="barbell" size={28} color="white" />
        </View>
        <View className="flex-1">
          <Text className="text-blue-100 text-sm">{dayLabel}</Text>
          <Text className="text-white text-xl font-bold">{item.routine.name}</Text>
          <Text className="text-blue-200 text-sm">{item.plan.name}</Text>
        </View>
      </View>
      <TouchableOpacity
        onPress={handleStartWorkout}
        className="bg-white py-4 rounded-xl flex-row items-center justify-center"
      >
        <Ionicons name="play" size={24} color="#3B82F6" />
        <Text className="text-blue-500 font-bold text-lg ml-2">Entrenar ahora</Text>
      </TouchableOpacity>
    </View>
  );
}

// Componente para vista con Entrenador
function TrainerView({ trainer }: { trainer: ActiveTrainer }) {
  return (
    <View>
      {/* Info del entrenador */}
      <View className="bg-green-500 rounded-2xl p-6 mb-4">
        <View className="flex-row items-center mb-3">
          <View className="w-14 h-14 bg-white/20 rounded-full items-center justify-center mr-4">
            <Text className="text-white font-bold text-2xl">
              {trainer.full_name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text className="text-green-100 text-sm">Entrenando con</Text>
            <Text className="text-white text-xl font-bold">{trainer.full_name}</Text>
          </View>
        </View>
        <View className="flex-row flex-wrap">
          <View className="bg-white/20 px-3 py-1 rounded-full mr-2 mb-2">
            <Text className="text-white text-sm">{trainer.discipline}</Text>
          </View>
          <View className="bg-white/20 px-3 py-1 rounded-full mr-2 mb-2">
            <Text className="text-white text-sm">{trainer.plan_type}</Text>
          </View>
          <View className="bg-white/20 px-3 py-1 rounded-full mb-2">
            <Text className="text-white text-sm">{trainer.frequency}</Text>
          </View>
        </View>
      </View>

      {/* Rutinas pendientes (placeholder) */}
      <Text className="text-gray-700 font-semibold mb-3">Rutinas pendientes</Text>

      <View className="bg-white rounded-xl p-6 mb-4 shadow-sm items-center">
        <View className="w-16 h-16 bg-gray-100 rounded-full items-center justify-center mb-4">
          <Ionicons name="barbell-outline" size={32} color="#9CA3AF" />
        </View>
        <Text className="text-gray-500 text-center">
          Tu entrenador aún no te asignó rutinas
        </Text>
        <Text className="text-gray-400 text-sm text-center mt-1">
          Las rutinas aparecerán aquí cuando estén disponibles
        </Text>
      </View>

      {/* Historial (placeholder) */}
      <Text className="text-gray-700 font-semibold mb-3">Historial reciente</Text>

      <View className="bg-white rounded-xl p-6 shadow-sm items-center">
        <View className="w-16 h-16 bg-gray-100 rounded-full items-center justify-center mb-4">
          <Ionicons name="time-outline" size={32} color="#9CA3AF" />
        </View>
        <Text className="text-gray-500 text-center">
          Todavía no tenés entrenamientos registrados
        </Text>
      </View>
    </View>
  );
}

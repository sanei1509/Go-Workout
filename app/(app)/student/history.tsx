import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BarChart } from 'react-native-chart-kit';
import { useAuth } from '@/contexts/AuthContext';
import {
  getWorkoutHistory,
  getWeeklyStats,
  formatDurationMinutes,
  WeeklyStats,
} from '@/lib/services/todayService';
import { WorkoutSession } from '@/lib/services/workoutService';
import {
  getGeneralStats,
  getWeeklySessionsBars,
  GeneralStats,
  WeeklySessionsBar,
} from '@/lib/services/progressService';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface SessionWithDetails extends WorkoutSession {
  routine_name?: string;
  plan_name?: string;
}

export default function HistoryScreen() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionWithDetails[]>([]);
  const [stats, setStats] = useState<WeeklyStats | null>(null);
  const [generalStats, setGeneralStats] = useState<GeneralStats | null>(null);
  const [weeklyBars, setWeeklyBars] = useState<WeeklySessionsBar[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [user?.id])
  );

  const loadData = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    const [historyResult, statsResult, generalStatsResult, barsResult] = await Promise.all([
      getWorkoutHistory(user.id, 30),
      getWeeklyStats(user.id),
      getGeneralStats(user.id),
      getWeeklySessionsBars(user.id, 8),
    ]);

    setSessions(historyResult.sessions);
    setStats(statsResult.stats);
    setGeneralStats(generalStatsResult.stats);
    setWeeklyBars(barsResult.bars);
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

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 0) {
      return 'Hoy';
    } else if (diffDays === 1) {
      return 'Ayer';
    } else if (diffDays < 7) {
      return `Hace ${diffDays} días`;
    } else {
      return date.toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'short',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  const formatTime = (dateString: string): string => {
    return new Date(dateString).toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Agrupar sesiones por fecha
  const groupedSessions = sessions.reduce((groups, session) => {
    const date = new Date(session.started_at).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(session);
    return groups;
  }, {} as Record<string, SessionWithDetails[]>);

  const sortedDates = Object.keys(groupedSessions).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={handleGoBack} className="p-2 -ml-2">
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900">Historial</Text>
        <TouchableOpacity
          onPress={() => router.push('/student/analytics' as any)}
          className="p-2 -mr-2"
        >
          <Ionicons name="stats-chart-outline" size={22} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
          }
        >
          {/* Stats Cards */}
          {stats && (
            <View className="flex-row mb-6">
              <View className="flex-1 bg-white rounded-xl p-4 mr-2 shadow-sm">
                <View className="flex-row items-center">
                  <View className="w-10 h-10 bg-blue-100 rounded-lg items-center justify-center mr-3">
                    <Ionicons name="fitness" size={20} color="#3B82F6" />
                  </View>
                  <View>
                    <Text className="text-gray-500 text-xs">Total sesiones</Text>
                    <Text className="text-gray-900 font-bold text-xl">
                      {sessions.length}
                    </Text>
                  </View>
                </View>
              </View>

              <View className="flex-1 bg-white rounded-xl p-4 ml-2 shadow-sm">
                <View className="flex-row items-center">
                  <View className="w-10 h-10 bg-orange-100 rounded-lg items-center justify-center mr-3">
                    <Ionicons name="flame" size={20} color="#F97316" />
                  </View>
                  <View>
                    <Text className="text-gray-500 text-xs">Racha actual</Text>
                    <Text className="text-gray-900 font-bold text-xl">
                      {stats.streak} día{stats.streak !== 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Sección de volumen y estadísticas generales (GOW-48) */}
          {generalStats && (
            <View className="mb-6">
              {/* Volumen semanal */}
              <Text className="text-gray-700 font-semibold mb-3">Volumen semanal</Text>
              <View className="flex-row mb-3">
                <View className="flex-1 bg-white rounded-xl p-4 mr-2 shadow-sm">
                  <Text className="text-gray-500 text-xs mb-1">Esta semana</Text>
                  <Text className="text-gray-900 font-bold text-xl">
                    {generalStats.volumeThisWeek.toLocaleString()}
                  </Text>
                  <View className="flex-row items-center mt-1">
                    <Ionicons
                      name={generalStats.volumeChange >= 0 ? 'trending-up' : 'trending-down'}
                      size={14}
                      color={generalStats.volumeChange >= 0 ? '#16A34A' : '#EF4444'}
                    />
                    <Text
                      className="text-xs ml-1 font-medium"
                      style={{ color: generalStats.volumeChange >= 0 ? '#16A34A' : '#EF4444' }}
                    >
                      {generalStats.volumeChange >= 0 ? '+' : ''}{generalStats.volumeChange}% vs semana ant.
                    </Text>
                  </View>
                </View>
                <View className="flex-1 bg-white rounded-xl p-4 ml-2 shadow-sm">
                  <Text className="text-gray-500 text-xs mb-1">Ejercicios distintos</Text>
                  <Text className="text-gray-900 font-bold text-xl">
                    {generalStats.distinctExercises}
                  </Text>
                  <Text className="text-gray-400 text-xs mt-1">en total histórico</Text>
                </View>
              </View>

              {/* Gráfico de barras semanal */}
              {weeklyBars.length > 0 && weeklyBars.some(b => b.count > 0) && (
                <View className="bg-white rounded-xl p-4 shadow-sm">
                  <Text className="text-gray-700 font-semibold mb-3">Sesiones por semana</Text>
                  <BarChart
                    data={{
                      labels: weeklyBars.map(b => b.label),
                      datasets: [{ data: weeklyBars.map(b => b.count) }],
                    }}
                    width={SCREEN_WIDTH - 64}
                    height={160}
                    yAxisLabel=""
                    yAxisSuffix=""
                    chartConfig={{
                      backgroundColor: '#ffffff',
                      backgroundGradientFrom: '#ffffff',
                      backgroundGradientTo: '#ffffff',
                      decimalPlaces: 0,
                      color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                      labelColor: () => '#9CA3AF',
                      barPercentage: 0.6,
                      propsForBackgroundLines: { stroke: '#F3F4F6' },
                    }}
                    style={{ borderRadius: 8, marginLeft: -16 }}
                    withInnerLines
                    showValuesOnTopOfBars
                    fromZero
                  />
                </View>
              )}
            </View>
          )}

          {/* Lista de entrenamientos */}
          {sessions.length === 0 ? (
            <View className="bg-white rounded-xl p-8 shadow-sm items-center">
              <View className="w-20 h-20 bg-gray-100 rounded-full items-center justify-center mb-4">
                <Ionicons name="barbell-outline" size={40} color="#9CA3AF" />
              </View>
              <Text className="text-gray-900 font-semibold text-lg text-center mb-2">
                Sin entrenamientos
              </Text>
              <Text className="text-gray-500 text-center">
                Completá tu primer entrenamiento para verlo aquí
              </Text>
            </View>
          ) : (
            sortedDates.map((dateKey) => (
              <View key={dateKey} className="mb-6">
                <Text className="text-gray-500 font-medium mb-3">
                  {formatDate(groupedSessions[dateKey][0].started_at)}
                </Text>

                {groupedSessions[dateKey].map((session) => (
                  <TouchableOpacity
                    key={session.id}
                    className="bg-white rounded-xl p-4 mb-3 shadow-sm"
                    onPress={() => router.push(`/student/session/${session.id}` as any)}
                    activeOpacity={0.7}
                  >
                    <View className="flex-row items-center">
                      <View className="w-12 h-12 bg-green-100 rounded-xl items-center justify-center mr-4">
                        <Ionicons name="checkmark" size={24} color="#16A34A" />
                      </View>
                      <View className="flex-1">
                        <Text className="text-gray-900 font-semibold">
                          {session.routine_name || 'Entrenamiento'}
                        </Text>
                        {session.plan_name && (
                          <Text className="text-gray-500 text-sm">
                            {session.plan_name}
                          </Text>
                        )}
                        <View className="flex-row items-center mt-1">
                          <Ionicons name="time-outline" size={14} color="#9CA3AF" />
                          <Text className="text-gray-400 text-sm ml-1">
                            {formatTime(session.started_at)}
                          </Text>
                          {session.finished_at && (
                            <>
                              <Text className="text-gray-400 text-sm mx-2">•</Text>
                              <Text className="text-gray-400 text-sm">
                                {formatDurationMinutes(
                                  session.started_at,
                                  session.finished_at
                                )}{' '}
                                min
                              </Text>
                            </>
                          )}
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ))
          )}

          {/* Motivación */}
          {sessions.length > 0 && stats && stats.streak > 0 && (
            <View className="bg-orange-50 border border-orange-200 rounded-xl p-4 mt-2">
              <View className="flex-row items-center">
                <Ionicons name="flame" size={24} color="#F97316" />
                <View className="ml-3 flex-1">
                  <Text className="text-orange-800 font-semibold">
                    ¡{stats.streak} día{stats.streak !== 1 ? 's' : ''} seguidos!
                  </Text>
                  <Text className="text-orange-700 text-sm">
                    Seguí así para mantener tu racha
                  </Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import {
  getGeneralStats,
  getAllPersonalRecords,
  formatProgressValue,
  GeneralStats,
  PersonalRecord,
} from '@/lib/services/progressService';

export default function AnalyticsScreen() {
  const { user } = useAuth();
  const [generalStats, setGeneralStats] = useState<GeneralStats | null>(null);
  const [records, setRecords] = useState<PersonalRecord[]>([]);
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
    const [statsResult, recordsResult] = await Promise.all([
      getGeneralStats(user.id),
      getAllPersonalRecords(user.id),
    ]);
    setGeneralStats(statsResult.stats);
    setRecords(recordsResult.records);
    setIsLoading(false);
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900">Análisis de progreso</Text>
        <View className="w-10" />
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16 }}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
        >
          {/* Volumen semanal */}
          {generalStats && (
            <View className="mb-6">
              <Text className="text-gray-700 font-semibold mb-3">Volumen semanal</Text>
              <View className="flex-row">
                <View className="flex-1 bg-white rounded-xl p-4 mr-2 shadow-sm">
                  <Text className="text-gray-500 text-xs mb-1">Esta semana</Text>
                  <Text className="text-gray-900 font-bold text-2xl">
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
                      {generalStats.volumeChange >= 0 ? '+' : ''}{generalStats.volumeChange}% vs sem. ant.
                    </Text>
                  </View>
                </View>
                <View className="flex-1 bg-white rounded-xl p-4 mx-1 shadow-sm items-center justify-center">
                  <Text className="text-gray-900 font-bold text-2xl">{generalStats.totalSets}</Text>
                  <Text className="text-gray-500 text-xs mt-1">Series esta semana</Text>
                </View>
                <View className="flex-1 bg-white rounded-xl p-4 ml-2 shadow-sm items-center justify-center">
                  <Text className="text-gray-900 font-bold text-2xl">{generalStats.distinctExercises}</Text>
                  <Text className="text-gray-500 text-xs mt-1">Ejercicios distintos</Text>
                </View>
              </View>
            </View>
          )}

          {/* Acceso a evolución por ejercicio */}
          <TouchableOpacity
            onPress={() => router.push('/student/progress' as any)}
            className="bg-blue-500 rounded-xl p-4 mb-6 flex-row items-center shadow-sm"
          >
            <View className="w-12 h-12 bg-white/20 rounded-xl items-center justify-center mr-4">
              <Ionicons name="stats-chart" size={24} color="white" />
            </View>
            <View className="flex-1">
              <Text className="text-white font-bold text-base">Evolución por ejercicio</Text>
              <Text className="text-blue-100 text-sm">Ver gráfico de progreso y récord</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="white" />
          </TouchableOpacity>

          {/* Récords personales */}
          <Text className="text-gray-700 font-semibold mb-3">
            Récords personales ({records.length})
          </Text>

          {records.length === 0 ? (
            <View className="bg-white rounded-xl p-8 shadow-sm items-center">
              <View className="w-16 h-16 bg-amber-100 rounded-full items-center justify-center mb-3">
                <Ionicons name="trophy-outline" size={32} color="#D97706" />
              </View>
              <Text className="text-gray-500 text-center">
                Completá entrenamientos para ver tus récords aquí.
              </Text>
            </View>
          ) : (
            <View className="bg-white rounded-xl shadow-sm overflow-hidden">
              {records.map((record, idx) => (
                <TouchableOpacity
                  key={record.exercise_name}
                  onPress={() => router.push('/student/progress' as any)}
                  className={`flex-row items-center px-4 py-3 ${
                    idx < records.length - 1 ? 'border-b border-gray-100' : ''
                  }`}
                >
                  {/* Posición */}
                  <View className="w-8 items-center mr-3">
                    {idx === 0 ? (
                      <Ionicons name="trophy" size={18} color="#D97706" />
                    ) : idx === 1 ? (
                      <Ionicons name="trophy" size={18} color="#9CA3AF" />
                    ) : idx === 2 ? (
                      <Ionicons name="trophy" size={18} color="#CD7C3A" />
                    ) : (
                      <Text className="text-gray-400 text-sm font-medium">{idx + 1}</Text>
                    )}
                  </View>

                  {/* Nombre */}
                  <View className="flex-1">
                    <Text className="text-gray-900 font-medium">{record.exercise_name}</Text>
                    <Text className="text-gray-400 text-xs mt-0.5">{formatDate(record.achieved_at)}</Text>
                  </View>

                  {/* PR */}
                  <View className="items-end mr-2">
                    <Text className="text-gray-900 font-bold">
                      {formatProgressValue(record.best_value, record.exercise_type)}
                    </Text>
                    <Text className="text-gray-400 text-xs">× {record.best_sets} series</Text>
                  </View>

                  <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

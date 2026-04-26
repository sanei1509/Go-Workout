import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  getSessionDetail,
  SessionDetail,
  SessionExerciseLog,
} from '@/lib/services/workoutService';
import {
  getBlockLabel,
  getBlockColor,
  getBlockIcon,
} from '@/lib/services/routineService';

function formatValue(log: SessionExerciseLog): string {
  const v = log.actual_value ?? log.target_value;
  switch (log.exercise_type) {
    case 'time':
      return v >= 60 ? `${Math.floor(v / 60)}m ${v % 60}s` : `${v}s`;
    case 'distance':
      return `${v}m`;
    default:
      return `${v} reps`;
  }
}

function formatTargetValue(log: SessionExerciseLog): string {
  const v = log.target_value;
  switch (log.exercise_type) {
    case 'time':
      return v >= 60 ? `${Math.floor(v / 60)}m ${v % 60}s` : `${v}s`;
    case 'distance':
      return `${v}m`;
    default:
      return `${v} reps`;
  }
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    loadDetail();
  }, [id]);

  const loadDetail = async () => {
    setIsLoading(true);
    const { detail: data, error: err } = await getSessionDetail(id);
    if (err || !data) {
      setError(err?.message ?? 'No se pudo cargar la sesión');
    } else {
      setDetail(data);
    }
    setIsLoading(false);
  };

  // Agrupar ejercicios por bloque
  const groupedByBlock = detail?.exercises.reduce((acc, ex) => {
    const key = ex.block_type;
    if (!acc[key]) acc[key] = [];
    acc[key].push(ex);
    return acc;
  }, {} as Record<string, SessionExerciseLog[]>) ?? {};

  const blockOrder = ['warmup', 'main', 'accessory', 'cardio', 'mobility'];
  const sortedBlocks = Object.keys(groupedByBlock).sort(
    (a, b) => blockOrder.indexOf(a) - blockOrder.indexOf(b)
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900">Detalle de sesión</Text>
        <View className="w-10" />
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
          <Text className="text-gray-700 text-center mt-3">{error}</Text>
        </View>
      ) : detail ? (
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
          {/* Metadata de la sesión */}
          <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
            <Text className="text-gray-900 font-bold text-xl mb-1">
              {detail.session.routine_name}
            </Text>
            <Text className="text-blue-600 font-medium mb-3">
              {detail.session.plan_name}
              {detail.session.plan_discipline ? ` · ${detail.session.plan_discipline}` : ''}
            </Text>

            <View className="flex-row flex-wrap gap-3">
              <View className="flex-row items-center">
                <Ionicons name="calendar-outline" size={15} color="#6B7280" />
                <Text className="text-gray-500 text-sm ml-1">
                  {formatDate(detail.session.started_at)}
                </Text>
              </View>
              <View className="flex-row items-center">
                <Ionicons name="time-outline" size={15} color="#6B7280" />
                <Text className="text-gray-500 text-sm ml-1">
                  {formatTime(detail.session.started_at)}
                </Text>
              </View>
              <View className="flex-row items-center bg-green-100 px-2 py-0.5 rounded-full">
                <Ionicons name="stopwatch-outline" size={14} color="#16A34A" />
                <Text className="text-green-700 text-sm font-medium ml-1">
                  {detail.session.duration}
                </Text>
              </View>
            </View>

            {detail.session.notes ? (
              <View className="mt-3 pt-3 border-t border-gray-100">
                <Text className="text-gray-500 text-sm">{detail.session.notes}</Text>
              </View>
            ) : null}
          </View>

          {/* Ejercicios por bloque */}
          {detail.exercises.length === 0 ? (
            <View className="bg-white rounded-xl p-6 shadow-sm items-center">
              <Text className="text-gray-500">No se registraron ejercicios</Text>
            </View>
          ) : (
            sortedBlocks.map((blockType) => {
              const color = getBlockColor(blockType as any);
              const label = getBlockLabel(blockType as any);
              const icon = getBlockIcon(blockType as any);
              const exercises = groupedByBlock[blockType];

              return (
                <View key={blockType} className="mb-4">
                  {/* Header del bloque */}
                  <View
                    className="flex-row items-center px-3 py-2 rounded-t-xl"
                    style={{ backgroundColor: color + '20' }}
                  >
                    <Ionicons name={icon as any} size={16} color={color} />
                    <Text
                      className="font-semibold text-sm ml-2"
                      style={{ color }}
                    >
                      {label}
                    </Text>
                    <Text className="text-gray-400 text-xs ml-auto">
                      {exercises.length} ejercicio{exercises.length !== 1 ? 's' : ''}
                    </Text>
                  </View>

                  {/* Ejercicios del bloque */}
                  <View className="bg-white rounded-b-xl shadow-sm overflow-hidden">
                    {exercises.map((ex, idx) => (
                      <View
                        key={ex.log_id}
                        className={`px-4 py-3 ${idx < exercises.length - 1 ? 'border-b border-gray-100' : ''}`}
                      >
                        <View className="flex-row items-center justify-between">
                          <Text className="text-gray-900 font-medium flex-1 mr-2">
                            {ex.exercise_name}
                          </Text>
                          <View
                            className="px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: color + '15' }}
                          >
                            <Text className="text-xs font-medium" style={{ color }}>
                              {ex.sets_completed}/{ex.target_sets} series
                            </Text>
                          </View>
                        </View>

                        <View className="flex-row items-center mt-1">
                          <Text className="text-gray-500 text-sm">
                            {formatValue(ex)}
                          </Text>
                          {ex.actual_value !== null &&
                            ex.actual_value !== ex.target_value && (
                              <Text className="text-gray-400 text-xs ml-2">
                                (objetivo: {formatTargetValue(ex)})
                              </Text>
                            )}
                          {ex.rest_seconds > 0 && (
                            <View className="flex-row items-center ml-3">
                              <Ionicons name="pause-circle-outline" size={13} color="#9CA3AF" />
                              <Text className="text-gray-400 text-xs ml-1">
                                {ex.rest_seconds}s descanso
                              </Text>
                            </View>
                          )}
                        </View>

                        {ex.notes ? (
                          <Text className="text-gray-400 text-xs mt-1 italic">
                            {ex.notes}
                          </Text>
                        ) : null}
                      </View>
                    ))}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

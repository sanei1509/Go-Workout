import { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { useAuth } from '@/contexts/AuthContext';
import {
  getExerciseHistory,
  getAllPersonalRecords,
  formatProgressValue,
  PersonalRecord,
  ExerciseHistoryEntry,
} from '@/lib/services/progressService';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 32;

export default function ProgressScreen() {
  const { user } = useAuth();
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<PersonalRecord[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<PersonalRecord | null>(null);
  const [history, setHistory] = useState<ExerciseHistoryEntry[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [search, setSearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadRecords();
    }, [user?.id])
  );

  const loadRecords = async () => {
    if (!user?.id) return;
    setIsLoadingRecords(true);
    const { records: data } = await getAllPersonalRecords(user.id);
    setRecords(data);
    setFilteredRecords(data);
    setIsLoadingRecords(false);
  };

  const handleSearch = (text: string) => {
    setSearch(text);
    setShowDropdown(true);
    if (!text.trim()) {
      setFilteredRecords(records);
    } else {
      setFilteredRecords(
        records.filter((r) =>
          r.exercise_name.toLowerCase().includes(text.toLowerCase())
        )
      );
    }
  };

  const handleSelectExercise = async (record: PersonalRecord) => {
    setSelectedExercise(record);
    setSearch(record.exercise_name);
    setShowDropdown(false);
    if (!user?.id) return;
    setIsLoadingHistory(true);
    const { history: data } = await getExerciseHistory(user.id, record.exercise_name);
    setHistory(data);
    setIsLoadingHistory(false);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });

  // Preparar datos para el gráfico
  const chartLabels = history.map((h) => formatDate(h.date));
  const chartData = history.map((h) => h.actual_value);

  // Mostrar máx 8 puntos en el eje X para legibilidad
  const maxPoints = 8;
  const step = chartData.length > maxPoints ? Math.ceil(chartData.length / maxPoints) : 1;
  const slicedLabels = chartLabels.filter((_, i) => i % step === 0);
  const slicedData = chartData.filter((_, i) => i % step === 0);

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900">Progreso por ejercicio</Text>
        <View className="w-10" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Buscador de ejercicio */}
        <View className="mb-4">
          <Text className="text-gray-700 font-medium mb-2">Seleccioná un ejercicio</Text>
          <View className="relative">
            <View className="flex-row items-center bg-white border border-gray-200 rounded-xl px-4">
              <Ionicons name="search" size={18} color="#9CA3AF" />
              <TextInput
                className="flex-1 py-3 ml-2 text-gray-900"
                placeholder="Buscar ejercicio..."
                value={search}
                onChangeText={handleSearch}
                onFocus={() => setShowDropdown(true)}
              />
              {search.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setSearch('');
                    setSelectedExercise(null);
                    setHistory([]);
                    setFilteredRecords(records);
                    setShowDropdown(false);
                  }}
                >
                  <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>

            {/* Dropdown */}
            {showDropdown && filteredRecords.length > 0 && (
              <View className="absolute top-14 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-10 max-h-48 overflow-hidden">
                <ScrollView keyboardShouldPersistTaps="handled">
                  {filteredRecords.map((item) => (
                    <TouchableOpacity
                      key={item.exercise_name}
                      onPress={() => handleSelectExercise(item)}
                      className="px-4 py-3 border-b border-gray-50"
                    >
                      <Text className="text-gray-900">{item.exercise_name}</Text>
                      <Text className="text-gray-400 text-xs mt-0.5">
                        PR: {formatProgressValue(item.best_value, item.exercise_type)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {isLoadingRecords && (
            <Text className="text-gray-400 text-sm mt-2">Cargando ejercicios...</Text>
          )}
          {!isLoadingRecords && records.length === 0 && (
            <Text className="text-gray-400 text-sm mt-2">
              Completá entrenamientos para ver tu progreso aquí.
            </Text>
          )}
        </View>

        {/* Contenido del ejercicio seleccionado */}
        {selectedExercise && (
          <>
            {/* Card PR */}
            <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
              <View className="flex-row items-center mb-3">
                <View className="w-10 h-10 bg-amber-100 rounded-xl items-center justify-center mr-3">
                  <Ionicons name="trophy" size={22} color="#D97706" />
                </View>
                <View>
                  <Text className="text-gray-500 text-xs">Récord personal</Text>
                  <Text className="text-gray-900 font-bold text-lg">
                    {selectedExercise.exercise_name}
                  </Text>
                </View>
              </View>

              <View className="flex-row">
                <View className="flex-1 items-center bg-amber-50 rounded-xl py-3 mr-2">
                  <Text className="text-amber-700 font-bold text-2xl">
                    {formatProgressValue(selectedExercise.best_value, selectedExercise.exercise_type)}
                  </Text>
                  <Text className="text-amber-600 text-xs mt-1">Mejor marca</Text>
                </View>
                <View className="flex-1 items-center bg-gray-50 rounded-xl py-3 ml-2">
                  <Text className="text-gray-700 font-bold text-2xl">
                    {selectedExercise.best_sets}
                  </Text>
                  <Text className="text-gray-500 text-xs mt-1">Series ese día</Text>
                </View>
              </View>

              <Text className="text-gray-400 text-xs mt-3 text-right">
                Logrado el {formatDate(selectedExercise.achieved_at)}
              </Text>
            </View>

            {/* Gráfico de evolución */}
            <View className="bg-white rounded-xl p-4 shadow-sm mb-4">
              <Text className="text-gray-900 font-semibold mb-4">Evolución</Text>

              {isLoadingHistory ? (
                <View className="h-32 items-center justify-center">
                  <ActivityIndicator size="small" color="#3B82F6" />
                </View>
              ) : history.length < 2 ? (
                <View className="h-32 items-center justify-center">
                  <Text className="text-gray-400 text-sm text-center">
                    Necesitás al menos 2 sesiones con este ejercicio para ver la evolución.
                  </Text>
                </View>
              ) : (
                <LineChart
                  data={{
                    labels: slicedLabels,
                    datasets: [{ data: slicedData }],
                  }}
                  width={CHART_WIDTH - 32}
                  height={180}
                  chartConfig={{
                    backgroundColor: '#ffffff',
                    backgroundGradientFrom: '#ffffff',
                    backgroundGradientTo: '#ffffff',
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                    labelColor: () => '#9CA3AF',
                    propsForDots: {
                      r: '4',
                      strokeWidth: '2',
                      stroke: '#3B82F6',
                    },
                    propsForBackgroundLines: {
                      stroke: '#F3F4F6',
                    },
                  }}
                  bezier
                  style={{ borderRadius: 8, marginLeft: -16 }}
                  withInnerLines
                  withOuterLines={false}
                />
              )}
            </View>

            {/* Lista de registros */}
            {history.length > 0 && (
              <View className="bg-white rounded-xl shadow-sm overflow-hidden">
                <Text className="text-gray-900 font-semibold px-4 pt-4 pb-2">
                  Historial ({history.length} sesiones)
                </Text>
                {[...history].reverse().map((entry, idx) => (
                  <View
                    key={`${entry.session_id}-${idx}`}
                    className={`flex-row items-center px-4 py-3 ${idx < history.length - 1 ? 'border-b border-gray-100' : ''}`}
                  >
                    <View className="w-8 h-8 bg-blue-50 rounded-lg items-center justify-center mr-3">
                      <Text className="text-blue-600 text-xs font-bold">
                        {history.length - idx}
                      </Text>
                    </View>
                    <Text className="text-gray-500 text-sm flex-1">
                      {formatDate(entry.date)}
                    </Text>
                    <Text className="text-gray-900 font-semibold">
                      {formatProgressValue(entry.actual_value, entry.exercise_type)}
                    </Text>
                    <Text className="text-gray-400 text-xs ml-2">
                      × {entry.sets_completed} series
                    </Text>
                    {entry.actual_value === selectedExercise.best_value && (
                      <Ionicons name="trophy" size={14} color="#D97706" style={{ marginLeft: 6 }} />
                    )}
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

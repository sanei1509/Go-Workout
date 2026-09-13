import { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { useFocusEffect, Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart } from 'react-native-chart-kit';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeTokens } from '@/constants/theme';
import {
  getExerciseHistory,
  getAllPersonalRecords,
  formatProgressValue,
  PersonalRecord,
  ExerciseHistoryEntry,
} from '@/lib/services/progressService';

const CHART_W = Dimensions.get('window').width - 80;

export default function ProgressScreen() {
  const { user } = useAuth();
  const { T, activeTheme } = useTheme();
  const actionDimBg = activeTheme === 'dark' ? '#00566a' : '#e0f7fa';
  const s = useMemo(() => createStyles(T, actionDimBg), [T, actionDimBg]);
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<PersonalRecord | null>(null);
  const [history, setHistory] = useState<ExerciseHistoryEntry[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [search, setSearch] = useState('');

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
    setIsLoadingRecords(false);
  };

  const handleSelectExercise = async (record: PersonalRecord) => {
    setSelectedExercise(record);
    setSearch(record.exercise_name);
    if (!user?.id) return;
    setIsLoadingHistory(true);
    const { history: data } = await getExerciseHistory(user.id, record.exercise_name);
    setHistory(data);
    setIsLoadingHistory(false);
  };

  const clearSelection = () => {
    setSelectedExercise(null);
    setSearch('');
    setHistory([]);
  };

  const filteredRecords = search.trim()
    ? records.filter(r => r.exercise_name.toLowerCase().includes(search.toLowerCase()))
    : records;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });

  const formatDateLong = (iso: string) =>
    new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });

  const slicedLabels = (() => {
    const labels = history.map(h => formatDate(h.date));
    const step = labels.length > 8 ? Math.ceil(labels.length / 8) : 1;
    return labels.filter((_, i) => i % step === 0);
  })();

  const slicedData = (() => {
    const data = history.map(h => h.actual_value);
    const step = data.length > 8 ? Math.ceil(data.length / 8) : 1;
    return data.filter((_, i) => i % step === 0);
  })();

  const showingDetail = !!selectedExercise && !search.trim().length
    ? false // never happens since search is set on selection
    : !!selectedExercise;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'EVOLUCIÓN',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.navigate('/student/analytics' as any)}
              style={{ marginLeft: 4, padding: 4 }}
            >
              <Ionicons name="chevron-back" size={26} color={T.action} />
            </TouchableOpacity>
          ),
        }}
      />
      <View style={s.container}>
        <LinearGradient
          colors={['transparent', T.action, 'transparent']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={s.topLine}
        />

        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Buscador ──────────────────────────────────────────── */}
          <View style={s.searchBox}>
            <Ionicons name="search-outline" size={18} color={T.textSecondary} />
            <TextInput
              style={s.searchInput}
              placeholder="Buscar ejercicio..."
              placeholderTextColor={T.textSecondary}
              value={search}
              onChangeText={text => {
                setSearch(text);
                if (selectedExercise && text !== selectedExercise.exercise_name) {
                  setSelectedExercise(null);
                  setHistory([]);
                }
              }}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={clearSelection}>
                <Ionicons name="close-circle" size={18} color={T.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* ── Lista de ejercicios ───────────────────────────────── */}
          {!selectedExercise && (
            <>
              {isLoadingRecords ? (
                <View style={s.centeredState}>
                  <ActivityIndicator size="large" color={T.action} />
                </View>
              ) : records.length === 0 ? (
                <View style={s.centeredState}>
                  <View style={s.emptyIcon}>
                    <Ionicons name="barbell-outline" size={32} color={T.action} />
                  </View>
                  <Text style={s.emptyTitle}>SIN DATOS AÚN</Text>
                  <Text style={s.emptyDesc}>
                    Completá entrenamientos para ver tu evolución aquí.
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={s.sectionTitle}>
                    {search.trim() ? 'RESULTADOS' : 'MIS EJERCICIOS'}
                  </Text>
                  <View style={s.exerciseList}>
                    {filteredRecords.map((item, idx) => (
                      <TouchableOpacity
                        key={item.exercise_name}
                        onPress={() => handleSelectExercise(item)}
                        activeOpacity={0.85}
                      >
                        <View style={[s.exerciseRow, idx < filteredRecords.length - 1 && s.exerciseBorder]}>
                          <View style={s.exerciseRank}>
                            {idx < 3 ? (
                              <Ionicons
                                name="trophy"
                                size={14}
                                color={['#D97706','#9CA3AF','#CD7C3A'][idx]}
                              />
                            ) : (
                              <Text style={s.exerciseRankNum}>{idx + 1}</Text>
                            )}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={s.exerciseName}>{item.exercise_name}</Text>
                            <Text style={s.exerciseDate}>{formatDateLong(item.achieved_at)}</Text>
                          </View>
                          <Text style={s.exercisePr}>
                            {formatProgressValue(item.best_value, item.exercise_type)}
                          </Text>
                          <Ionicons name="chevron-forward" size={14} color={T.border} style={{ marginLeft: 6 }} />
                        </View>
                      </TouchableOpacity>
                    ))}
                    {filteredRecords.length === 0 && (
                      <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                        <Text style={s.emptyDesc}>Sin resultados para "{search}"</Text>
                      </View>
                    )}
                  </View>
                </>
              )}
            </>
          )}

          {/* ── Detalle del ejercicio ─────────────────────────────── */}
          {selectedExercise && (
            <>
              {/* PR Card */}
              <View style={s.prCard}>
                <LinearGradient
                  colors={['transparent', T.attention, 'transparent']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={s.prTopLine}
                />
                <View style={s.prHeader}>
                  <View style={s.prTrophyWrap}>
                    <Ionicons name="trophy" size={22} color={T.attention} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.prLabel}>RÉCORD PERSONAL</Text>
                    <Text style={s.prExercise}>{selectedExercise.exercise_name}</Text>
                  </View>
                </View>
                <View style={s.prStats}>
                  <View style={s.prStatMain}>
                    <Text style={s.prStatValue}>
                      {formatProgressValue(selectedExercise.best_value, selectedExercise.exercise_type)}
                    </Text>
                    <Text style={s.prStatLabel}>MEJOR MARCA</Text>
                  </View>
                  <View style={s.prStatDivider} />
                  <View style={s.prStatSide}>
                    <Text style={s.prStatValue}>{selectedExercise.best_sets}</Text>
                    <Text style={s.prStatLabel}>SERIES</Text>
                  </View>
                  <View style={s.prStatDivider} />
                  <View style={s.prStatSide}>
                    <Text style={[s.prStatValue, { fontSize: 13 }]}>
                      {formatDate(selectedExercise.achieved_at)}
                    </Text>
                    <Text style={s.prStatLabel}>FECHA</Text>
                  </View>
                </View>
              </View>

              {/* Chart */}
              <View style={s.chartCard}>
                <Text style={s.sectionTitle}>EVOLUCIÓN</Text>
                {isLoadingHistory ? (
                  <View style={s.chartPlaceholder}>
                    <ActivityIndicator size="small" color={T.action} />
                  </View>
                ) : history.length < 2 ? (
                  <View style={s.chartPlaceholder}>
                    <Ionicons name="analytics-outline" size={28} color={T.border} />
                    <Text style={s.emptyDesc}>
                      Necesitás al menos 2 sesiones para ver la evolución.
                    </Text>
                  </View>
                ) : (
                  <LineChart
                    data={{ labels: slicedLabels, datasets: [{ data: slicedData }] }}
                    width={CHART_W}
                    height={180}
                    chartConfig={{
                      backgroundColor: T.surfaceElevated,
                      backgroundGradientFrom: T.surfaceElevated,
                      backgroundGradientTo: T.border,
                      decimalPlaces: 0,
                      color: (opacity = 1) => `rgba(0, 209, 255, ${opacity})`,
                      labelColor: () => T.textSecondary,
                      propsForDots: { r: '5', strokeWidth: '2', stroke: T.action, fill: actionDimBg },
                      propsForBackgroundLines: { stroke: T.border, strokeDasharray: '' },
                    }}
                    bezier
                    style={{ borderRadius: 8, marginLeft: -10 }}
                    withInnerLines
                    withOuterLines={false}
                  />
                )}
              </View>

              {/* History list */}
              {history.length > 0 && (
                <>
                  <View style={s.sectionRow}>
                    <Text style={s.sectionTitle}>HISTORIAL</Text>
                    <View style={s.countBadge}>
                      <Text style={s.countBadgeText}>{history.length} sesiones</Text>
                    </View>
                  </View>
                  <View style={s.historyList}>
                    {[...history].reverse().map((entry, idx) => {
                      const isPR = entry.actual_value === selectedExercise.best_value;
                      return (
                        <View
                          key={`${entry.session_id}-${idx}`}
                          style={[s.historyRow, idx < history.length - 1 && s.historyBorder]}
                        >
                          <View style={[s.historyNum, isPR && { backgroundColor: '#2a1f00' }]}>
                            <Text style={[s.historyNumText, isPR && { color: T.attention }]}>
                              {history.length - idx}
                            </Text>
                          </View>
                          <Text style={s.historyDate}>{formatDateLong(entry.date)}</Text>
                          <View style={s.historyRight}>
                            <Text style={[s.historyValue, isPR && { color: T.attention }]}>
                              {formatProgressValue(entry.actual_value, entry.exercise_type)}
                            </Text>
                            <Text style={s.historySets}>× {entry.sets_completed} series</Text>
                          </View>
                          {isPR && (
                            <Ionicons name="trophy" size={14} color={T.attention} style={{ marginLeft: 8 }} />
                          )}
                        </View>
                      );
                    })}
                  </View>
                </>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function createStyles(T: ThemeTokens, actionDimBg: string) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: T.surface },
    topLine:   { position: 'absolute', top: 0, left: 0, right: 0, height: 2, opacity: 0.4, zIndex: 10 },
    scroll:    { padding: 20, paddingBottom: 48 },

    // Section
    sectionTitle:   { color: T.textSecondary, fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 3, marginBottom: 12 },
    sectionRow:     { flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginTop: 24 },
    countBadge:     { marginLeft: 10, backgroundColor: actionDimBg, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
    countBadgeText: { color: T.action, fontSize: 11, fontFamily: 'SpaceGrotesk_700Bold' },

    // Search
    searchBox:   { flexDirection: 'row', alignItems: 'center', backgroundColor: T.surfaceElevated, borderRadius: 10, borderWidth: 1, borderColor: T.border, paddingHorizontal: 14, paddingVertical: 12, gap: 10, marginBottom: 20 },
    searchInput: { flex: 1, color: T.textPrimary, fontSize: 14, fontFamily: 'SpaceGrotesk_400Regular' },

    // States
    centeredState: { alignItems: 'center', paddingVertical: 48, gap: 12 },
    emptyIcon:     { width: 64, height: 64, borderRadius: 32, backgroundColor: actionDimBg, alignItems: 'center', justifyContent: 'center' },
    emptyTitle:    { color: T.textPrimary, fontSize: 13, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 2 },
    emptyDesc:     { color: T.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular', textAlign: 'center', lineHeight: 20 },

    // Exercise list
    exerciseList:   { backgroundColor: T.surfaceElevated, borderRadius: 12, borderWidth: 1, borderColor: T.border, overflow: 'hidden', marginBottom: 8 },
    exerciseRow:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13 },
    exerciseBorder: { borderBottomWidth: 1, borderBottomColor: T.border },
    exerciseRank:   { width: 28, alignItems: 'center', marginRight: 12 },
    exerciseRankNum:{ color: T.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk_700Bold' },
    exerciseName:   { color: T.textPrimary, fontSize: 13, fontFamily: 'SpaceGrotesk_600SemiBold', marginBottom: 2 },
    exerciseDate:   { color: T.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular' },
    exercisePr:     { color: T.action, fontSize: 13, fontFamily: 'SpaceGrotesk_700Bold' },

    // PR card
    prCard:       { backgroundColor: T.surfaceElevated, borderRadius: 14, borderWidth: 1, borderColor: T.attention, marginBottom: 16, overflow: 'hidden' },
    prTopLine:    { height: 2, opacity: 0.7 },
    prHeader:     { flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: 12, gap: 12 },
    prTrophyWrap: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#2a1f00', alignItems: 'center', justifyContent: 'center' },
    prLabel:      { color: T.attention, fontSize: 9, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 2, marginBottom: 3 },
    prExercise:   { color: T.textPrimary, fontSize: 16, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: -0.3 },
    prStats:      { flexDirection: 'row', borderTopWidth: 1, borderTopColor: T.border },
    prStatMain:   { flex: 2, alignItems: 'center', paddingVertical: 14 },
    prStatSide:   { flex: 1, alignItems: 'center', paddingVertical: 14 },
    prStatDivider:{ width: 1, backgroundColor: T.border },
    prStatValue:  { color: T.textPrimary, fontSize: 20, fontFamily: 'SpaceGrotesk_700Bold', marginBottom: 3 },
    prStatLabel:  { color: T.textSecondary, fontSize: 9, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 2 },

    // Chart
    chartCard:            { backgroundColor: T.surfaceElevated, borderRadius: 14, borderWidth: 1, borderColor: T.border, padding: 20, marginBottom: 4, overflow: 'hidden' },
    chartPlaceholder:     { height: 120, alignItems: 'center', justifyContent: 'center', gap: 10 },

    // History
    historyList:   { backgroundColor: T.surfaceElevated, borderRadius: 12, borderWidth: 1, borderColor: T.border, overflow: 'hidden' },
    historyRow:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
    historyBorder: { borderBottomWidth: 1, borderBottomColor: T.border },
    historyNum:    { width: 28, height: 28, borderRadius: 6, backgroundColor: actionDimBg, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    historyNumText:{ color: T.action, fontSize: 12, fontFamily: 'SpaceGrotesk_700Bold' },
    historyDate:   { flex: 1, color: T.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular' },
    historyRight:  { alignItems: 'flex-end' },
    historyValue:  { color: T.textPrimary, fontSize: 14, fontFamily: 'SpaceGrotesk_700Bold' },
    historySets:   { color: T.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular', marginTop: 1 },
  });
}

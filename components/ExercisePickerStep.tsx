import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeTokens } from '@/constants/theme';
import type { BlockType } from '@/lib/services/routineService';
import type { Exercise as CatalogExercise } from '@/lib/services/exerciseService';
import type { MuscleGroup } from '@/lib/exercises/catalog';

export const MUSCLE_LABEL: Record<MuscleGroup, string> = {
  chest: 'Pecho', back: 'Espalda', traps: 'Trapecios', shoulders: 'Hombros',
  biceps: 'Bíceps', triceps: 'Tríceps', forearms: 'Antebrazos', core: 'Core',
  glutes: 'Glúteos', quads: 'Cuádriceps', hamstrings: 'Isquios', calves: 'Gemelos',
};

const MUSCLE_FILTER_BLOCKS: BlockType[] = ['main', 'accessory'];

export interface ExercisePickerStepProps {
  catalog: CatalogExercise[];
  discipline: string;
  blockType: BlockType;
  blockLabel: string;
  recentNames: string[];
  onPick: (name: string) => void;
  onClose: () => void;
  onHelpExercise?: (name: string) => void;
}

export function ExercisePickerStep({
  catalog,
  discipline,
  blockType,
  blockLabel,
  recentNames,
  onPick,
  onClose,
  onHelpExercise,
}: ExercisePickerStepProps) {
  const { T, activeTheme } = useTheme();
  const actionDimBg = activeTheme === 'dark' ? '#00566a' : '#e8e4dc';
  const s = useMemo(() => createStyles(T, actionDimBg), [T, actionDimBg]);

  const [search, setSearch] = useState('');
  const [muscleFilter, setMuscleFilter] = useState<MuscleGroup | null>(null);

  useEffect(() => {
    setSearch('');
    setMuscleFilter(null);
  }, [blockType, blockLabel]);

  const muscleOptions = useMemo(() => {
    const set = new Set<MuscleGroup>();
    for (const ex of catalog) for (const m of ex.primary_muscles) set.add(m);
    return [...set];
  }, [catalog]);

  const results = useMemo(() => {
    let items = catalog;
    if (muscleFilter) items = items.filter(ex => ex.primary_muscles.includes(muscleFilter));
    const q = search.trim().toLowerCase();
    if (q) {
      items = items.filter(ex =>
        ex.label.toLowerCase().includes(q) || ex.aliases.some(a => a.includes(q))
      );
    }
    return items;
  }, [catalog, muscleFilter, search]);

  const showMuscleChips = MUSCLE_FILTER_BLOCKS.includes(blockType);

  return (
    <>
      <View style={s.header}>
        <Text style={s.title}>{blockLabel.toUpperCase()}</Text>
        <TouchableOpacity onPress={onClose} style={{ padding: 6 }}>
          <Ionicons name="close" size={22} color={T.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={16} color={T.textSecondary} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={`Buscar en ${discipline || 'el catálogo'}...`}
          placeholderTextColor={T.textSecondary}
          style={s.searchInput}
          returnKeyType="done"
          onSubmitEditing={() => { if (search.trim().length >= 2) onPick(search.trim()); }}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={T.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {showMuscleChips && muscleOptions.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.muscleChipsRow}
          keyboardShouldPersistTaps="handled"
        >
          {muscleOptions.map(m => {
            const active = muscleFilter === m;
            return (
              <TouchableOpacity
                key={m}
                onPress={() => setMuscleFilter(active ? null : m)}
                style={[s.muscleChip, active && s.muscleChipActive]}
                activeOpacity={0.8}
              >
                <Text style={[s.muscleChipText, active && s.muscleChipTextActive]}>
                  {MUSCLE_LABEL[m] ?? m}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 32 }}>
        {search.trim().length >= 2 && (
          <TouchableOpacity onPress={() => onPick(search.trim())} activeOpacity={0.8} style={s.customRow}>
            <Ionicons name="add-circle-outline" size={20} color={T.action} />
            <Text style={s.customRowText}>Agregar "{search.trim()}"</Text>
          </TouchableOpacity>
        )}

        {!search && !muscleFilter && recentNames.length > 0 && (
          <>
            <Text style={s.sectionLabel}>EN ESTA RUTINA</Text>
            <View style={s.recentWrap}>
              {recentNames.map(name => (
                <TouchableOpacity key={name} onPress={() => onPick(name)} activeOpacity={0.8} style={s.recentChip}>
                  <Ionicons name="repeat-outline" size={12} color={T.textSecondary} />
                  <Text style={s.recentChipText}>{name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        <Text style={s.sectionLabel}>
          {search || muscleFilter
            ? `RESULTADOS (${results.length})`
            : `CATÁLOGO DE ${discipline ? discipline.toUpperCase() : 'EJERCICIOS'}`}
        </Text>

        {results.length === 0 ? (
          <Text style={s.emptyText}>
            {search.trim().length >= 2
              ? 'Sin resultados en el catálogo — podés agregarlo igual con el botón de arriba'
              : 'No hay ejercicios del catálogo para este filtro'}
          </Text>
        ) : (
          results.map(ex => (
            <TouchableOpacity key={ex.id} onPress={() => onPick(ex.label)} activeOpacity={0.8} style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.rowName}>{ex.label}</Text>
                <Text style={s.rowMuscles}>
                  {ex.primary_muscles.map(m => MUSCLE_LABEL[m] ?? m).join(' · ')}
                </Text>
              </View>
              {(ex.tip || ex.image_url) && onHelpExercise && (
                <TouchableOpacity
                  onPress={(e) => { e.stopPropagation(); onHelpExercise(ex.label); }}
                  hitSlop={8}
                  style={{ marginRight: 8 }}
                >
                  <Ionicons name="information-circle-outline" size={17} color={T.textSecondary} />
                </TouchableOpacity>
              )}
              <Ionicons name="add" size={18} color={T.action} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </>
  );
}

function createStyles(T: ThemeTokens, actionDimBg: string) {
  return StyleSheet.create({
    header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 10 },
    title:       { color: T.textPrimary, fontSize: 13, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 2, flex: 1 },

    searchWrap:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: T.surfaceElevated, borderRadius: 10, borderWidth: 1, borderColor: T.border, marginHorizontal: 20, marginBottom: 10, paddingHorizontal: 12 },
    searchInput: { flex: 1, color: T.textPrimary, fontSize: 14, fontFamily: 'SpaceGrotesk_400Regular', paddingVertical: 11 },

    muscleChipsRow:      { paddingHorizontal: 20, gap: 8, paddingBottom: 10 },
    muscleChip:          { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: T.surfaceElevated, borderWidth: 1, borderColor: T.border },
    muscleChipActive:    { backgroundColor: actionDimBg, borderColor: T.action },
    muscleChipText:      { color: T.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk_600SemiBold' },
    muscleChipTextActive:{ color: T.action },

    customRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 20, marginBottom: 6, padding: 13, backgroundColor: T.border, borderRadius: 10, borderWidth: 1, borderColor: actionDimBg },
    customRowText: { color: T.action, fontSize: 13, fontFamily: 'SpaceGrotesk_600SemiBold' },

    sectionLabel: { color: T.textSecondary, fontSize: 9, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 2, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8 },
    recentWrap:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20 },
    recentChip:   { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 8, backgroundColor: T.border, borderWidth: 1, borderColor: T.border },
    recentChipText: { color: T.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk_600SemiBold' },

    row:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: T.surfaceElevated },
    rowName:   { color: T.textPrimary, fontSize: 14, fontFamily: 'SpaceGrotesk_600SemiBold', marginBottom: 1 },
    rowMuscles:{ color: T.textSecondary, fontSize: 10, fontFamily: 'SpaceGrotesk_400Regular' },
    emptyText: { color: T.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular', paddingHorizontal: 20, lineHeight: 18 },
  });
}

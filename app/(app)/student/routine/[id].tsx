import { useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Modal, TextInput, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useAlert } from '@/components/AppAlert';
import { Stack, useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  getRoutineById, deleteRoutine, duplicateRoutine,
  addBlock, deleteBlock, addExercise, updateExercise, deleteExercise,
  Routine, Block, Exercise, BlockType, ExerciseType,
  BLOCK_TYPES, EXERCISE_TYPES, getBlockLabel, getBlockColor, getBlockIcon,
  formatExerciseValue, CreateExerciseData,
} from '@/lib/services/routineService';
import { getPlanById } from '@/lib/services/planService';
import {
  getExercisesByDiscipline,
  Exercise as CatalogExercise,
} from '@/lib/services/exerciseService';
import { ExerciseHelpModal } from '@/components/ExerciseHelpModal';
import { ExercisePickerStep } from '@/components/ExercisePickerStep';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeTokens } from '@/constants/theme';
import { getRecommendationForRoutine, type WorkoutRecommendation } from '@/lib/services/progressionService';
import { NextStepCard } from '@/components/NextStepCard';

const DAY_NAMES = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];

// ─── Estructura recomendada por disciplina ────────────────────────────────────

const SUGGESTED_STRUCTURE: Record<string, BlockType[]> = {
  'Musculación':    ['warmup', 'main', 'accessory'],
  'Powerlifting':   ['warmup', 'main', 'accessory'],
  'Calistenia':     ['warmup', 'main', 'accessory'],
  'Running':        ['warmup', 'cardio', 'mobility'],
  'Natación':       ['warmup', 'main', 'mobility'],
  'Ciclismo':       ['warmup', 'cardio', 'mobility'],
  'HIIT':           ['warmup', 'main', 'cardio'],
  'Crossfit':       ['warmup', 'main', 'cardio'],
  'Funcional':      ['warmup', 'main', 'cardio'],
  'Yoga':           ['warmup', 'main', 'mobility'],
  'Pilates':        ['warmup', 'main', 'mobility'],
  'Boxeo':          ['warmup', 'main', 'cardio'],
  'Artes Marciales':['warmup', 'main', 'cardio'],
  default:          ['warmup', 'main'],
};

// ─── Defaults por bloque ──────────────────────────────────────────────────────

const BLOCK_DEFAULTS: Record<BlockType, { sets: number; value: number; rest: number; type: ExerciseType }> = {
  warmup:    { sets: 1, value: 10,  rest: 0,  type: 'reps' },
  main:      { sets: 4, value: 8,   rest: 90, type: 'reps' },
  accessory: { sets: 3, value: 12,  rest: 60, type: 'reps' },
  cardio:    { sets: 1, value: 600, rest: 0,  type: 'time' },
  mobility:  { sets: 1, value: 30,  rest: 0,  type: 'time' },
};

const REST_PRESETS = [
  { label: 'Sin descanso', value: 0 },
  { label: '30s', value: 30 },
  { label: '60s', value: 60 },
  { label: '90s', value: 90 },
  { label: '2min', value: 120 },
  { label: '3min', value: 180 },
];

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function RoutineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const [routine, setRoutine]           = useState<Routine | null>(null);
  const [discipline, setDiscipline]     = useState('');
  // Rutina de un plan asignado por el entrenador: solo lectura + entrenar
  const [isAssigned, setIsAssigned]     = useState(false);
  const [isLoading, setIsLoading]       = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [isSaving, setIsSaving]         = useState(false);
  const [catalog, setCatalog]           = useState<CatalogExercise[]>([]);
  const [recommendation, setRecommendation] = useState<WorkoutRecommendation | null>(null);

  // Block modal
  const [showBlockModal, setShowBlockModal] = useState(false);

  // Exercise help modal
  const [helpExercise, setHelpExercise] = useState<string | null>(null);

  // Exercise modal state
  const [showExModal, setShowExModal]       = useState(false);
  const [exModalStep, setExModalStep]       = useState<'pick' | 'config'>('pick');
  const [selectedBlock, setSelectedBlock]   = useState<Block | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

  // Exercise form
  const [exName, setExName]         = useState('');
  const [exType, setExType]         = useState<ExerciseType>('reps');
  const [exSets, setExSets]         = useState(3);
  const [exValue, setExValue]       = useState(10);
  const [exRest, setExRest]         = useState(60);
  const [exWeight, setExWeight]     = useState(0); // 0 = sin peso registrado
  const [exNotes, setExNotes]       = useState('');

  const { T, activeTheme } = useTheme();
  const actionDimBg = activeTheme === 'dark' ? '#00566a' : '#e0f7fa';
  const s = useMemo(() => createStyles(T, actionDimBg), [T, actionDimBg]);

  useFocusEffect(useCallback(() => { loadRoutine(); }, [id]));

  const loadRoutine = async () => {
    if (!id) return;
    setIsLoading(true);
    const { routine: data, error: err } = await getRoutineById(id);
    if (err || !data) { setError(err?.message ?? 'Error'); setIsLoading(false); return; }
    setRoutine(data);
    // Fetch plan discipline
    const { plan } = await getPlanById(data.plan_id);
    if (plan) {
      setDiscipline(plan.discipline);
      setIsAssigned(plan.trainer_id != null);
      const { exercises } = await getExercisesByDiscipline(plan.discipline);
      setCatalog(exercises);
    }
    if (user?.id && id) {
      const { recommendation: rec } = await getRecommendationForRoutine(user.id, id);
      setRecommendation(rec);
    } else {
      setRecommendation(null);
    }
    setIsLoading(false);
  };

  // ── Block actions ──────────────────────────────────────────────────────────

  const handleAddBlock = async (blockType: BlockType) => {
    if (!id) return;
    setIsSaving(true);
    const { block, error: err } = await addBlock(id, blockType);
    setIsSaving(false);
    setShowBlockModal(false);
    if (err) { showAlert('Error', err.message); return; }
    if (block && routine) setRoutine({ ...routine, blocks: [...(routine.blocks || []), block] });
  };

  const handleCreateStructure = async () => {
    if (!id || !routine) return;
    setIsSaving(true);
    const types = SUGGESTED_STRUCTURE[discipline] ?? SUGGESTED_STRUCTURE.default;
    let updated = { ...routine, blocks: [...(routine.blocks || [])] };
    for (const blockType of types) {
      const { block } = await addBlock(id, blockType);
      if (block) updated = { ...updated, blocks: [...updated.blocks!, block] };
    }
    setRoutine(updated);
    setIsSaving(false);
  };

  const handleDeleteBlock = (block: Block) => {
    showAlert('Eliminar bloque', `¿Eliminar "${getBlockLabel(block.block_type)}" y sus ejercicios?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        const { success, error: err } = await deleteBlock(block.id);
        if (err || !success) { showAlert('Error', err?.message ?? 'Error'); return; }
        if (routine) setRoutine({ ...routine, blocks: routine.blocks?.filter(b => b.id !== block.id) || [] });
      }},
    ]);
  };

  // ── Exercise modal ─────────────────────────────────────────────────────────

  const openPickerForBlock = (block: Block) => {
    setSelectedBlock(block);
    setSelectedExercise(null);
    const defaults = BLOCK_DEFAULTS[block.block_type];
    setExType(defaults.type);
    setExSets(defaults.sets);
    setExValue(defaults.value);
    setExRest(defaults.rest);
    setExWeight(0);
    setExName('');
    setExNotes('');
    setExModalStep('pick');
    setShowExModal(true);
  };

  const openEditorForExercise = (block: Block, exercise: Exercise) => {
    setSelectedBlock(block);
    setSelectedExercise(exercise);
    setExName(exercise.name);
    setExType(exercise.exercise_type);
    setExSets(exercise.sets);
    setExValue(exercise.value);
    setExRest(exercise.rest_seconds);
    setExWeight(exercise.target_weight_kg ?? 0);
    setExNotes(exercise.notes || '');
    setExModalStep('config');
    setShowExModal(true);
  };

  const handlePickSuggestion = (name: string) => {
    setExName(name);
    setExModalStep('config');
  };

  const handleSaveExercise = async () => {
    if (!selectedBlock || exName.trim().length < 2) {
      showAlert('Error', 'Ingresá un nombre de al menos 2 caracteres');
      return;
    }
    const data: CreateExerciseData = {
      name: exName.trim(),
      exercise_type: exType,
      sets: exSets,
      value: exValue,
      rest_seconds: exRest,
      target_weight_kg: exType === 'reps' && exWeight > 0 ? exWeight : null,
      notes: exNotes.trim() || undefined,
    };
    setIsSaving(true);
    if (selectedExercise) {
      const { exercise, error: err } = await updateExercise(selectedExercise.id, data);
      setIsSaving(false);
      if (err) { showAlert('Error', err.message); return; }
      if (exercise && routine) {
        setRoutine({ ...routine, blocks: routine.blocks?.map(b =>
          b.id === selectedBlock.id
            ? { ...b, exercises: b.exercises.map(e => e.id === exercise.id ? exercise : e) }
            : b
        ) || [] });
      }
    } else {
      const { exercise, error: err } = await addExercise(selectedBlock.id, data);
      setIsSaving(false);
      if (err) { showAlert('Error', err.message); return; }
      if (exercise && routine) {
        setRoutine({ ...routine, blocks: routine.blocks?.map(b =>
          b.id === selectedBlock.id
            ? { ...b, exercises: [...b.exercises, exercise] }
            : b
        ) || [] });
      }
    }
    setShowExModal(false);
  };

  const handleDeleteExercise = (exercise: Exercise) => {
    showAlert('Eliminar ejercicio', `¿Eliminar "${exercise.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        const { success, error: err } = await deleteExercise(exercise.id);
        if (err || !success) { showAlert('Error', err?.message ?? 'Error'); return; }
        if (routine) setRoutine({ ...routine, blocks: routine.blocks?.map(b => ({
          ...b, exercises: b.exercises.filter(e => e.id !== exercise.id),
        })) || [] });
        setShowExModal(false);
      }},
    ]);
  };

  // ── Routine actions ────────────────────────────────────────────────────────

  const handleDuplicate = () => {
    showAlert('Duplicar rutina', `Se creará una copia de "${routine?.name}".`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Duplicar', onPress: async () => {
        if (!id) return;
        const { routine: copy, error: err } = await duplicateRoutine(id);
        if (err || !copy) { showAlert('Error', err?.message || 'No se pudo duplicar'); return; }
        showAlert('Listo', `Se creó "${copy.name}"`);
      }},
    ]);
  };

  const handleDelete = () => {
    showAlert('Eliminar rutina', '¿Seguro? Se eliminarán todos los bloques y ejercicios.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        if (!id) return;
        const { success, error: err } = await deleteRoutine(id);
        if (err || !success) { showAlert('Error', err?.message || 'Error'); return; }
        router.navigate(`/student/plan/${routine?.plan_id}`);
      }},
    ]);
  };

  const handleStartWorkout = () => {
    const hasExercises = routine?.blocks?.some(b => b.exercises.length > 0);
    if (!hasExercises) {
      showAlert('Sin ejercicios', 'Agregá al menos un ejercicio para poder entrenar.');
      return;
    }
    router.push(`/student/workout/${id}`);
  };

  // ── Helpers ────────────────────────────────────────────────────────────────

  const valueLabel = (type: ExerciseType) =>
    type === 'reps' ? 'REPS' : type === 'time' ? 'SEG' : 'MTS';

  const clampSets  = (v: number) => Math.min(10, Math.max(1, v));
  const clampValue = (v: number, type: ExerciseType) => {
    if (type === 'reps')     return Math.min(50, Math.max(1, v));
    if (type === 'time')     return Math.min(600, Math.max(5, v));
    return Math.min(5000, Math.max(10, v));
  };
  const stepValue  = (type: ExerciseType) => type === 'reps' ? 1 : type === 'time' ? 5 : 10;

  const recentNames = useMemo(() => {
    const names = new Set<string>();
    for (const b of routine?.blocks ?? []) for (const e of b.exercises) names.add(e.name);
    return [...names];
  }, [routine]);

  const hasExercises = routine?.blocks?.some(b => b.exercises.length > 0) ?? false;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <Stack.Screen options={{
        title: routine?.name ?? 'RUTINA',
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.navigate(`/student/plan/${routine?.plan_id}`)} style={{ marginLeft: 4, padding: 4 }}>
            <Ionicons name="chevron-back" size={24} color={T.action} />
          </TouchableOpacity>
        ),
        headerRight: () => (
          isAssigned ? null : (
            <View style={{ flexDirection: 'row', gap: 4, marginRight: 4 }}>
              <TouchableOpacity onPress={handleDuplicate} style={{ padding: 6 }}>
                <Ionicons name="copy-outline" size={20} color={T.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDelete} style={{ padding: 6 }}>
                <Ionicons name="trash-outline" size={20} color="#f87171" />
              </TouchableOpacity>
            </View>
          )
        ),
      }} />

      <View style={s.safe}>
        <LinearGradient colors={['transparent', T.action, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.topLine} />

        {isLoading ? (
          <View style={s.center}><ActivityIndicator size="large" color={T.action} /></View>
        ) : error || !routine ? (
          <View style={s.center}>
            <Ionicons name="alert-circle-outline" size={48} color="#f87171" />
            <Text style={s.errorText}>{error ?? 'Rutina no encontrada'}</Text>
          </View>
        ) : (
          <>
            <ScrollView contentContainerStyle={s.scroll}>

              {/* Info card */}
              <View style={s.infoCard}>
                <View style={s.infoLeft}>
                  <View style={s.dayBadge}>
                    <Text style={s.dayNum}>{routine.day_number}</Text>
                    <Text style={s.dayLabel}>DÍA</Text>
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.routineName}>{routine.name}</Text>
                  <Text style={s.routineSub}>{DAY_NAMES[(routine.day_number - 1) % 7]}</Text>
                  {routine.notes ? <Text style={s.routineNotes}>{routine.notes}</Text> : null}
                </View>
              </View>

              {recommendation && (
                <NextStepCard recommendation={recommendation} compact />
              )}

              {/* Blocks section */}
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>BLOQUES</Text>
                {!isAssigned && (
                  <TouchableOpacity onPress={() => setShowBlockModal(true)} style={s.addBlockBtn} activeOpacity={0.8}>
                    <Ionicons name="add" size={16} color={T.action} />
                    <Text style={s.addBlockText}>AGREGAR</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Empty blocks state */}
              {(!routine.blocks || routine.blocks.length === 0) && isAssigned && (
                <View style={s.emptyCard}>
                  <Ionicons name="hourglass-outline" size={36} color={T.textSecondary} style={{ marginBottom: 12 }} />
                  <Text style={s.emptyTitle}>Rutina en preparación</Text>
                  <Text style={s.emptyText}>Tu entrenador todavía no cargó los ejercicios de esta rutina.</Text>
                </View>
              )}

              {(!routine.blocks || routine.blocks.length === 0) && !isAssigned && (
                <View style={s.emptyCard}>
                  <Ionicons name="layers-outline" size={36} color={T.textSecondary} style={{ marginBottom: 12 }} />
                  <Text style={s.emptyTitle}>Sin bloques todavía</Text>
                  <Text style={s.emptyText}>Los bloques organizan tu rutina en secciones (calentamiento, principal, etc.)</Text>

                  {isSaving ? (
                    <ActivityIndicator color={T.action} style={{ marginTop: 20 }} />
                  ) : (
                    <TouchableOpacity onPress={handleCreateStructure} activeOpacity={0.85} style={s.structureBtn}>
                      <LinearGradient colors={[actionDimBg, '#003d4d']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.structureBtnGrad}>
                        <Ionicons name="sparkles-outline" size={16} color={T.action} />
                        <Text style={s.structureBtnText}>ESTRUCTURA RECOMENDADA</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  )}

                  <Text style={s.structureHint}>
                    {discipline
                      ? `Para ${discipline}: ${(SUGGESTED_STRUCTURE[discipline] ?? SUGGESTED_STRUCTURE.default).map(getBlockLabel).join(' + ')}`
                      : 'Calentamiento + Principal'}
                  </Text>
                </View>
              )}

              {/* Block list */}
              {routine.blocks?.map(block => {
                const color = getBlockColor(block.block_type);
                return (
                  <View key={block.id} style={[s.blockCard, { borderLeftColor: color }]}>
                    {/* Block header */}
                    <View style={s.blockHeader}>
                      <View style={[s.blockIconWrap, { backgroundColor: color + '22' }]}>
                        <Ionicons name={getBlockIcon(block.block_type) as any} size={17} color={color} />
                      </View>
                      <Text style={[s.blockLabel, { color }]}>{getBlockLabel(block.block_type)}</Text>
                      <Text style={s.blockCount}>{block.exercises.length} ej.</Text>
                      {!isAssigned && (
                        <>
                          <TouchableOpacity onPress={() => openPickerForBlock(block)} style={s.blockAddBtn} activeOpacity={0.7}>
                            <Ionicons name="add-circle" size={22} color={T.action} />
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => handleDeleteBlock(block)} style={{ padding: 4 }} activeOpacity={0.7}>
                            <Ionicons name="trash-outline" size={17} color="#f87171" />
                          </TouchableOpacity>
                        </>
                      )}
                    </View>

                    {/* Exercises */}
                    {block.exercises.length === 0 ? (
                      isAssigned ? (
                        <View style={s.emptyExRow}>
                          <Text style={s.emptyExText}>Sin ejercicios en este bloque</Text>
                        </View>
                      ) : (
                        <TouchableOpacity onPress={() => openPickerForBlock(block)} style={s.emptyExRow} activeOpacity={0.7}>
                          <Ionicons name="add-circle-outline" size={16} color={T.textSecondary} />
                          <Text style={s.emptyExText}>Agregá el primer ejercicio</Text>
                        </TouchableOpacity>
                      )
                    ) : (
                      block.exercises.map((ex, idx) => (
                        <TouchableOpacity
                          key={ex.id}
                          onPress={() => isAssigned ? setHelpExercise(ex.name) : openEditorForExercise(block, ex)}
                          activeOpacity={0.8}
                          style={[s.exRow, idx < block.exercises.length - 1 && s.exRowBorder]}
                        >
                          <View style={[s.exNumBadge, { backgroundColor: color + '22' }]}>
                            <Text style={[s.exNum, { color }]}>{idx + 1}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={s.exName}>{ex.name}</Text>
                            <Text style={s.exMeta}>
                              {ex.sets} series × {formatExerciseValue(ex.exercise_type, ex.value)}
                              {ex.rest_seconds > 0 ? ` · ${ex.rest_seconds}s desc.` : ''}
                            </Text>
                          </View>
                          <TouchableOpacity
                            onPress={(e) => { e.stopPropagation(); setHelpExercise(ex.name); }}
                            hitSlop={10}
                            style={{ marginRight: 6 }}
                          >
                            <Ionicons name="information-circle-outline" size={18} color={T.textSecondary} />
                          </TouchableOpacity>
                          <Ionicons name="chevron-forward" size={16} color={T.border} />
                        </TouchableOpacity>
                      ))
                    )}
                  </View>
                );
              })}

              <View style={{ height: hasExercises ? 100 : 32 }} />
            </ScrollView>

            {/* Start workout FAB */}
            {hasExercises && (
              <View style={s.fab}>
                <TouchableOpacity onPress={handleStartWorkout} activeOpacity={0.9} style={s.fabBtn}>
                  <LinearGradient colors={['#1a4d2e', '#14532d']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.fabGrad}>
                    <Ionicons name="play" size={20} color={T.done} />
                    <Text style={s.fabText}>INICIAR ENTRENAMIENTO</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </View>

      {/* ── Block type modal ──────────────────────────────────────────────── */}
      <Modal visible={showBlockModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowBlockModal(false)}>
        <View style={s.modalSafe}>
          <View style={s.modalHandle} />
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>AGREGAR BLOQUE</Text>
            <TouchableOpacity onPress={() => setShowBlockModal(false)} style={{ padding: 6 }}>
              <Ionicons name="close" size={22} color={T.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20, gap: 10 }}>
            {BLOCK_TYPES.map(type => (
              <TouchableOpacity key={type.value} onPress={() => handleAddBlock(type.value)} disabled={isSaving} activeOpacity={0.85} style={s.blockTypeRow}>
                <View style={[s.blockTypeIcon, { backgroundColor: type.color + '22' }]}>
                  <Ionicons name={type.icon as any} size={22} color={type.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.blockTypeName}>{type.label}</Text>
                </View>
                <Ionicons name="add-circle-outline" size={22} color={type.color} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* ── Exercise modal ────────────────────────────────────────────────── */}
      <Modal visible={showExModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowExModal(false)}>
        <KeyboardAvoidingView style={s.modalSafe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={s.modalHandle} />

          {exModalStep === 'pick' && selectedBlock ? (
            <ExercisePickerStep
              catalog={catalog}
              discipline={discipline}
              blockType={selectedBlock.block_type}
              blockLabel={getBlockLabel(selectedBlock.block_type)}
              recentNames={recentNames}
              onPick={handlePickSuggestion}
              onClose={() => setShowExModal(false)}
              onHelpExercise={setHelpExercise}
            />
          ) : exModalStep === 'config' ? (
            /* Step 2: Config */
            <>
              <View style={s.modalHeader}>
                <TouchableOpacity onPress={() => !selectedExercise && setExModalStep('pick')} style={{ padding: 6 }}>
                  {!selectedExercise
                    ? <Ionicons name="chevron-back" size={22} color={T.action} />
                    : <View style={{ width: 22 }} />
                  }
                </TouchableOpacity>
                <Text style={s.modalTitle} numberOfLines={1}>{exName}</Text>
                <TouchableOpacity onPress={() => setShowExModal(false)} style={{ padding: 6 }}>
                  <Ionicons name="close" size={22} color={T.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.configScroll}>
                {/* Name (editable) */}
                <Text style={s.configLabel}>NOMBRE</Text>
                <View style={s.nameInputWrap}>
                  <TextInput
                    value={exName}
                    onChangeText={setExName}
                    style={s.nameInput}
                    placeholderTextColor={T.textSecondary}
                    placeholder="Nombre del ejercicio"
                  />
                </View>

                {/* Type */}
                <Text style={s.configLabel}>TIPO</Text>
                <View style={s.typeRow}>
                  {EXERCISE_TYPES.map(t => (
                    <TouchableOpacity
                      key={t.value}
                      onPress={() => {
                        setExType(t.value);
                        setExValue(t.value === 'reps' ? 10 : t.value === 'time' ? 30 : 100);
                      }}
                      activeOpacity={0.8}
                      style={[s.typeChip, exType === t.value && s.typeChipActive]}
                    >
                      <Text style={[s.typeChipText, exType === t.value && s.typeChipTextActive]}>{t.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Sets + Value steppers */}
                <View style={s.steppersRow}>
                  <View style={s.stepperBlock}>
                    <Text style={s.configLabel}>SERIES</Text>
                    <Stepper
                      value={exSets}
                      onDec={() => setExSets(clampSets(exSets - 1))}
                      onInc={() => setExSets(clampSets(exSets + 1))}
                    />
                  </View>
                  <View style={s.stepperBlock}>
                    <Text style={s.configLabel}>{valueLabel(exType)}</Text>
                    <Stepper
                      value={exValue}
                      onDec={() => setExValue(clampValue(exValue - stepValue(exType), exType))}
                      onInc={() => setExValue(clampValue(exValue + stepValue(exType), exType))}
                    />
                  </View>
                </View>

                {/* Peso objetivo (opcional, solo para reps) */}
                {exType === 'reps' && (
                  <>
                    <Text style={s.configLabel}>PESO (KG) — OPCIONAL</Text>
                    <Stepper
                      value={exWeight}
                      onDec={() => setExWeight(Math.max(0, exWeight - 2.5))}
                      onInc={() => setExWeight(Math.min(500, exWeight + 2.5))}
                    />
                  </>
                )}

                {/* Rest presets */}
                <Text style={s.configLabel}>DESCANSO</Text>
                <View style={s.restRow}>
                  {REST_PRESETS.map(p => (
                    <TouchableOpacity
                      key={p.value}
                      onPress={() => setExRest(p.value)}
                      activeOpacity={0.8}
                      style={[s.restChip, exRest === p.value && s.restChipActive]}
                    >
                      <Text style={[s.restChipText, exRest === p.value && s.restChipTextActive]}>{p.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Notes */}
                <Text style={s.configLabel}>NOTAS (OPCIONAL)</Text>
                <TextInput
                  value={exNotes}
                  onChangeText={setExNotes}
                  placeholder="Ej: Mantener codos a 45°"
                  placeholderTextColor={T.textSecondary}
                  style={s.notesInput}
                  multiline
                />

                {/* Save */}
                <TouchableOpacity onPress={handleSaveExercise} disabled={isSaving} activeOpacity={0.85} style={s.saveBtn}>
                  {!isSaving ? (
                    <LinearGradient colors={[actionDimBg, '#003d4d']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.saveBtnGrad}>
                      <Text style={s.saveBtnText}>{selectedExercise ? 'GUARDAR CAMBIOS' : 'AGREGAR EJERCICIO'}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={[s.saveBtnGrad, { backgroundColor: T.border }]}>
                      <ActivityIndicator color={T.action} />
                    </View>
                  )}
                </TouchableOpacity>

                {selectedExercise && (
                  <TouchableOpacity onPress={() => handleDeleteExercise(selectedExercise)} style={s.deleteExBtn}>
                    <Text style={s.deleteExText}>Eliminar ejercicio</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </>
          ) : null}
        </KeyboardAvoidingView>
      </Modal>

      <ExerciseHelpModal
        exerciseName={helpExercise}
        onClose={() => setHelpExercise(null)}
      />
    </>
  );
}

// ─── Stepper component ────────────────────────────────────────────────────────

function Stepper({ value, onDec, onInc }: { value: number; onDec: () => void; onInc: () => void }) {
  const { T, activeTheme } = useTheme();
  const actionDimBg = activeTheme === 'dark' ? '#00566a' : '#e0f7fa';
  const s = useMemo(() => createStyles(T, actionDimBg), [T, actionDimBg]);
  return (
    <View style={s.stepper}>
      <TouchableOpacity onPress={onDec} style={s.stepBtn} activeOpacity={0.7}>
        <Ionicons name="remove" size={20} color={T.action} />
      </TouchableOpacity>
      <Text style={s.stepValue}>{value}</Text>
      <TouchableOpacity onPress={onInc} style={s.stepBtn} activeOpacity={0.7}>
        <Ionicons name="add" size={20} color={T.action} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function createStyles(T: ThemeTokens, actionDimBg: string) {
  return StyleSheet.create({
    safe:    { flex: 1, backgroundColor: T.surface },
    topLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, opacity: 0.4, zIndex: 10 },
    scroll:  { padding: 20 },
    center:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },

    errorText: { color: T.textSecondary, fontFamily: 'SpaceGrotesk_400Regular', textAlign: 'center', marginTop: 12 },

    // Info card
    infoCard:    { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: T.surfaceElevated, borderRadius: 14, borderWidth: 1, borderColor: T.border, padding: 16, marginBottom: 20, gap: 14 },
    infoLeft:    {},
    dayBadge:    { width: 48, height: 48, borderRadius: 12, backgroundColor: actionDimBg, alignItems: 'center', justifyContent: 'center' },
    dayNum:      { color: T.action, fontSize: 20, fontFamily: 'SpaceGrotesk_700Bold', lineHeight: 22 },
    dayLabel:    { color: T.action, fontSize: 8, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1, opacity: 0.7 },
    routineName: { color: T.textPrimary, fontSize: 16, fontFamily: 'SpaceGrotesk_700Bold', marginBottom: 2 },
    routineSub:  { color: T.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular' },
    routineNotes:{ color: T.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular', marginTop: 6, fontStyle: 'italic' },

    // Section header
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
    sectionTitle:  { color: T.textSecondary, fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 3 },
    addBlockBtn:   { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: actionDimBg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
    addBlockText:  { color: T.action, fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1 },

    // Empty blocks
    emptyCard:       { backgroundColor: T.surfaceElevated, borderRadius: 16, borderWidth: 1, borderColor: T.border, padding: 28, alignItems: 'center', marginBottom: 16 },
    emptyTitle:      { color: T.textPrimary, fontSize: 16, fontFamily: 'SpaceGrotesk_700Bold', marginBottom: 8 },
    emptyText:       { color: T.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular', textAlign: 'center', lineHeight: 19, marginBottom: 4 },
    structureBtn:    { width: '100%', borderRadius: 12, overflow: 'hidden', marginTop: 16, marginBottom: 12 },
    structureBtnGrad:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
    structureBtnText:{ color: T.action, fontSize: 12, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1 },
    structureHint:   { color: T.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular', textAlign: 'center' },

    // Block card
    blockCard:     { backgroundColor: T.surfaceElevated, borderRadius: 12, borderWidth: 1, borderColor: T.border, borderLeftWidth: 3, marginBottom: 12, overflow: 'hidden' },
    blockHeader:   { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10, borderBottomWidth: 1, borderBottomColor: T.border },
    blockIconWrap: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    blockLabel:    { flex: 1, fontSize: 11, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1 },
    blockCount:    { color: T.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular' },
    blockAddBtn:   { padding: 4 },

    emptyExRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14 },
    emptyExText: { color: T.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular', fontStyle: 'italic' },

    // Exercise row
    exRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
    exRowBorder: { borderBottomWidth: 1, borderBottomColor: T.border },
    exNumBadge:  { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    exNum:       { fontSize: 12, fontFamily: 'SpaceGrotesk_700Bold' },
    exName:      { color: T.textPrimary, fontSize: 14, fontFamily: 'SpaceGrotesk_600SemiBold', marginBottom: 2 },
    exMeta:      { color: T.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular' },

    // FAB
    fab:     { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 24, backgroundColor: T.surface + 'ee' },
    fabBtn:  { borderRadius: 14, overflow: 'hidden' },
    fabGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
    fabText: { color: T.done, fontSize: 14, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1.5 },

    // Modal base
    modalSafe:   { flex: 1, backgroundColor: T.surface },
    modalHandle: { width: 40, height: 4, backgroundColor: T.border, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: T.border },
    modalTitle:  { color: T.textPrimary, fontSize: 13, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1.5, flex: 1, textAlign: 'center' },

    // Block type modal
    blockTypeRow:  { flexDirection: 'row', alignItems: 'center', backgroundColor: T.surfaceElevated, borderRadius: 12, borderWidth: 1, borderColor: T.border, padding: 14, gap: 14 },
    blockTypeIcon: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    blockTypeName: { color: T.textPrimary, fontSize: 15, fontFamily: 'SpaceGrotesk_600SemiBold' },

    // Exercise config
    configScroll:  { padding: 20, paddingBottom: 48 },
    configLabel:   { color: T.textSecondary, fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 2, marginBottom: 8, marginTop: 20 },

    nameInputWrap: { backgroundColor: T.surfaceElevated, borderRadius: 12, borderWidth: 1, borderColor: T.border, paddingHorizontal: 16 },
    nameInput:     { color: T.textPrimary, fontSize: 16, fontFamily: 'SpaceGrotesk_600SemiBold', paddingVertical: 14 },

    typeRow:          { flexDirection: 'row', gap: 8 },
    typeChip:         { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: T.border, backgroundColor: T.surfaceElevated, alignItems: 'center' },
    typeChipActive:   { borderColor: T.action, backgroundColor: actionDimBg },
    typeChipText:     { color: T.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk_600SemiBold' },
    typeChipTextActive:{ color: T.action },

    steppersRow:  { flexDirection: 'row', gap: 12 },
    stepperBlock: { flex: 1 },

    stepper:   { flexDirection: 'row', alignItems: 'center', backgroundColor: T.surfaceElevated, borderRadius: 12, borderWidth: 1, borderColor: T.border, overflow: 'hidden' },
    stepBtn:   { padding: 14, backgroundColor: T.border },
    stepValue: { flex: 1, textAlign: 'center', color: T.textPrimary, fontSize: 22, fontFamily: 'SpaceGrotesk_700Bold' },

    restRow:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    restChip:         { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: T.border, backgroundColor: T.surfaceElevated },
    restChipActive:   { borderColor: T.action, backgroundColor: actionDimBg },
    restChipText:     { color: T.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk_600SemiBold' },
    restChipTextActive:{ color: T.action },

    notesInput: { backgroundColor: T.surfaceElevated, borderRadius: 12, borderWidth: 1, borderColor: T.border, color: T.textPrimary, fontSize: 14, fontFamily: 'SpaceGrotesk_400Regular', padding: 14, minHeight: 80, textAlignVertical: 'top' },

    saveBtn:     { borderRadius: 14, overflow: 'hidden', marginTop: 24 },
    saveBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
    saveBtnText: { color: T.action, fontSize: 14, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1.5 },

    deleteExBtn:  { paddingVertical: 16, alignItems: 'center' },
    deleteExText: { color: '#f87171', fontSize: 13, fontFamily: 'SpaceGrotesk_600SemiBold' },
  });
}

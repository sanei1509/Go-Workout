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
import { getPlanById, Plan } from '@/lib/services/planService';
import {
  getExercisesByDiscipline,
  Exercise as CatalogExercise,
} from '@/lib/services/exerciseService';
import type { MuscleGroup } from '@/lib/exercises/catalog';
import { getTrainerStudents, getStudentForm, StudentForm } from '@/lib/services/trainerService';
import { getAgentBackend } from '@/lib/agent/backend';
import type { RoutineProposal, ProposedBlock } from '@/lib/agent/types';
import { useAuth } from '@/contexts/AuthContext';
import { ExerciseHelpModal } from '@/components/ExerciseHelpModal';

// ─── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg:         '#090f12',
  card:       '#141c1f',
  cardDeep:   '#1a2123',
  border:     '#3c494e',
  primary:    '#00D1FF',
  primaryDim: '#00566a',
  tertiary:   '#FEB127',
  neutral:    '#71787B',
  textHi:     '#dde3e7',
  textLo:     '#859399',
  green:      '#4ade80',
  ai:         '#a78bfa',
};

const DAY_NAMES = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];

const MUSCLE_LABEL: Record<MuscleGroup, string> = {
  chest: 'Pecho', back: 'Espalda', traps: 'Trapecios', shoulders: 'Hombros',
  biceps: 'Bíceps', triceps: 'Tríceps', forearms: 'Antebrazos', core: 'Core',
  glutes: 'Glúteos', quads: 'Cuádriceps', hamstrings: 'Isquios', calves: 'Gemelos',
};

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

// Bloques donde el filtro por músculo tiene sentido
const MUSCLE_FILTER_BLOCKS: BlockType[] = ['main', 'accessory'];

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function TrainerRoutineEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const [routine, setRoutine]           = useState<Routine | null>(null);
  const [plan, setPlan]                 = useState<Plan | null>(null);
  const [isLoading, setIsLoading]       = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [isSaving, setIsSaving]         = useState(false);

  // Catálogo DB por disciplina (se carga una vez por rutina)
  const [catalog, setCatalog]           = useState<CatalogExercise[]>([]);

  // Block modal
  const [showBlockModal, setShowBlockModal] = useState(false);

  // Exercise help modal
  const [helpExercise, setHelpExercise] = useState<string | null>(null);

  // Exercise modal state
  const [showExModal, setShowExModal]       = useState(false);
  const [exModalStep, setExModalStep]       = useState<'pick' | 'config'>('pick');
  const [selectedBlock, setSelectedBlock]   = useState<Block | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [muscleFilter, setMuscleFilter]     = useState<MuscleGroup | null>(null);

  // Exercise form
  const [exName, setExName]         = useState('');
  const [exSearch, setExSearch]     = useState('');
  const [exType, setExType]         = useState<ExerciseType>('reps');
  const [exSets, setExSets]         = useState(3);
  const [exValue, setExValue]       = useState(10);
  const [exRest, setExRest]         = useState(60);
  const [exNotes, setExNotes]       = useState('');

  // IA draft modal
  const [showAiModal, setShowAiModal]   = useState(false);
  const [aiObjective, setAiObjective]   = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  useFocusEffect(useCallback(() => { loadRoutine(); }, [id]));

  const loadRoutine = async () => {
    if (!id) return;
    setIsLoading(true);
    const { routine: data, error: err } = await getRoutineById(id);
    if (err || !data) { setError(err?.message ?? 'Error'); setIsLoading(false); return; }
    setRoutine(data);
    const { plan: p } = await getPlanById(data.plan_id);
    if (p) {
      setPlan(p);
      // Catálogo de la disciplina del plan, desde la DB
      const { exercises } = await getExercisesByDiscipline(p.discipline);
      setCatalog(exercises);
    }
    setIsLoading(false);
  };

  const discipline = plan?.discipline ?? '';

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

  // ── Generación con IA ──────────────────────────────────────────────────────

  const openAiModal = async () => {
    // Prellenar el objetivo con contexto del alumno (formulario si existe)
    let prefill = `Rutina "${routine?.name}" (día ${routine?.day_number}) de ${discipline}.`;
    if (user?.id && plan) {
      const { students } = await getTrainerStudents(user.id);
      const st = students.find(x => x.student_id === plan.user_id);
      if (st) {
        const { form } = await getStudentForm(st.invitation_id);
        const facts = buildStudentFacts(form);
        if (facts) prefill += ` Alumno: ${facts}.`;
      }
    }
    setAiObjective(prefill);
    setShowAiModal(true);
  };

  const handleGenerate = async () => {
    if (!routine || !plan || isGenerating) return;
    setIsGenerating(true);
    try {
      const backend = getAgentBackend();
      const today = new Date();
      const dayNames = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
      const response = await backend.send({
        messages: [{
          id: `ai-draft-${Date.now()}`,
          createdAt: new Date().toISOString(),
          role: 'user',
          text:
            `Armá una rutina completa con bloques y ejercicios usando propose_routine, sin preguntarme nada. ` +
            `Es para el día ${routine.day_number} del plan "${plan.name}" (${discipline}). ` +
            `Objetivo y contexto: ${aiObjective.trim() || 'rutina equilibrada para este día'}`,
        }],
        context: {
          userId: plan.user_id,
          today: {
            dayNumber: ((today.getDay() + 6) % 7) + 1,
            dayName: dayNames[today.getDay()],
            date: today.toISOString().slice(0, 10),
          },
          activePlans: [{
            id: plan.id,
            name: plan.name,
            discipline: plan.discipline,
            training_days: plan.training_days ?? [],
            routines: [],
          }],
        },
      });

      const proposal = response.proposals.find(p => p.kind === 'routine') as RoutineProposal | undefined;
      if (!proposal) {
        showAlert('Sin propuesta', response.text || 'El asistente no generó una rutina. Probá describir mejor el objetivo.');
        return;
      }

      // Materializar los bloques propuestos DENTRO de esta rutina
      const { error: applyError } = await applyProposalBlocks(routine.id, proposal.blocks);
      if (applyError) {
        showAlert('Error', applyError.message);
      }
      setShowAiModal(false);
      await loadRoutine();
    } catch (e) {
      showAlert('Error', e instanceof Error ? e.message : 'No se pudo contactar al asistente');
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Exercise modal ─────────────────────────────────────────────────────────

  const openPickerForBlock = (block: Block) => {
    setSelectedBlock(block);
    setSelectedExercise(null);
    setExSearch('');
    setMuscleFilter(null);
    const defaults = BLOCK_DEFAULTS[block.block_type];
    setExType(defaults.type);
    setExSets(defaults.sets);
    setExValue(defaults.value);
    setExRest(defaults.rest);
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
        router.navigate(`/trainer/plan/${routine?.plan_id}`);
      }},
    ]);
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

  // Grupos musculares presentes en el catálogo cargado (para los chips)
  const muscleOptions = useMemo(() => {
    const set = new Set<MuscleGroup>();
    for (const ex of catalog) for (const m of ex.primary_muscles) set.add(m);
    return [...set];
  }, [catalog]);

  // Ejercicios ya usados en esta rutina (re-agregar rápido en otro bloque)
  const recentNames = useMemo(() => {
    const names = new Set<string>();
    for (const b of routine?.blocks ?? []) for (const e of b.exercises) names.add(e.name);
    return [...names];
  }, [routine]);

  // Resultados del picker: catálogo DB filtrado por búsqueda + músculo
  const pickerResults = useMemo(() => {
    let items = catalog;
    if (muscleFilter) items = items.filter(ex => ex.primary_muscles.includes(muscleFilter));
    const q = exSearch.trim().toLowerCase();
    if (q) {
      items = items.filter(ex =>
        ex.label.toLowerCase().includes(q) || ex.aliases.some(a => a.includes(q))
      );
    }
    return items;
  }, [catalog, muscleFilter, exSearch]);

  const showMuscleChips = selectedBlock
    ? MUSCLE_FILTER_BLOCKS.includes(selectedBlock.block_type)
    : false;

  const hasBlocks = (routine?.blocks?.length ?? 0) > 0;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <Stack.Screen options={{
        title: routine?.name ?? 'RUTINA',
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.navigate(`/trainer/plan/${routine?.plan_id}`)} style={{ marginLeft: 4, padding: 4 }}>
            <Ionicons name="chevron-back" size={24} color={C.primary} />
          </TouchableOpacity>
        ),
        headerRight: () => (
          <View style={{ flexDirection: 'row', gap: 4, marginRight: 4 }}>
            <TouchableOpacity onPress={openAiModal} style={{ padding: 6 }}>
              <Ionicons name="sparkles-outline" size={20} color={C.ai} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDuplicate} style={{ padding: 6 }}>
              <Ionicons name="copy-outline" size={20} color={C.neutral} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete} style={{ padding: 6 }}>
              <Ionicons name="trash-outline" size={20} color="#f87171" />
            </TouchableOpacity>
          </View>
        ),
      }} />

      <View style={s.safe}>
        <LinearGradient colors={['transparent', C.primary, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.topLine} />

        {isLoading ? (
          <View style={s.center}><ActivityIndicator size="large" color={C.primary} /></View>
        ) : error || !routine ? (
          <View style={s.center}>
            <Ionicons name="alert-circle-outline" size={48} color="#f87171" />
            <Text style={s.errorText}>{error ?? 'Rutina no encontrada'}</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={s.scroll}>

            {/* Info card */}
            <View style={s.infoCard}>
              <View style={s.dayBadge}>
                <Text style={s.dayNum}>{routine.day_number}</Text>
                <Text style={s.dayLabel}>DÍA</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.routineName}>{routine.name}</Text>
                <Text style={s.routineSub}>
                  {DAY_NAMES[(routine.day_number - 1) % 7]}{discipline ? ` · ${discipline}` : ''}
                </Text>
                {routine.notes ? <Text style={s.routineNotes}>{routine.notes}</Text> : null}
              </View>
            </View>

            {/* Blocks section */}
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>BLOQUES</Text>
              <TouchableOpacity onPress={() => setShowBlockModal(true)} style={s.addBlockBtn} activeOpacity={0.8}>
                <Ionicons name="add" size={16} color={C.primary} />
                <Text style={s.addBlockText}>AGREGAR</Text>
              </TouchableOpacity>
            </View>

            {/* Empty blocks state */}
            {!hasBlocks && (
              <View style={s.emptyCard}>
                <Ionicons name="layers-outline" size={36} color={C.neutral} style={{ marginBottom: 12 }} />
                <Text style={s.emptyTitle}>Rutina vacía</Text>
                <Text style={s.emptyText}>
                  Generá un borrador completo con IA a partir del perfil del alumno, o armá la estructura a mano.
                </Text>

                {isSaving ? (
                  <ActivityIndicator color={C.primary} style={{ marginTop: 20 }} />
                ) : (
                  <>
                    <TouchableOpacity onPress={openAiModal} activeOpacity={0.85} style={s.structureBtn}>
                      <LinearGradient colors={['#2e1065', '#1e0a45']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.structureBtnGrad}>
                        <Ionicons name="sparkles" size={16} color={C.ai} />
                        <Text style={[s.structureBtnText, { color: C.ai }]}>GENERAR CON IA</Text>
                      </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handleCreateStructure} activeOpacity={0.85} style={s.structureBtn}>
                      <LinearGradient colors={[C.primaryDim, '#003d4d']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.structureBtnGrad}>
                        <Ionicons name="layers-outline" size={16} color={C.primary} />
                        <Text style={s.structureBtnText}>ESTRUCTURA RECOMENDADA</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </>
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
                  <View style={s.blockHeader}>
                    <View style={[s.blockIconWrap, { backgroundColor: color + '22' }]}>
                      <Ionicons name={getBlockIcon(block.block_type) as any} size={17} color={color} />
                    </View>
                    <Text style={[s.blockLabel, { color }]}>{getBlockLabel(block.block_type)}</Text>
                    <Text style={s.blockCount}>{block.exercises.length} ej.</Text>
                    <TouchableOpacity onPress={() => openPickerForBlock(block)} style={s.blockAddBtn} activeOpacity={0.7}>
                      <Ionicons name="add-circle" size={22} color={C.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteBlock(block)} style={{ padding: 4 }} activeOpacity={0.7}>
                      <Ionicons name="trash-outline" size={17} color="#f87171" />
                    </TouchableOpacity>
                  </View>

                  {block.exercises.length === 0 ? (
                    <TouchableOpacity onPress={() => openPickerForBlock(block)} style={s.emptyExRow} activeOpacity={0.7}>
                      <Ionicons name="add-circle-outline" size={16} color={C.neutral} />
                      <Text style={s.emptyExText}>Agregá el primer ejercicio</Text>
                    </TouchableOpacity>
                  ) : (
                    block.exercises.map((ex, idx) => (
                      <TouchableOpacity
                        key={ex.id}
                        onPress={() => openEditorForExercise(block, ex)}
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
                          <Ionicons name="information-circle-outline" size={18} color={C.neutral} />
                        </TouchableOpacity>
                        <Ionicons name="chevron-forward" size={16} color={C.border} />
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              );
            })}

            <View style={{ height: 32 }} />
          </ScrollView>
        )}
      </View>

      {/* ── Block type modal ──────────────────────────────────────────────── */}
      <Modal visible={showBlockModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowBlockModal(false)}>
        <View style={s.modalSafe}>
          <View style={s.modalHandle} />
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>AGREGAR BLOQUE</Text>
            <TouchableOpacity onPress={() => setShowBlockModal(false)} style={{ padding: 6 }}>
              <Ionicons name="close" size={22} color={C.neutral} />
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

          {exModalStep === 'pick' ? (
            /* Step 1: Picker (catálogo DB por disciplina) */
            <>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>
                  {selectedBlock ? getBlockLabel(selectedBlock.block_type).toUpperCase() : 'EJERCICIO'}
                </Text>
                <TouchableOpacity onPress={() => setShowExModal(false)} style={{ padding: 6 }}>
                  <Ionicons name="close" size={22} color={C.neutral} />
                </TouchableOpacity>
              </View>

              {/* Search */}
              <View style={s.searchWrap}>
                <Ionicons name="search-outline" size={16} color={C.neutral} />
                <TextInput
                  value={exSearch}
                  onChangeText={setExSearch}
                  placeholder={`Buscar en ${discipline || 'el catálogo'}...`}
                  placeholderTextColor={C.neutral}
                  style={s.searchInput}
                  returnKeyType="done"
                  onSubmitEditing={() => { if (exSearch.trim().length >= 2) handlePickSuggestion(exSearch.trim()); }}
                />
                {exSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setExSearch('')}>
                    <Ionicons name="close-circle" size={16} color={C.neutral} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Muscle group chips */}
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
                {/* Custom exercise option (when search has text) */}
                {exSearch.trim().length >= 2 && (
                  <TouchableOpacity onPress={() => handlePickSuggestion(exSearch.trim())} activeOpacity={0.8} style={s.customRow}>
                    <Ionicons name="add-circle-outline" size={20} color={C.primary} />
                    <Text style={s.customRowText}>Agregar "{exSearch.trim()}"</Text>
                  </TouchableOpacity>
                )}

                {/* Recientes de esta rutina */}
                {!exSearch && !muscleFilter && recentNames.length > 0 && (
                  <>
                    <Text style={s.suggestionsLabel}>EN ESTA RUTINA</Text>
                    <View style={s.recentWrap}>
                      {recentNames.map(name => (
                        <TouchableOpacity key={name} onPress={() => handlePickSuggestion(name)} activeOpacity={0.8} style={s.recentChip}>
                          <Ionicons name="repeat-outline" size={12} color={C.textLo} />
                          <Text style={s.recentChipText}>{name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}

                <Text style={s.suggestionsLabel}>
                  {exSearch || muscleFilter
                    ? `RESULTADOS (${pickerResults.length})`
                    : `CATÁLOGO DE ${discipline ? discipline.toUpperCase() : 'EJERCICIOS'}`}
                </Text>

                {pickerResults.length === 0 ? (
                  <Text style={[s.emptyExText, { paddingHorizontal: 20 }]}>
                    {exSearch.trim().length >= 2
                      ? 'Sin resultados en el catálogo — podés agregarlo igual con el botón de arriba'
                      : 'No hay ejercicios del catálogo para este filtro'}
                  </Text>
                ) : (
                  pickerResults.map(ex => (
                    <TouchableOpacity key={ex.id} onPress={() => handlePickSuggestion(ex.label)} activeOpacity={0.8} style={s.suggRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.suggName}>{ex.label}</Text>
                        <Text style={s.suggMuscles}>
                          {ex.primary_muscles.map(m => MUSCLE_LABEL[m] ?? m).join(' · ')}
                        </Text>
                      </View>
                      {(ex.tip || ex.image_url) && (
                        <TouchableOpacity
                          onPress={(e) => { e.stopPropagation(); setHelpExercise(ex.label); }}
                          hitSlop={8}
                          style={{ marginRight: 8 }}
                        >
                          <Ionicons name="information-circle-outline" size={17} color={C.neutral} />
                        </TouchableOpacity>
                      )}
                      <Ionicons name="add" size={18} color={C.primary} />
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </>
          ) : (
            /* Step 2: Config */
            <>
              <View style={s.modalHeader}>
                <TouchableOpacity onPress={() => !selectedExercise && setExModalStep('pick')} style={{ padding: 6 }}>
                  {!selectedExercise
                    ? <Ionicons name="chevron-back" size={22} color={C.primary} />
                    : <View style={{ width: 22 }} />
                  }
                </TouchableOpacity>
                <Text style={s.modalTitle} numberOfLines={1}>{exName}</Text>
                <TouchableOpacity onPress={() => setShowExModal(false)} style={{ padding: 6 }}>
                  <Ionicons name="close" size={22} color={C.neutral} />
                </TouchableOpacity>
              </View>

              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.configScroll}>
                <Text style={s.configLabel}>NOMBRE</Text>
                <View style={s.nameInputWrap}>
                  <TextInput
                    value={exName}
                    onChangeText={setExName}
                    style={s.nameInput}
                    placeholderTextColor={C.neutral}
                    placeholder="Nombre del ejercicio"
                  />
                </View>

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

                <Text style={s.configLabel}>NOTAS (OPCIONAL)</Text>
                <TextInput
                  value={exNotes}
                  onChangeText={setExNotes}
                  placeholder="Ej: Mantener codos a 45°"
                  placeholderTextColor={C.neutral}
                  style={s.notesInput}
                  multiline
                />

                <TouchableOpacity onPress={handleSaveExercise} disabled={isSaving} activeOpacity={0.85} style={s.saveBtn}>
                  {!isSaving ? (
                    <LinearGradient colors={[C.primaryDim, '#003d4d']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.saveBtnGrad}>
                      <Text style={s.saveBtnText}>{selectedExercise ? 'GUARDAR CAMBIOS' : 'AGREGAR EJERCICIO'}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={[s.saveBtnGrad, { backgroundColor: C.cardDeep }]}>
                      <ActivityIndicator color={C.primary} />
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
          )}
        </KeyboardAvoidingView>
      </Modal>

      {/* ── AI draft modal ────────────────────────────────────────────────── */}
      <Modal visible={showAiModal} transparent animationType="fade" onRequestClose={() => !isGenerating && setShowAiModal(false)}>
        <View style={s.aiOverlay}>
          <View style={s.aiCard}>
            <LinearGradient
              colors={['transparent', C.ai, 'transparent']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={s.aiTopLine}
            />
            <View style={s.aiIconWrap}>
              <Ionicons name="sparkles" size={26} color={C.ai} />
            </View>
            <Text style={s.aiTitle}>Generar borrador con IA</Text>
            <Text style={s.aiDesc}>
              El asistente arma bloques y ejercicios que después podés editar. Describí el objetivo:
            </Text>

            <TextInput
              value={aiObjective}
              onChangeText={setAiObjective}
              placeholder="Ej: fuerza de tren superior, cuidar hombro derecho..."
              placeholderTextColor={C.neutral}
              style={s.aiInput}
              multiline
              editable={!isGenerating}
              textAlignVertical="top"
            />

            <TouchableOpacity onPress={handleGenerate} disabled={isGenerating} activeOpacity={0.85} style={{ alignSelf: 'stretch' }}>
              <LinearGradient colors={['#2e1065', '#1e0a45']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.aiBtn}>
                {isGenerating ? (
                  <>
                    <ActivityIndicator size="small" color={C.ai} />
                    <Text style={[s.aiBtnText, { color: C.ai }]}>GENERANDO (~10s)...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="sparkles" size={16} color={C.ai} />
                    <Text style={[s.aiBtnText, { color: C.ai }]}>GENERAR</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowAiModal(false)} disabled={isGenerating} style={s.aiCancelBtn}>
              <Text style={s.aiCancelText}>CANCELAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ExerciseHelpModal
        exerciseName={helpExercise}
        onClose={() => setHelpExercise(null)}
      />
    </>
  );
}

// ─── Aplicar bloques propuestos a la rutina existente ────────────────────────

async function applyProposalBlocks(
  routineId: string,
  blocks: ProposedBlock[]
): Promise<{ error: Error | null }> {
  for (const block of blocks) {
    const { block: created, error: blockError } = await addBlock(routineId, block.block_type);
    if (blockError || !created) {
      return { error: blockError ?? new Error('Error al crear bloque') };
    }
    for (const ex of block.exercises) {
      const { error: exError } = await addExercise(created.id, {
        name: ex.name,
        exercise_type: ex.exercise_type,
        sets: ex.sets,
        value: ex.value,
        rest_seconds: ex.rest_seconds,
        notes: ex.notes,
      });
      if (exError) return { error: exError };
    }
  }
  return { error: null };
}

// ─── Contexto del alumno para el prompt de la IA ──────────────────────────────

function buildStudentFacts(form: StudentForm | null): string {
  if (!form) return '';
  const facts: string[] = [];
  if (form.age) facts.push(`${form.age} años`);
  if (form.weight) facts.push(`${form.weight} kg`);
  if (form.height) facts.push(`${form.height} cm`);
  if (form.experience) facts.push(`experiencia: ${form.experience}`);
  if (form.goals) facts.push(`objetivos: ${form.goals}`);
  if (form.injuries) facts.push(`lesiones a cuidar: ${form.injuries}`);
  if (form.diseases) facts.push(`condiciones de salud: ${form.diseases}`);
  return facts.join(', ');
}

// ─── Stepper component ────────────────────────────────────────────────────────

function Stepper({ value, onDec, onInc }: { value: number; onDec: () => void; onInc: () => void }) {
  return (
    <View style={s.stepper}>
      <TouchableOpacity onPress={onDec} style={s.stepBtn} activeOpacity={0.7}>
        <Ionicons name="remove" size={20} color={C.primary} />
      </TouchableOpacity>
      <Text style={s.stepValue}>{value}</Text>
      <TouchableOpacity onPress={onInc} style={s.stepBtn} activeOpacity={0.7}>
        <Ionicons name="add" size={20} color={C.primary} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: C.bg },
  topLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, opacity: 0.4, zIndex: 10 },
  scroll:  { padding: 20 },
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },

  errorText: { color: C.textLo, fontFamily: 'SpaceGrotesk_400Regular', textAlign: 'center', marginTop: 12 },

  // Info card
  infoCard:    { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 16, marginBottom: 20, gap: 14 },
  dayBadge:    { width: 48, height: 48, borderRadius: 12, backgroundColor: C.primaryDim, alignItems: 'center', justifyContent: 'center' },
  dayNum:      { color: C.primary, fontSize: 20, fontFamily: 'SpaceGrotesk_700Bold', lineHeight: 22 },
  dayLabel:    { color: C.primary, fontSize: 8, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1, opacity: 0.7 },
  routineName: { color: C.textHi, fontSize: 16, fontFamily: 'SpaceGrotesk_700Bold', marginBottom: 2 },
  routineSub:  { color: C.textLo, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular' },
  routineNotes:{ color: C.neutral, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular', marginTop: 6, fontStyle: 'italic' },

  // Section header
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle:  { color: C.neutral, fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 3 },
  addBlockBtn:   { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.primaryDim, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  addBlockText:  { color: C.primary, fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1 },

  // Empty blocks
  emptyCard:        { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 28, alignItems: 'center', marginBottom: 16 },
  emptyTitle:       { color: C.textHi, fontSize: 16, fontFamily: 'SpaceGrotesk_700Bold', marginBottom: 8 },
  emptyText:        { color: C.textLo, fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular', textAlign: 'center', lineHeight: 19, marginBottom: 16 },
  structureBtn:     { width: '100%', borderRadius: 12, overflow: 'hidden', marginTop: 8 },
  structureBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  structureBtnText: { color: C.primary, fontSize: 12, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1 },
  structureHint:    { color: C.neutral, fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular', marginTop: 14, textAlign: 'center' },

  // Block card
  blockCard:    { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, borderLeftWidth: 3, marginBottom: 12, overflow: 'hidden' },
  blockHeader:  { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, paddingBottom: 10 },
  blockIconWrap:{ width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  blockLabel:   { fontSize: 12, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1, flex: 1 },
  blockCount:   { color: C.neutral, fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular', marginRight: 4 },
  blockAddBtn:  { padding: 4 },

  emptyExRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderTopWidth: 1, borderTopColor: C.border },
  emptyExText: { color: C.neutral, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular' },

  exRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: 1, borderTopColor: C.border },
  exRowBorder: {},
  exNumBadge:  { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  exNum:       { fontSize: 12, fontFamily: 'SpaceGrotesk_700Bold' },
  exName:      { color: C.textHi, fontSize: 14, fontFamily: 'SpaceGrotesk_600SemiBold', marginBottom: 1 },
  exMeta:      { color: C.neutral, fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular' },

  // Modals (shared)
  modalSafe:   { flex: 1, backgroundColor: C.bg, paddingTop: 10 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.border, alignSelf: 'center', marginBottom: 8 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 10 },
  modalTitle:  { color: C.textHi, fontSize: 13, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 2, flex: 1, textAlign: 'center' },

  blockTypeRow:  { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 14 },
  blockTypeIcon: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  blockTypeName: { color: C.textHi, fontSize: 14, fontFamily: 'SpaceGrotesk_600SemiBold' },

  // Picker
  searchWrap:  { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.card, borderRadius: 10, borderWidth: 1, borderColor: C.border, marginHorizontal: 20, marginBottom: 10, paddingHorizontal: 12 },
  searchInput: { flex: 1, color: C.textHi, fontSize: 14, fontFamily: 'SpaceGrotesk_400Regular', paddingVertical: 11 },

  muscleChipsRow:      { paddingHorizontal: 20, gap: 8, paddingBottom: 10 },
  muscleChip:          { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  muscleChipActive:    { backgroundColor: C.primaryDim, borderColor: C.primary },
  muscleChipText:      { color: C.neutral, fontSize: 11, fontFamily: 'SpaceGrotesk_600SemiBold' },
  muscleChipTextActive:{ color: C.primary },

  customRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 20, marginBottom: 6, padding: 13, backgroundColor: C.cardDeep, borderRadius: 10, borderWidth: 1, borderColor: C.primaryDim },
  customRowText: { color: C.primary, fontSize: 13, fontFamily: 'SpaceGrotesk_600SemiBold' },

  suggestionsLabel: { color: C.neutral, fontSize: 9, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 2, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8 },
  recentWrap:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20 },
  recentChip:       { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 8, backgroundColor: C.cardDeep, borderWidth: 1, borderColor: C.border },
  recentChipText:   { color: C.textLo, fontSize: 11, fontFamily: 'SpaceGrotesk_600SemiBold' },

  suggRow:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.card },
  suggName:    { color: C.textHi, fontSize: 14, fontFamily: 'SpaceGrotesk_600SemiBold', marginBottom: 1 },
  suggMuscles: { color: C.neutral, fontSize: 10, fontFamily: 'SpaceGrotesk_400Regular' },

  // Config
  configScroll: { paddingHorizontal: 20, paddingBottom: 40 },
  configLabel:  { color: C.neutral, fontSize: 9, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 2, marginTop: 16, marginBottom: 8 },
  nameInputWrap:{ backgroundColor: C.card, borderRadius: 10, borderWidth: 1, borderColor: C.border },
  nameInput:    { color: C.textHi, fontSize: 15, fontFamily: 'SpaceGrotesk_600SemiBold', paddingHorizontal: 14, paddingVertical: 12 },

  typeRow:            { flexDirection: 'row', gap: 8 },
  typeChip:           { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  typeChipActive:     { backgroundColor: C.primaryDim, borderColor: C.primary },
  typeChipText:       { color: C.neutral, fontSize: 12, fontFamily: 'SpaceGrotesk_600SemiBold' },
  typeChipTextActive: { color: C.primary },

  steppersRow:  { flexDirection: 'row', gap: 14 },
  stepperBlock: { flex: 1 },
  stepper:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.card, borderRadius: 10, borderWidth: 1, borderColor: C.border },
  stepBtn:      { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  stepValue:    { color: C.textHi, fontSize: 17, fontFamily: 'SpaceGrotesk_700Bold' },

  restRow:            { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  restChip:           { paddingHorizontal: 13, paddingVertical: 9, borderRadius: 8, backgroundColor: C.card, borderWidth: 1, borderColor: C.border },
  restChipActive:     { backgroundColor: C.primaryDim, borderColor: C.primary },
  restChipText:       { color: C.neutral, fontSize: 12, fontFamily: 'SpaceGrotesk_600SemiBold' },
  restChipTextActive: { color: C.primary },

  notesInput: { backgroundColor: C.card, borderRadius: 10, borderWidth: 1, borderColor: C.border, color: C.textHi, fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular', paddingHorizontal: 14, paddingVertical: 12, minHeight: 70 },

  saveBtn:     { borderRadius: 12, overflow: 'hidden', marginTop: 24 },
  saveBtnGrad: { alignItems: 'center', justifyContent: 'center', paddingVertical: 15 },
  saveBtnText: { color: C.primary, fontSize: 13, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1.5 },

  deleteExBtn:  { alignItems: 'center', paddingVertical: 16 },
  deleteExText: { color: '#f87171', fontSize: 13, fontFamily: 'SpaceGrotesk_600SemiBold' },

  // AI modal
  aiOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  aiCard:      { width: '100%', backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.border, overflow: 'hidden', paddingHorizontal: 24, paddingBottom: 24, alignItems: 'center' },
  aiTopLine:   { height: 2, opacity: 0.7, marginBottom: 24, alignSelf: 'stretch' },
  aiIconWrap:  { width: 52, height: 52, borderRadius: 26, backgroundColor: '#1e0a45', borderWidth: 1, borderColor: C.ai, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  aiTitle:     { color: C.textHi, fontSize: 17, fontFamily: 'SpaceGrotesk_700Bold', textAlign: 'center', marginBottom: 8 },
  aiDesc:      { color: C.neutral, fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular', textAlign: 'center', lineHeight: 19, marginBottom: 16 },
  aiInput:     { alignSelf: 'stretch', backgroundColor: C.cardDeep, borderRadius: 10, borderWidth: 1, borderColor: C.border, color: C.textHi, fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular', padding: 14, minHeight: 90, marginBottom: 16, lineHeight: 19 },
  aiBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 10, paddingVertical: 14 },
  aiBtnText:   { fontSize: 12, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1.5 },
  aiCancelBtn: { paddingVertical: 12, marginTop: 4 },
  aiCancelText:{ color: C.neutral, fontSize: 12, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1 },
});

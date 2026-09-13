import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useAlert } from '@/components/AppAlert';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { createRoutine, getRoutinesByPlan, Routine } from '@/lib/services/routineService';
import { getPlanById, Plan } from '@/lib/services/planService';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeTokens } from '@/constants/theme';

const TOTAL_STEPS = 3;
const DAY_LETTERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function CreateRoutineScreen() {
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const { showAlert } = useAlert();
  const { T, activeTheme } = useTheme();
  const actionDimBg = activeTheme === 'dark' ? '#00566a' : '#e0f7fa';
  const s = useMemo(() => createStyles(T, actionDimBg), [T, actionDimBg]);

  const [plan, setPlan]               = useState<Plan | null>(null);
  const [existingRoutines, setExistingRoutines] = useState<Routine[]>([]);
  const [loadingPlan, setLoadingPlan] = useState(true);

  const [name, setName]           = useState('');
  const [dayNumber, setDayNumber] = useState<number | null>(null);
  const [notes, setNotes]         = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep]           = useState(1);

  useEffect(() => {
    if (!planId) return;
    Promise.all([getPlanById(planId), getRoutinesByPlan(planId)]).then(([p, r]) => {
      if (p.plan) {
        setPlan(p.plan);
        setExistingRoutines(r.routines);
        // Pre-seleccionar primer día disponible del plan
        const days = p.plan.training_days?.slice().sort((a, b) => a - b)
          ?? Array.from({ length: p.plan.weekly_frequency }, (_, i) => i + 1);
        const taken = new Set(r.routines.map(rt => rt.day_number));
        const first = days.find(d => !taken.has(d)) ?? null;
        if (first !== null) setDayNumber(first);
      }
      setLoadingPlan(false);
    });
  }, [planId]);

  const takenDays  = new Set(existingRoutines.map(r => r.day_number));
  // Días del plan: usa training_days guardados, o deriva 1-N como fallback
  const planDays   = (plan?.training_days?.slice().sort((a, b) => a - b)
    ?? Array.from({ length: plan?.weekly_frequency ?? 0 }, (_, i) => i + 1));

  const handleGoBack = () => {
    if (step > 1) setStep(step - 1);
    else router.navigate(`/student/plan/${planId}`);
  };

  const handleSelectDay = (day: number) => {
    setDayNumber(day);
    setTimeout(() => setStep(3), 200);
  };

  const handleCreate = async () => {
    if (!planId || name.trim().length < 3 || dayNumber === null) {
      showAlert('Error', 'Completá los campos requeridos');
      return;
    }
    setIsLoading(true);
    const { routine, error } = await createRoutine({
      plan_id:    planId,
      name:       name.trim(),
      day_number: dayNumber,
      notes:      notes.trim() || undefined,
    });
    setIsLoading(false);
    if (error) { showAlert('Error', error.message); return; }
    if (routine) router.replace(`/student/routine/${routine.id}`);
  };

  const ctaGradColors: [string, string] = activeTheme === 'dark'
    ? [actionDimBg, '#003d4d']
    : [T.border, T.surface];

  return (
    <>
      <Stack.Screen options={{
        title: '',
        headerLeft: () => (
          <TouchableOpacity onPress={handleGoBack} style={{ marginLeft: 4, padding: 4 }}>
            <Ionicons name="chevron-back" size={24} color={T.action} />
          </TouchableOpacity>
        ),
      }} />

      <KeyboardAvoidingView
        style={s.safe}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <LinearGradient
          colors={['transparent', T.action, 'transparent']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={s.topLine}
        />

        {/* ── Steps ────────────────────────────────────────── */}
        <View style={s.stepsRow}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => {
            const n = i + 1; const done = n < step; const active = n === step;
            return (
              <View key={n} style={s.stepItem}>
                <View style={[s.stepDot, active && s.stepDotActive, done && s.stepDotDone]}>
                  {done
                    ? <Ionicons name="checkmark" size={13} color={T.surface} />
                    : <Text style={[s.stepNum, (active || done) && { color: T.surface }]}>{n}</Text>
                  }
                </View>
                {n < TOTAL_STEPS && <View style={[s.stepLine, done && s.stepLineDone]} />}
              </View>
            );
          })}
        </View>

        {/* ── Content ──────────────────────────────────────── */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 1 && <StepName name={name} setName={setName} T={T} s={s} />}
          {step === 2 && (
            loadingPlan
              ? <View style={s.loadingWrap}><ActivityIndicator color={T.action} /></View>
              : <StepDay
                  dayNumber={dayNumber}
                  planDays={planDays}
                  takenDays={takenDays}
                  existingRoutines={existingRoutines}
                  onSelect={handleSelectDay}
                  T={T}
                  s={s}
                />
          )}
          {step === 3 && (
            <StepNotes
              name={name}
              dayNumber={dayNumber!}
              notes={notes}
              setNotes={setNotes}
              T={T}
              s={s}
            />
          )}
        </ScrollView>

        {/* ── Footer ───────────────────────────────────────── */}
        {step !== 2 && (
          <View style={s.footer}>
            <TouchableOpacity
              onPress={step === 1 ? () => setStep(2) : handleCreate}
              disabled={step === 1 ? name.trim().length < 3 : isLoading}
              activeOpacity={0.85}
              style={s.ctaBtn}
            >
              {(step === 1 ? name.trim().length >= 3 : true) && !isLoading ? (
                <LinearGradient
                  colors={ctaGradColors}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={s.ctaGrad}
                >
                  <Text style={s.ctaText}>{step === 1 ? 'CONTINUAR' : 'CREAR RUTINA'}</Text>
                  <Ionicons
                    name={step === 1 ? 'arrow-forward' : 'checkmark-circle-outline'}
                    size={18} color={T.action}
                  />
                </LinearGradient>
              ) : (
                <View style={[s.ctaGrad, s.ctaGradDisabled]}>
                  {isLoading
                    ? <ActivityIndicator color={T.action} />
                    : <Text style={[s.ctaText, { color: T.textSecondary }]}>
                        {step === 1 ? 'CONTINUAR' : 'CREAR RUTINA'}
                      </Text>
                  }
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </>
  );
}

// ─── Step 1: Nombre ───────────────────────────────────────────────────────────

function StepName({ name, setName, T, s }: {
  name: string;
  setName: (v: string) => void;
  T: ThemeTokens;
  s: ReturnType<typeof createStyles>;
}) {
  return (
    <View>
      <Text style={s.stepTitle}>¿Cómo se llama{'\n'}la rutina?</Text>
      <Text style={s.stepSub}>Elegí un nombre descriptivo del día</Text>

      <View style={s.inputWrap}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Ej: Pecho y Tríceps"
          placeholderTextColor={T.textSecondary}
          style={s.input}
          autoFocus
          maxLength={60}
          returnKeyType="next"
        />
        <Text style={s.charCount}>{name.length}/60</Text>
      </View>

      <View style={s.suggestionsRow}>
        {['Full Body', 'Pecho y Tríceps', 'Espalda y Bíceps', 'Piernas', 'Hombros'].map(sug => (
          <TouchableOpacity
            key={sug}
            onPress={() => setName(sug)}
            activeOpacity={0.75}
            style={s.suggestionChip}
          >
            <Text style={s.suggestionText}>{sug}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ─── Step 2: Día ─────────────────────────────────────────────────────────────

const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

function StepDay({
  dayNumber, planDays, takenDays, existingRoutines, onSelect, T, s,
}: {
  dayNumber: number | null;
  planDays: number[];
  takenDays: Set<number>;
  existingRoutines: Routine[];
  onSelect: (d: number) => void;
  T: ThemeTokens;
  s: ReturnType<typeof createStyles>;
}) {
  const firstFree = planDays.find(d => !takenDays.has(d)) ?? null;

  return (
    <View>
      <Text style={s.stepTitle}>¿Qué día{'\n'}es esta rutina?</Text>
      <Text style={s.stepSub}>Días de entrenamiento de tu plan</Text>

      <View style={s.dayList}>
        {planDays.map(day => {
          const taken     = takenDays.has(day);
          const active    = dayNumber === day;
          const suggested = day === firstFree;
          const routine   = existingRoutines.find(r => r.day_number === day);

          return (
            <TouchableOpacity
              key={day}
              onPress={() => !taken && onSelect(day)}
              activeOpacity={taken ? 1 : 0.8}
              style={[s.dayRow, active && s.dayRowActive, taken && s.dayRowTaken]}
            >
              {/* Letra del día */}
              <View style={[s.dayLetterBadge, active && s.dayLetterBadgeActive, taken && s.dayLetterBadgeTaken]}>
                <Text style={[s.dayLetterText, active && { color: T.surface }, taken && { color: T.textSecondary }]}>
                  {DAY_LETTERS[day - 1]}
                </Text>
              </View>

              {/* Info */}
              <View style={{ flex: 1 }}>
                <Text style={[s.dayName, taken && { color: T.textSecondary }]}>
                  {DAY_NAMES[day - 1]}
                </Text>
                {taken ? (
                  <Text style={s.dayTakenLabel} numberOfLines={1}>{routine?.name}</Text>
                ) : (
                  <Text style={s.dayFreeLabel}>Disponible</Text>
                )}
              </View>

              {/* Right */}
              {taken
                ? <Ionicons name="lock-closed-outline" size={15} color={T.border} />
                : active
                  ? <View style={s.selectedBadge}>
                      <Ionicons name="checkmark" size={14} color={T.surface} />
                    </View>
                  : suggested
                    ? <View style={s.suggestedBadge}>
                        <Text style={s.suggestedBadgeText}>SUGERIDO</Text>
                      </View>
                    : <Ionicons name="chevron-forward" size={15} color={T.border} />
              }
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Step 3: Notas ───────────────────────────────────────────────────────────

function StepNotes({
  name, dayNumber, notes, setNotes, T, s,
}: {
  name: string; dayNumber: number; notes: string; setNotes: (v: string) => void;
  T: ThemeTokens; s: ReturnType<typeof createStyles>;
}) {
  return (
    <View>
      <Text style={s.stepTitle}>Notas{'\n'}(opcional)</Text>
      <Text style={s.stepSub}>Agregá indicaciones, objetivos o cualquier detalle</Text>

      <View style={s.summaryCard}>
        <View style={s.summaryRow}>
          <View style={s.summaryDayBadge}>
            <Text style={s.summaryDayNum}>{dayNumber}</Text>
            <Text style={s.summaryDayLabel}>DÍA</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.summaryRoutineName}>{name}</Text>
            <Text style={s.summaryRoutineSub}>{DAY_LETTERS[dayNumber - 1]} — Día {dayNumber} de entrenamiento</Text>
          </View>
        </View>
      </View>

      <View style={s.notesWrap}>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Ej: Foco en hipertrofia, descanso 60-90s entre series..."
          placeholderTextColor={T.textSecondary}
          style={s.notesInput}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          maxLength={300}
        />
        <Text style={s.charCount}>{notes.length}/300</Text>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function createStyles(T: ThemeTokens, actionDimBg = '#00566a') {
  return StyleSheet.create({
    safe:       { flex: 1, backgroundColor: T.surface },
    topLine:    { position: 'absolute', top: 0, left: 0, right: 0, height: 2, opacity: 0.4, zIndex: 10 },
    scroll:     { padding: 24, paddingBottom: 16 },
    loadingWrap:{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },

    // Steps
    stepsRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
    stepItem:     { flexDirection: 'row', alignItems: 'center' },
    stepDot:      { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: T.border, alignItems: 'center', justifyContent: 'center', backgroundColor: T.surfaceElevated },
    stepDotActive:{ borderColor: T.action, backgroundColor: T.action },
    stepDotDone:  { borderColor: T.action, backgroundColor: T.action },
    stepNum:      { color: T.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk_700Bold' },
    stepLine:     { width: 48, height: 1.5, backgroundColor: T.border, marginHorizontal: 6 },
    stepLineDone: { backgroundColor: T.action },

    stepTitle: { color: T.textPrimary, fontSize: 28, fontFamily: 'SpaceGrotesk_700Bold', lineHeight: 34, marginBottom: 8 },
    stepSub:   { color: T.textSecondary, fontSize: 14, fontFamily: 'SpaceGrotesk_400Regular', marginBottom: 24 },

    // Step 1
    inputWrap:      { backgroundColor: T.surfaceElevated, borderRadius: 14, borderWidth: 1.5, borderColor: T.border, overflow: 'hidden', marginBottom: 16 },
    input:          { color: T.textPrimary, fontSize: 18, fontFamily: 'SpaceGrotesk_600SemiBold', paddingHorizontal: 20, paddingVertical: 18 },
    charCount:      { color: T.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular', textAlign: 'right', paddingHorizontal: 16, paddingBottom: 10 },
    suggestionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    suggestionChip: { backgroundColor: T.surfaceElevated, borderRadius: 20, borderWidth: 1, borderColor: T.border, paddingHorizontal: 14, paddingVertical: 8 },
    suggestionText: { color: T.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk_600SemiBold' },

    // Step 2 — Day list
    dayList:      { gap: 8 },
    dayRow:       { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: T.surfaceElevated, borderRadius: 12, borderWidth: 1, borderColor: T.border, padding: 14 },
    dayRowActive: { borderColor: T.action, backgroundColor: T.border },
    dayRowTaken:  { opacity: 0.45 },

    dayLetterBadge:       { width: 42, height: 42, borderRadius: 21, backgroundColor: actionDimBg, alignItems: 'center', justifyContent: 'center' },
    dayLetterBadgeActive: { backgroundColor: T.action },
    dayLetterBadgeTaken:  { backgroundColor: T.border },
    dayLetterText:        { color: T.action, fontSize: 17, fontFamily: 'SpaceGrotesk_700Bold' },

    dayName:      { color: T.textPrimary, fontSize: 14, fontFamily: 'SpaceGrotesk_600SemiBold' },
    dayFreeLabel: { color: T.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular', marginTop: 1 },
    dayTakenLabel:{ color: T.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular', marginTop: 1 },

    selectedBadge:      { width: 26, height: 26, borderRadius: 13, backgroundColor: T.action, alignItems: 'center', justifyContent: 'center' },
    suggestedBadge:     { backgroundColor: actionDimBg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    suggestedBadgeText: { color: T.action, fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 0.5 },

    // Step 3
    summaryCard:        { backgroundColor: T.surfaceElevated, borderRadius: 12, borderWidth: 1, borderColor: actionDimBg, padding: 16, marginBottom: 20 },
    summaryRow:         { flexDirection: 'row', alignItems: 'center', gap: 14 },
    summaryDayBadge:    { width: 48, height: 48, borderRadius: 12, backgroundColor: actionDimBg, alignItems: 'center', justifyContent: 'center' },
    summaryDayNum:      { color: T.action, fontSize: 20, fontFamily: 'SpaceGrotesk_700Bold', lineHeight: 22 },
    summaryDayLabel:    { color: T.action, fontSize: 8, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1, opacity: 0.7 },
    summaryRoutineName: { color: T.textPrimary, fontSize: 16, fontFamily: 'SpaceGrotesk_700Bold' },
    summaryRoutineSub:  { color: T.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular', marginTop: 2 },

    notesWrap:  { backgroundColor: T.surfaceElevated, borderRadius: 14, borderWidth: 1.5, borderColor: T.border, overflow: 'hidden' },
    notesInput: { color: T.textPrimary, fontSize: 15, fontFamily: 'SpaceGrotesk_400Regular', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, minHeight: 130 },

    // Footer
    footer:         { padding: 20, paddingBottom: 32 },
    ctaBtn:         { borderRadius: 14, overflow: 'hidden' },
    ctaGrad:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
    ctaGradDisabled:{ backgroundColor: T.border },
    ctaText:        { color: T.action, fontSize: 14, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1.5 },
  });
}

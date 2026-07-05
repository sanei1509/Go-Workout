import { useState, useEffect } from 'react';
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
};

const TOTAL_STEPS = 3;
const DAY_LETTERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function CreateRoutineScreen() {
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const { showAlert } = useAlert();

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
    else router.navigate(`/trainer/plan/${planId}`);
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
    if (routine) router.replace(`/trainer/routine/${routine.id}`);
  };

  return (
    <>
      <Stack.Screen options={{
        title: '',
        headerLeft: () => (
          <TouchableOpacity onPress={handleGoBack} style={{ marginLeft: 4, padding: 4 }}>
            <Ionicons name="chevron-back" size={24} color={C.primary} />
          </TouchableOpacity>
        ),
      }} />

      <KeyboardAvoidingView
        style={s.safe}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <LinearGradient
          colors={['transparent', C.primary, 'transparent']}
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
                    ? <Ionicons name="checkmark" size={13} color={C.bg} />
                    : <Text style={[s.stepNum, (active || done) && { color: C.bg }]}>{n}</Text>
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
          {step === 1 && <StepName name={name} setName={setName} />}
          {step === 2 && (
            loadingPlan
              ? <View style={s.loadingWrap}><ActivityIndicator color={C.primary} /></View>
              : <StepDay
                  dayNumber={dayNumber}
                  planDays={planDays}
                  takenDays={takenDays}
                  existingRoutines={existingRoutines}
                  onSelect={handleSelectDay}
                />
          )}
          {step === 3 && (
            <StepNotes
              name={name}
              dayNumber={dayNumber!}
              notes={notes}
              setNotes={setNotes}
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
                  colors={[C.primaryDim, '#003d4d']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={s.ctaGrad}
                >
                  <Text style={s.ctaText}>{step === 1 ? 'CONTINUAR' : 'CREAR RUTINA'}</Text>
                  <Ionicons
                    name={step === 1 ? 'arrow-forward' : 'checkmark-circle-outline'}
                    size={18} color={C.primary}
                  />
                </LinearGradient>
              ) : (
                <View style={[s.ctaGrad, s.ctaGradDisabled]}>
                  {isLoading
                    ? <ActivityIndicator color={C.primary} />
                    : <Text style={[s.ctaText, { color: C.neutral }]}>
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

function StepName({ name, setName }: { name: string; setName: (v: string) => void }) {
  return (
    <View>
      <Text style={s.stepTitle}>¿Cómo se llama{'\n'}la rutina?</Text>
      <Text style={s.stepSub}>Elegí un nombre descriptivo del día</Text>

      <View style={s.inputWrap}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Ej: Pecho y Tríceps"
          placeholderTextColor={C.neutral}
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
  dayNumber, planDays, takenDays, existingRoutines, onSelect,
}: {
  dayNumber: number | null;
  planDays: number[];
  takenDays: Set<number>;
  existingRoutines: Routine[];
  onSelect: (d: number) => void;
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
                <Text style={[s.dayLetterText, active && { color: C.bg }, taken && { color: C.neutral }]}>
                  {DAY_LETTERS[day - 1]}
                </Text>
              </View>

              {/* Info */}
              <View style={{ flex: 1 }}>
                <Text style={[s.dayName, taken && { color: C.neutral }]}>
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
                ? <Ionicons name="lock-closed-outline" size={15} color={C.border} />
                : active
                  ? <View style={s.selectedBadge}>
                      <Ionicons name="checkmark" size={14} color={C.bg} />
                    </View>
                  : suggested
                    ? <View style={s.suggestedBadge}>
                        <Text style={s.suggestedBadgeText}>SUGERIDO</Text>
                      </View>
                    : <Ionicons name="chevron-forward" size={15} color={C.border} />
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
  name, dayNumber, notes, setNotes,
}: {
  name: string; dayNumber: number; notes: string; setNotes: (v: string) => void;
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
          placeholderTextColor={C.neutral}
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

const s = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: C.bg },
  topLine:    { position: 'absolute', top: 0, left: 0, right: 0, height: 2, opacity: 0.4, zIndex: 10 },
  scroll:     { padding: 24, paddingBottom: 16 },
  loadingWrap:{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },

  // Steps
  stepsRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16 },
  stepItem:     { flexDirection: 'row', alignItems: 'center' },
  stepDot:      { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center', backgroundColor: C.card },
  stepDotActive:{ borderColor: C.primary, backgroundColor: C.primary },
  stepDotDone:  { borderColor: C.primary, backgroundColor: C.primary },
  stepNum:      { color: C.neutral, fontSize: 13, fontFamily: 'SpaceGrotesk_700Bold' },
  stepLine:     { width: 48, height: 1.5, backgroundColor: C.border, marginHorizontal: 6 },
  stepLineDone: { backgroundColor: C.primary },

  stepTitle: { color: C.textHi, fontSize: 28, fontFamily: 'SpaceGrotesk_700Bold', lineHeight: 34, marginBottom: 8 },
  stepSub:   { color: C.textLo, fontSize: 14, fontFamily: 'SpaceGrotesk_400Regular', marginBottom: 24 },

  // Step 1
  inputWrap:      { backgroundColor: C.card, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, overflow: 'hidden', marginBottom: 16 },
  input:          { color: C.textHi, fontSize: 18, fontFamily: 'SpaceGrotesk_600SemiBold', paddingHorizontal: 20, paddingVertical: 18 },
  charCount:      { color: C.neutral, fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular', textAlign: 'right', paddingHorizontal: 16, paddingBottom: 10 },
  suggestionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  suggestionChip: { backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, paddingVertical: 8 },
  suggestionText: { color: C.textLo, fontSize: 12, fontFamily: 'SpaceGrotesk_600SemiBold' },

  // Step 2 — Day list
  dayList:      { gap: 8 },
  dayRow:       { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 14 },
  dayRowActive: { borderColor: C.primary, backgroundColor: C.cardDeep },
  dayRowTaken:  { opacity: 0.45 },

  dayLetterBadge:       { width: 42, height: 42, borderRadius: 21, backgroundColor: C.primaryDim, alignItems: 'center', justifyContent: 'center' },
  dayLetterBadgeActive: { backgroundColor: C.primary },
  dayLetterBadgeTaken:  { backgroundColor: C.cardDeep },
  dayLetterText:        { color: C.primary, fontSize: 17, fontFamily: 'SpaceGrotesk_700Bold' },

  dayName:      { color: C.textHi, fontSize: 14, fontFamily: 'SpaceGrotesk_600SemiBold' },
  dayFreeLabel: { color: C.textLo, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular', marginTop: 1 },
  dayTakenLabel:{ color: C.neutral, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular', marginTop: 1 },

  selectedBadge:      { width: 26, height: 26, borderRadius: 13, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  suggestedBadge:     { backgroundColor: C.primaryDim, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  suggestedBadgeText: { color: C.primary, fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 0.5 },

  // Step 3
  summaryCard:        { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.primaryDim, padding: 16, marginBottom: 20 },
  summaryRow:         { flexDirection: 'row', alignItems: 'center', gap: 14 },
  summaryDayBadge:    { width: 48, height: 48, borderRadius: 12, backgroundColor: C.primaryDim, alignItems: 'center', justifyContent: 'center' },
  summaryDayNum:      { color: C.primary, fontSize: 20, fontFamily: 'SpaceGrotesk_700Bold', lineHeight: 22 },
  summaryDayLabel:    { color: C.primary, fontSize: 8, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1, opacity: 0.7 },
  summaryRoutineName: { color: C.textHi, fontSize: 16, fontFamily: 'SpaceGrotesk_700Bold' },
  summaryRoutineSub:  { color: C.textLo, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular', marginTop: 2 },

  notesWrap:  { backgroundColor: C.card, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, overflow: 'hidden' },
  notesInput: { color: C.textHi, fontSize: 15, fontFamily: 'SpaceGrotesk_400Regular', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, minHeight: 130 },

  // Footer
  footer:         { padding: 20, paddingBottom: 32 },
  ctaBtn:         { borderRadius: 14, overflow: 'hidden' },
  ctaGrad:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
  ctaGradDisabled:{ backgroundColor: C.cardDeep },
  ctaText:        { color: C.primary, fontSize: 14, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1.5 },
});

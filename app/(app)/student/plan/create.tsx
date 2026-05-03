import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { createPlan, DISCIPLINES, FREQUENCIES } from '@/lib/services/planService';

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

const DISCIPLINE_ICONS: Record<string, string> = {
  'Musculación':    'barbell-outline',
  'Crossfit':       'flash-outline',
  'Calistenia':     'body-outline',
  'Funcional':      'fitness-outline',
  'Running':        'walk-outline',
  'Natación':       'water-outline',
  'Yoga':           'leaf-outline',
  'Pilates':        'ellipse-outline',
  'Boxeo':          'shield-outline',
  'Artes Marciales':'trophy-outline',
  'Ciclismo':       'bicycle-outline',
  'HIIT':           'timer-outline',
  'Powerlifting':   'barbell-outline',
  'Otro':           'apps-outline',
};

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function CreatePlanScreen() {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName]             = useState('');
  const [discipline, setDiscipline] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [step, setStep]             = useState(1);

  const handleGoBack = () => {
    if (step > 1) setStep(step - 1);
    else router.navigate('/student');
  };

  const canProceed = () => {
    if (step === 1) return name.trim().length >= 2;
    if (step === 2) return discipline !== null;
    if (step === 3) return selectedDays.length > 0;
    return false;
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS) setStep(step + 1);
    else handleSubmit();
  };

  const handleSelectDiscipline = (d: string) => {
    setDiscipline(d);
    setTimeout(() => setStep(3), 200);
  };

  const handleToggleDay = (day: number) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = async () => {
    if (!user?.id || !discipline || selectedDays.length === 0) return;
    setIsSubmitting(true);
    const sorted = [...selectedDays].sort((a, b) => a - b);
    const { plan, error } = await createPlan(user.id, {
      name: name.trim(),
      discipline,
      weekly_frequency: selectedDays.length,
      training_days: sorted,
    });
    setIsSubmitting(false);
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    router.replace(`/student/plan/${plan?.id}`);
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

        {/* ── Steps indicator ──────────────────────────────── */}
        <View style={s.stepsRow}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => {
            const n      = i + 1;
            const done   = n < step;
            const active = n === step;
            return (
              <View key={n} style={s.stepItem}>
                <View style={[s.stepDot, active && s.stepDotActive, done && s.stepDotDone]}>
                  {done
                    ? <Ionicons name="checkmark" size={13} color={C.bg} />
                    : <Text style={[s.stepNum, (active || done) && { color: C.bg }]}>{n}</Text>
                  }
                </View>
                {n < TOTAL_STEPS && (
                  <View style={[s.stepLine, done && s.stepLineDone]} />
                )}
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
          {step === 1 && <Step1 name={name} setName={setName} />}
          {step === 2 && <Step2 discipline={discipline} onSelect={handleSelectDiscipline} />}
          {step === 3 && (
            <Step3
              name={name}
              discipline={discipline!}
              selectedDays={selectedDays}
              onToggleDay={handleToggleDay}
            />
          )}
        </ScrollView>

        {/* ── Footer CTA (no en step 2 — selección auto-avanza) ── */}
        {step !== 2 && (
          <View style={s.footer}>
            <TouchableOpacity
              onPress={handleNext}
              disabled={!canProceed() || isSubmitting}
              activeOpacity={0.85}
              style={s.ctaBtn}
            >
              {canProceed() && !isSubmitting ? (
                <LinearGradient
                  colors={[C.primaryDim, '#003d4d']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={s.ctaGrad}
                >
                  <Text style={s.ctaText}>
                    {step === TOTAL_STEPS ? 'CREAR PLAN' : 'CONTINUAR'}
                  </Text>
                  <Ionicons
                    name={step === TOTAL_STEPS ? 'checkmark-circle-outline' : 'arrow-forward'}
                    size={18}
                    color={C.primary}
                  />
                </LinearGradient>
              ) : (
                <View style={[s.ctaGrad, s.ctaGradDisabled]}>
                  {isSubmitting
                    ? <ActivityIndicator color={C.primary} />
                    : <Text style={[s.ctaText, { color: C.neutral }]}>
                        {step === TOTAL_STEPS ? 'CREAR PLAN' : 'CONTINUAR'}
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

function Step1({ name, setName }: { name: string; setName: (v: string) => void }) {
  return (
    <View>
      <Text style={s.stepTitle}>¿Cómo se llama{'\n'}tu plan?</Text>
      <Text style={s.stepSub}>Dale un nombre que te ayude a identificarlo</Text>

      <View style={s.inputWrap}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Ej: Rutina de fuerza..."
          placeholderTextColor={C.neutral}
          style={s.input}
          autoFocus
          maxLength={50}
          returnKeyType="next"
        />
        <Text style={s.charCount}>{name.length}/50</Text>
      </View>
    </View>
  );
}

// ─── Step 2: Disciplina ───────────────────────────────────────────────────────

function Step2({ discipline, onSelect }: { discipline: string | null; onSelect: (d: string) => void }) {
  return (
    <View>
      <Text style={s.stepTitle}>¿Qué disciplina{'\n'}vas a entrenar?</Text>
      <Text style={s.stepSub}>Tocá una para continuar</Text>

      <View style={s.disciplineGrid}>
        {DISCIPLINES.map((d) => {
          const active = discipline === d;
          return (
            <TouchableOpacity
              key={d}
              onPress={() => onSelect(d)}
              activeOpacity={0.75}
              style={[s.disciplineChip, active && s.disciplineChipActive]}
            >
              <Ionicons
                name={(DISCIPLINE_ICONS[d] ?? 'apps-outline') as any}
                size={18}
                color={active ? C.bg : C.neutral}
                style={{ marginBottom: 5 }}
              />
              <Text style={[s.disciplineText, active && s.disciplineTextActive]}>{d}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Step 3: Frecuencia ───────────────────────────────────────────────────────

function Step3({
  name, discipline, selectedDays, onToggleDay,
}: {
  name: string; discipline: string; selectedDays: number[]; onToggleDay: (day: number) => void;
}) {
  const count = selectedDays.length;
  const freqLabel = count > 0
    ? FREQUENCIES.find(f => f.value === count)?.label ?? `${count} días por semana`
    : null;

  return (
    <View>
      <Text style={s.stepTitle}>¿Qué días{'\n'}entrenás?</Text>
      <Text style={s.stepSub}>Seleccioná uno o varios días</Text>

      {/* Resumen */}
      <View style={s.summaryCard}>
        <Text style={s.summaryLabel}>PLAN</Text>
        <Text style={s.summaryName}>{name}</Text>
        <Text style={s.summaryDiscipline}>{discipline}</Text>
      </View>

      {/* Selector de días independiente */}
      <View style={s.daySelector}>
        <View style={s.dayDotsRow}>
          {DAY_LABELS.map((label, i) => {
            const dayNum  = i + 1;
            const active  = selectedDays.includes(dayNum);
            return (
              <TouchableOpacity
                key={label}
                onPress={() => onToggleDay(dayNum)}
                activeOpacity={0.7}
                style={[s.dayDot, active && s.dayDotActive]}
              >
                <Text style={[s.dayLabel, active && s.dayLabelActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {freqLabel ? (
          <View style={s.freqResult}>
            <Ionicons name="checkmark-circle" size={16} color={C.primary} />
            <Text style={s.freqResultText}>{freqLabel}</Text>
          </View>
        ) : (
          <Text style={s.freqHint}>Tocá los días que querés entrenar</Text>
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: C.bg },
  topLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, opacity: 0.4, zIndex: 10 },
  scroll:  { padding: 24, paddingBottom: 16 },

  // ── Steps indicator (centrado con tamaños fijos) ──
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  stepItem:       { flexDirection: 'row', alignItems: 'center' },
  stepDot:        { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center', backgroundColor: C.card },
  stepDotActive:  { borderColor: C.primary, backgroundColor: C.primary },
  stepDotDone:    { borderColor: C.primary, backgroundColor: C.primary },
  stepNum:        { color: C.neutral, fontSize: 13, fontFamily: 'SpaceGrotesk_700Bold' },
  stepLine:       { width: 48, height: 1.5, backgroundColor: C.border, marginHorizontal: 6 },
  stepLineDone:   { backgroundColor: C.primary },

  // ── Step content ──
  stepTitle: { color: C.textHi, fontSize: 28, fontFamily: 'SpaceGrotesk_700Bold', lineHeight: 34, marginBottom: 8 },
  stepSub:   { color: C.textLo, fontSize: 14, fontFamily: 'SpaceGrotesk_400Regular', marginBottom: 28 },

  // ── Step 1 ──
  inputWrap:  { backgroundColor: C.card, borderRadius: 14, borderWidth: 1.5, borderColor: C.border, overflow: 'hidden' },
  input:      { color: C.textHi, fontSize: 18, fontFamily: 'SpaceGrotesk_600SemiBold', paddingHorizontal: 20, paddingVertical: 18 },
  charCount:  { color: C.neutral, fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular', textAlign: 'right', paddingHorizontal: 16, paddingBottom: 10 },

  // ── Step 2 ──
  disciplineGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  disciplineChip:      { width: '30%', flexGrow: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 8, backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border },
  disciplineChipActive:{ backgroundColor: C.primary, borderColor: C.primary },
  disciplineText:      { color: C.neutral, fontSize: 11, fontFamily: 'SpaceGrotesk_600SemiBold', textAlign: 'center' },
  disciplineTextActive:{ color: C.bg },

  // ── Step 3 ──
  summaryCard:       { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.primaryDim, padding: 16, marginBottom: 24 },
  summaryLabel:      { color: C.neutral, fontSize: 9, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 2, marginBottom: 4 },
  summaryName:       { color: C.textHi, fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold' },
  summaryDiscipline: { color: C.primary, fontSize: 13, fontFamily: 'SpaceGrotesk_600SemiBold', marginTop: 2 },

  daySelector: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 20, alignItems: 'center' },
  dayDotsRow:  { flexDirection: 'row', gap: 8, marginBottom: 20 },

  dayDot:       { width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', justifyContent: 'center', backgroundColor: C.cardDeep },
  dayDotActive: { backgroundColor: C.primary, borderColor: C.primary },

  dayLabel:       { color: C.neutral, fontSize: 12, fontFamily: 'SpaceGrotesk_700Bold' },
  dayLabelActive: { color: C.bg },

  freqResult:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  freqResultText: { color: C.primary, fontSize: 14, fontFamily: 'SpaceGrotesk_700Bold' },
  freqHint:       { color: C.neutral, fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular' },

  // ── Footer ──
  footer:         { padding: 20, paddingBottom: 32 },
  ctaBtn:         { borderRadius: 14, overflow: 'hidden' },
  ctaGrad:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
  ctaGradDisabled:{ backgroundColor: C.cardDeep },
  ctaText:        { color: C.primary, fontSize: 14, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1.5 },
});

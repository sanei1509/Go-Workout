import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAlert } from '@/components/AppAlert';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import {
  createPlan,
  getPlansAssignedByTrainer,
  FREQUENCIES,
} from '@/lib/services/planService';
import { getProfile } from '@/lib/services/profileService';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeTokens } from '@/constants/theme';

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

export default function AssignPlanScreen() {
  const { id: studentId } = useLocalSearchParams<{ id: string }>();
  const { user, profile } = useAuth();
  const { showAlert } = useAlert();

  const [studentName, setStudentName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName]             = useState('');
  const [discipline, setDiscipline] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [step, setStep]             = useState(1);

  const { T, activeTheme } = useTheme();
  const actionDimBg = activeTheme === 'dark' ? '#00566a' : '#e0f7fa';
  const s = useMemo(() => createStyles(T, actionDimBg), [T, actionDimBg]);

  // Disciplinas del entrenador acotan el paso 2. Si tiene una sola, se saltea.
  const trainerDisciplines = profile?.disciplines ?? [];
  const skipDisciplineStep = trainerDisciplines.length === 1;

  useEffect(() => {
    if (studentId) {
      getProfile(studentId).then(({ profile: p }) => {
        setStudentName(p?.full_name || p?.email?.split('@')[0] || 'tu alumno');
      });
    }
  }, [studentId]);

  useEffect(() => {
    if (skipDisciplineStep && !discipline) {
      setDiscipline(trainerDisciplines[0]);
    }
  }, [skipDisciplineStep, discipline, trainerDisciplines]);

  const handleGoBack = () => {
    if (step === 3 && skipDisciplineStep) setStep(1);
    else if (step > 1) setStep(step - 1);
    else router.navigate(`/trainer/students/${studentId}`);
  };

  const canProceed = () => {
    if (step === 1) return name.trim().length >= 2;
    if (step === 2) return discipline !== null;
    if (step === 3) return selectedDays.length > 0;
    return false;
  };

  const handleNext = () => {
    if (step === 1) setStep(skipDisciplineStep ? 3 : 2);
    else if (step < TOTAL_STEPS) setStep(step + 1);
    else handleSubmit();
  };

  const handleSelectDiscipline = async (d: string) => {
    setDiscipline(d);

    // Aviso suave (no bloqueante) si ya le asignó un plan de esta disciplina
    if (user?.id && studentId) {
      const { plans } = await getPlansAssignedByTrainer(user.id, studentId);
      const existing = plans.find((p) => p.discipline === d);
      if (existing) {
        showAlert(
          'Ya tiene un plan de ' + d,
          `Le asignaste "${existing.name}" de esta disciplina. Podés crear otro igual.`
        );
      }
    }

    setTimeout(() => setStep(3), 200);
  };

  const handleToggleDay = (day: number) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = async () => {
    if (!user?.id || !studentId || !discipline || selectedDays.length === 0) return;
    setIsSubmitting(true);
    const sorted = [...selectedDays].sort((a, b) => a - b);
    const { plan, error } = await createPlan(studentId, {
      name: name.trim(),
      discipline,
      weekly_frequency: selectedDays.length,
      training_days: sorted,
      trainer_id: user.id,
    });
    setIsSubmitting(false);
    if (error) {
      showAlert('Error', error.message);
      return;
    }
    router.replace(`/trainer/plan/${plan?.id}`);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <KeyboardAvoidingView
        style={s.safe}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <LinearGradient
          colors={['transparent', T.action, 'transparent']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={s.topLine}
        />

        {/* ── Top bar custom (headerShown false) ────────────── */}
        <View style={s.topBar}>
          <TouchableOpacity onPress={handleGoBack} style={{ padding: 4 }}>
            <Ionicons name="chevron-back" size={24} color={T.action} />
          </TouchableOpacity>
          <View style={s.forBadge}>
            <Ionicons name="person-outline" size={11} color={T.attention} />
            <Text style={s.forBadgeText}>PARA {studentName.toUpperCase()}</Text>
          </View>
          <View style={{ width: 32 }} />
        </View>

        {/* ── Steps indicator ──────────────────────────────── */}
        <View style={s.stepsRow}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => {
            const n      = i + 1;
            const done   = n < step || (n === 2 && skipDisciplineStep && step === 3);
            const active = n === step;
            return (
              <View key={n} style={s.stepItem}>
                <View style={[s.stepDot, active && s.stepDotActive, done && s.stepDotDone]}>
                  {done
                    ? <Ionicons name="checkmark" size={13} color={T.surface} />
                    : <Text style={[s.stepNum, (active || done) && { color: T.surface }]}>{n}</Text>
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
          {step === 1 && <Step1 name={name} setName={setName} studentName={studentName} />}
          {step === 2 && (
            <Step2
              discipline={discipline}
              options={trainerDisciplines}
              onSelect={handleSelectDiscipline}
            />
          )}
          {step === 3 && (
            <Step3
              name={name}
              discipline={discipline!}
              studentName={studentName}
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
                  colors={[actionDimBg, '#003d4d']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={s.ctaGrad}
                >
                  <Text style={s.ctaText}>
                    {step === TOTAL_STEPS ? 'ASIGNAR PLAN' : 'CONTINUAR'}
                  </Text>
                  <Ionicons
                    name={step === TOTAL_STEPS ? 'checkmark-circle-outline' : 'arrow-forward'}
                    size={18}
                    color={T.action}
                  />
                </LinearGradient>
              ) : (
                <View style={[s.ctaGrad, s.ctaGradDisabled]}>
                  {isSubmitting
                    ? <ActivityIndicator color={T.action} />
                    : <Text style={[s.ctaText, { color: T.textSecondary }]}>
                        {step === TOTAL_STEPS ? 'ASIGNAR PLAN' : 'CONTINUAR'}
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

function Step1({ name, setName, studentName }: {
  name: string; setName: (v: string) => void; studentName: string;
}) {
  const { T } = useTheme();
  return (
    <View>
      <Text style={s1.stepTitle(T)}>¿Cómo se llama{'\n'}el plan?</Text>
      <Text style={s1.stepSub(T)}>Un nombre claro ayuda a {studentName} a identificarlo</Text>

      <View style={s1.inputWrap(T)}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Ej: Hipertrofia 4 días..."
          placeholderTextColor={T.textSecondary}
          style={s1.input(T)}
          autoFocus
          maxLength={50}
          returnKeyType="next"
        />
        <Text style={s1.charCount(T)}>{name.length}/50</Text>
      </View>
    </View>
  );
}

// ─── Step 2: Disciplina (acotada a las del entrenador) ───────────────────────

function Step2({ discipline, options, onSelect }: {
  discipline: string | null; options: string[]; onSelect: (d: string) => void;
}) {
  const { T } = useTheme();
  return (
    <View>
      <Text style={s1.stepTitle(T)}>¿Qué disciplina{'\n'}va a entrenar?</Text>
      <Text style={s1.stepSub(T)}>Tus disciplinas declaradas · Tocá una para continuar</Text>

      <View style={s1.disciplineGrid}>
        {options.map((d) => {
          const active = discipline === d;
          return (
            <TouchableOpacity
              key={d}
              onPress={() => onSelect(d)}
              activeOpacity={0.75}
              style={[s1.disciplineChip(T), active && s1.disciplineChipActive(T)]}
            >
              <Ionicons
                name={(DISCIPLINE_ICONS[d] ?? 'apps-outline') as any}
                size={18}
                color={active ? T.surface : T.textSecondary}
                style={{ marginBottom: 5 }}
              />
              <Text style={[s1.disciplineText(T), active && s1.disciplineTextActive(T)]}>{d}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Step 3: Días ─────────────────────────────────────────────────────────────

function Step3({
  name, discipline, studentName, selectedDays, onToggleDay,
}: {
  name: string; discipline: string; studentName: string;
  selectedDays: number[]; onToggleDay: (day: number) => void;
}) {
  const { T, activeTheme } = useTheme();
  const actionDimBg = activeTheme === 'dark' ? '#00566a' : '#e0f7fa';
  const count = selectedDays.length;
  const freqLabel = count > 0
    ? FREQUENCIES.find(f => f.value === count)?.label ?? `${count} días por semana`
    : null;

  return (
    <View>
      <Text style={s1.stepTitle(T)}>¿Qué días{'\n'}entrena?</Text>
      <Text style={s1.stepSub(T)}>Seleccioná uno o varios días</Text>

      {/* Resumen */}
      <View style={s1.summaryCard(T, actionDimBg)}>
        <Text style={s1.summaryLabel(T)}>PLAN PARA {studentName.toUpperCase()}</Text>
        <Text style={s1.summaryName(T)}>{name}</Text>
        <Text style={s1.summaryDiscipline(T)}>{discipline}</Text>
      </View>

      {/* Selector de días */}
      <View style={s1.daySelector(T)}>
        <View style={s1.dayDotsRow}>
          {DAY_LABELS.map((label, i) => {
            const dayNum  = i + 1;
            const active  = selectedDays.includes(dayNum);
            return (
              <TouchableOpacity
                key={label}
                onPress={() => onToggleDay(dayNum)}
                activeOpacity={0.7}
                style={[s1.dayDot(T), active && s1.dayDotActive(T)]}
              >
                <Text style={[s1.dayLabel(T), active && s1.dayLabelActive(T)]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {freqLabel ? (
          <View style={s1.freqResult}>
            <Ionicons name="checkmark-circle" size={16} color={T.action} />
            <Text style={s1.freqResultText(T)}>{freqLabel}</Text>
          </View>
        ) : (
          <Text style={s1.freqHint(T)}>Tocá los días que va a entrenar</Text>
        )}
      </View>
    </View>
  );
}

// ─── Inline style helpers for sub-components ─────────────────────────────────

const s1 = {
  stepTitle:            (T: ThemeTokens) => ({ color: T.textPrimary, fontSize: 28, fontFamily: 'SpaceGrotesk_700Bold', lineHeight: 34, marginBottom: 8 } as const),
  stepSub:              (T: ThemeTokens) => ({ color: T.textSecondary, fontSize: 14, fontFamily: 'SpaceGrotesk_400Regular', marginBottom: 28 } as const),
  inputWrap:            (T: ThemeTokens) => ({ backgroundColor: T.surfaceElevated, borderRadius: 14, borderWidth: 1.5, borderColor: T.border, overflow: 'hidden' as const }),
  input:                (T: ThemeTokens) => ({ color: T.textPrimary, fontSize: 18, fontFamily: 'SpaceGrotesk_600SemiBold', paddingHorizontal: 20, paddingVertical: 18 } as const),
  charCount:            (T: ThemeTokens) => ({ color: T.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular', textAlign: 'right' as const, paddingHorizontal: 16, paddingBottom: 10 }),
  disciplineGrid:       { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: 10 },
  disciplineChip:       (T: ThemeTokens) => ({ width: '30%' as any, flexGrow: 1, alignItems: 'center' as const, paddingVertical: 14, paddingHorizontal: 8, backgroundColor: T.surfaceElevated, borderRadius: 12, borderWidth: 1, borderColor: T.border }),
  disciplineChipActive: (T: ThemeTokens) => ({ backgroundColor: T.action, borderColor: T.action }),
  disciplineText:       (T: ThemeTokens) => ({ color: T.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk_600SemiBold', textAlign: 'center' as const }),
  disciplineTextActive: (T: ThemeTokens) => ({ color: T.surface }),
  summaryCard:          (T: ThemeTokens, actionDimBg: string) => ({ backgroundColor: T.surfaceElevated, borderRadius: 12, borderWidth: 1, borderColor: actionDimBg, padding: 16, marginBottom: 24 }),
  summaryLabel:         (T: ThemeTokens) => ({ color: T.textSecondary, fontSize: 9, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 2, marginBottom: 4 } as const),
  summaryName:          (T: ThemeTokens) => ({ color: T.textPrimary, fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold' } as const),
  summaryDiscipline:    (T: ThemeTokens) => ({ color: T.action, fontSize: 13, fontFamily: 'SpaceGrotesk_600SemiBold', marginTop: 2 } as const),
  daySelector:          (T: ThemeTokens) => ({ backgroundColor: T.surfaceElevated, borderRadius: 16, borderWidth: 1, borderColor: T.border, padding: 20, alignItems: 'center' as const }),
  dayDotsRow:           { flexDirection: 'row' as const, gap: 8, marginBottom: 20 },
  dayDot:               (T: ThemeTokens) => ({ width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, borderColor: T.border, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: T.border }),
  dayDotActive:         (T: ThemeTokens) => ({ backgroundColor: T.action, borderColor: T.action }),
  dayLabel:             (T: ThemeTokens) => ({ color: T.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk_700Bold' } as const),
  dayLabelActive:       (T: ThemeTokens) => ({ color: T.surface }),
  freqResult:           { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 },
  freqResultText:       (T: ThemeTokens) => ({ color: T.action, fontSize: 14, fontFamily: 'SpaceGrotesk_700Bold' } as const),
  freqHint:             (T: ThemeTokens) => ({ color: T.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular' } as const),
};

// ─── Styles ───────────────────────────────────────────────────────────────────

function createStyles(T: ThemeTokens, actionDimBg = '#00566a') {
  return StyleSheet.create({
    safe:    { flex: 1, backgroundColor: T.surface },
    topLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, opacity: 0.4, zIndex: 10 },
    scroll:  { padding: 24, paddingBottom: 16 },

    topBar: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingTop: 56, paddingHorizontal: 16,
    },
    forBadge:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#130d00', borderWidth: 1, borderColor: '#4a3200' },
    forBadgeText: { color: T.attention, fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1.5 },

    // ── Steps indicator ──
    stepsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
    },
    stepItem:       { flexDirection: 'row', alignItems: 'center' },
    stepDot:        { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: T.border, alignItems: 'center', justifyContent: 'center', backgroundColor: T.surfaceElevated },
    stepDotActive:  { borderColor: T.action, backgroundColor: T.action },
    stepDotDone:    { borderColor: T.action, backgroundColor: T.action },
    stepNum:        { color: T.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk_700Bold' },
    stepLine:       { width: 48, height: 1.5, backgroundColor: T.border, marginHorizontal: 6 },
    stepLineDone:   { backgroundColor: T.action },

    // ── Footer ──
    footer:         { padding: 20, paddingBottom: 32 },
    ctaBtn:         { borderRadius: 14, overflow: 'hidden' },
    ctaGrad:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
    ctaGradDisabled:{ backgroundColor: T.border },
    ctaText:        { color: T.action, fontSize: 14, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1.5 },
  });
}

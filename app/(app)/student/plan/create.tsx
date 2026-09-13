import { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAlert } from '@/components/AppAlert';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { createPlan, getUserPlans, updatePlan, DISCIPLINES, FREQUENCIES } from '@/lib/services/planService';
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

interface ConflictModal {
  visible: boolean;
  discipline: string;
  existingName: string;
  existingId: string;
}

export default function CreatePlanScreen() {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName]             = useState('');
  const [discipline, setDiscipline] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [step, setStep]             = useState(1);
  const [conflict, setConflict] = useState<ConflictModal>({
    visible: false, discipline: '', existingName: '', existingId: '',
  });

  const { T, activeTheme } = useTheme();
  const actionDimBg = activeTheme === 'dark' ? '#00566a' : '#e0f7fa';
  const s = useMemo(() => createStyles(T, actionDimBg), [T, actionDimBg]);

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

  const handleSelectDiscipline = async (d: string) => {
    setDiscipline(d);

    if (user?.id) {
      const { plans } = await getUserPlans(user.id);
      // Solo planes propios: los asignados por un entrenador no se pueden desactivar
      const existing = plans.find(p => p.discipline === d && !p.trainer_id);

      if (existing) {
        setConflict({ visible: true, discipline: d, existingName: existing.name, existingId: existing.id });
        return;
      }
    }

    setTimeout(() => setStep(3), 200);
  };

  const handleConflictModify = () => {
    setConflict(c => ({ ...c, visible: false }));
    router.replace(`/student/plan/${conflict.existingId}` as any);
  };

  const handleConflictReplace = async () => {
    setConflict(c => ({ ...c, visible: false }));
    await updatePlan(conflict.existingId, { is_active: false });
    setTimeout(() => setStep(3), 200);
  };

  const handleConflictCancel = () => {
    setConflict(c => ({ ...c, visible: false }));
    setDiscipline(null);
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
      showAlert('Error', error.message);
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
                  colors={[actionDimBg, '#003d4d']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={s.ctaGrad}
                >
                  <Text style={s.ctaText}>
                    {step === TOTAL_STEPS ? 'CREAR PLAN' : 'CONTINUAR'}
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
                        {step === TOTAL_STEPS ? 'CREAR PLAN' : 'CONTINUAR'}
                      </Text>
                  }
                </View>
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* ── Conflict Modal ───────────────────────────────────── */}
      <Modal visible={conflict.visible} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <LinearGradient
              colors={['transparent', T.attention, 'transparent']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={s.modalTopLine}
            />
            <View style={s.modalIconWrap}>
              <Ionicons name="warning-outline" size={28} color={T.attention} />
            </View>
            <Text style={s.modalTitle}>Plan activo en {conflict.discipline}</Text>
            <Text style={s.modalDesc}>
              Ya tenés <Text style={s.modalHighlight}>"{conflict.existingName}"</Text> activo.{'\n'}¿Qué querés hacer?
            </Text>

            <TouchableOpacity onPress={handleConflictModify} activeOpacity={0.85} style={s.modalBtnPrimary}>
              <Ionicons name="create-outline" size={18} color={T.action} />
              <Text style={s.modalBtnPrimaryText}>MODIFICAR EL EXISTENTE</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleConflictReplace} activeOpacity={0.85} style={s.modalBtnDanger}>
              <Ionicons name="swap-horizontal-outline" size={18} color="#ff6b6b" />
              <Text style={s.modalBtnDangerText}>DESACTIVAR Y CREAR NUEVO</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleConflictCancel} activeOpacity={0.7} style={s.modalBtnCancel}>
              <Text style={s.modalBtnCancelText}>CANCELAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

// ─── Step 1: Nombre ───────────────────────────────────────────────────────────

function Step1({ name, setName }: { name: string; setName: (v: string) => void }) {
  const { T, activeTheme } = useTheme();
  const actionDimBg = activeTheme === 'dark' ? '#00566a' : '#e0f7fa';
  const s = useMemo(() => createStyles(T, actionDimBg), [T, actionDimBg]);
  return (
    <View>
      <Text style={s.stepTitle}>¿Cómo se llama{'\n'}tu plan?</Text>
      <Text style={s.stepSub}>Dale un nombre que te ayude a identificarlo</Text>

      <View style={s.inputWrap}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Ej: Rutina de fuerza..."
          placeholderTextColor={T.textSecondary}
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
  const { T, activeTheme } = useTheme();
  const actionDimBg = activeTheme === 'dark' ? '#00566a' : '#e0f7fa';
  const s = useMemo(() => createStyles(T, actionDimBg), [T, actionDimBg]);
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
                color={active ? T.surface : T.textSecondary}
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
  const { T, activeTheme } = useTheme();
  const actionDimBg = activeTheme === 'dark' ? '#00566a' : '#e0f7fa';
  const s = useMemo(() => createStyles(T, actionDimBg), [T, actionDimBg]);
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
            <Ionicons name="checkmark-circle" size={16} color={T.action} />
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

function createStyles(T: ThemeTokens, actionDimBg: string) {
  return StyleSheet.create({
    safe:    { flex: 1, backgroundColor: T.surface },
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
    stepDot:        { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: T.border, alignItems: 'center', justifyContent: 'center', backgroundColor: T.surfaceElevated },
    stepDotActive:  { borderColor: T.action, backgroundColor: T.action },
    stepDotDone:    { borderColor: T.action, backgroundColor: T.action },
    stepNum:        { color: T.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk_700Bold' },
    stepLine:       { width: 48, height: 1.5, backgroundColor: T.border, marginHorizontal: 6 },
    stepLineDone:   { backgroundColor: T.action },

    // ── Step content ──
    stepTitle: { color: T.textPrimary, fontSize: 28, fontFamily: 'SpaceGrotesk_700Bold', lineHeight: 34, marginBottom: 8 },
    stepSub:   { color: T.textSecondary, fontSize: 14, fontFamily: 'SpaceGrotesk_400Regular', marginBottom: 28 },

    // ── Step 1 ──
    inputWrap:  { backgroundColor: T.surfaceElevated, borderRadius: 14, borderWidth: 1.5, borderColor: T.border, overflow: 'hidden' },
    input:      { color: T.textPrimary, fontSize: 18, fontFamily: 'SpaceGrotesk_600SemiBold', paddingHorizontal: 20, paddingVertical: 18 },
    charCount:  { color: T.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular', textAlign: 'right', paddingHorizontal: 16, paddingBottom: 10 },

    // ── Step 2 ──
    disciplineGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    disciplineChip:      { width: '30%', flexGrow: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 8, backgroundColor: T.surfaceElevated, borderRadius: 12, borderWidth: 1, borderColor: T.border },
    disciplineChipActive:{ backgroundColor: T.action, borderColor: T.action },
    disciplineText:      { color: T.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk_600SemiBold', textAlign: 'center' },
    disciplineTextActive:{ color: T.surface },

    // ── Step 3 ──
    summaryCard:       { backgroundColor: T.surfaceElevated, borderRadius: 12, borderWidth: 1, borderColor: actionDimBg, padding: 16, marginBottom: 24 },
    summaryLabel:      { color: T.textSecondary, fontSize: 9, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 2, marginBottom: 4 },
    summaryName:       { color: T.textPrimary, fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold' },
    summaryDiscipline: { color: T.action, fontSize: 13, fontFamily: 'SpaceGrotesk_600SemiBold', marginTop: 2 },

    daySelector: { backgroundColor: T.surfaceElevated, borderRadius: 16, borderWidth: 1, borderColor: T.border, padding: 20, alignItems: 'center' },
    dayDotsRow:  { flexDirection: 'row', gap: 8, marginBottom: 20 },

    dayDot:       { width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, borderColor: T.border, alignItems: 'center', justifyContent: 'center', backgroundColor: T.border },
    dayDotActive: { backgroundColor: T.action, borderColor: T.action },

    dayLabel:       { color: T.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk_700Bold' },
    dayLabelActive: { color: T.surface },

    freqResult:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
    freqResultText: { color: T.action, fontSize: 14, fontFamily: 'SpaceGrotesk_700Bold' },
    freqHint:       { color: T.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular' },

    // ── Conflict Modal ──
    modalOverlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
    modalCard:          { width: '100%', backgroundColor: T.surfaceElevated, borderRadius: 18, borderWidth: 1, borderColor: T.border, overflow: 'hidden', paddingHorizontal: 24, paddingBottom: 24 },
    modalTopLine:       { height: 2, opacity: 0.7, marginBottom: 24 },
    modalIconWrap:      { width: 52, height: 52, borderRadius: 26, backgroundColor: '#2a1f00', borderWidth: 1, borderColor: T.attention, alignItems: 'center', justifyContent: 'center', marginBottom: 16, alignSelf: 'center' },
    modalTitle:         { color: T.textPrimary, fontSize: 17, fontFamily: 'SpaceGrotesk_700Bold', textAlign: 'center', marginBottom: 10 },
    modalDesc:          { color: T.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
    modalHighlight:     { color: T.textPrimary, fontFamily: 'SpaceGrotesk_600SemiBold' },
    modalBtnPrimary:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: actionDimBg, borderRadius: 10, paddingVertical: 14, marginBottom: 10 },
    modalBtnPrimaryText:{ color: T.action, fontSize: 12, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1 },
    modalBtnDanger:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#2a0f0f', borderRadius: 10, paddingVertical: 14, marginBottom: 10, borderWidth: 1, borderColor: '#ff6b6b40' },
    modalBtnDangerText: { color: '#ff6b6b', fontSize: 12, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1 },
    modalBtnCancel:     { alignItems: 'center', paddingVertical: 12 },
    modalBtnCancelText: { color: T.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1 },

    // ── Footer ──
    footer:         { padding: 20, paddingBottom: 32 },
    ctaBtn:         { borderRadius: 14, overflow: 'hidden' },
    ctaGrad:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
    ctaGradDisabled:{ backgroundColor: T.border },
    ctaText:        { color: T.action, fontSize: 14, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1.5 },
  });
}

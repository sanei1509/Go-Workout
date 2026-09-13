import { useState, useMemo, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useAlert } from '@/components/AppAlert';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeTokens } from '@/constants/theme';
import {
  upsertTrainingProfile,
  type ExperienceLevel,
  type TrainingLocation,
  type PrimaryGoal,
} from '@/lib/services/trainingProfileService';
import {
  PLAN_TEMPLATES,
  filterTemplatesForProfile,
  suggestTemplateId,
  materializePlanFromTemplate,
  getNextTrainingDay,
  type PlanTemplate,
} from '@/lib/planTemplates';
import { getDayLabel } from '@/lib/services/todayService';

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const TOTAL_STEPS = 6;

const EXPERIENCE_OPTIONS: { value: ExperienceLevel; label: string; desc: string }[] = [
  { value: 'beginner', label: 'Principiante', desc: 'Menos de 6 meses entrenando' },
  { value: 'intermediate', label: 'Intermedio', desc: '6 meses a 2 años' },
  { value: 'advanced', label: 'Avanzado', desc: 'Más de 2 años constantes' },
];

const LOCATION_OPTIONS: { value: TrainingLocation; label: string; icon: string }[] = [
  { value: 'gym', label: 'Gimnasio', icon: 'barbell-outline' },
  { value: 'home', label: 'Casa', icon: 'home-outline' },
  { value: 'both', label: 'Ambos', icon: 'swap-horizontal-outline' },
];

const GOAL_OPTIONS: { value: PrimaryGoal; label: string }[] = [
  { value: 'general_fitness', label: 'Estar en forma' },
  { value: 'strength', label: 'Ganar fuerza' },
  { value: 'hypertrophy', label: 'Ganar músculo' },
  { value: 'fat_loss', label: 'Perder grasa' },
  { value: 'mobility', label: 'Movilidad' },
];

const EQUIPMENT_OPTIONS = [
  'Mancuernas', 'Barra', 'Bandas', 'Banco', 'Solo peso corporal',
];

const DURATION_OPTIONS = [30, 45, 60, 75, 90];

export default function PlanSetupScreen() {
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const { T, activeTheme } = useTheme();
  const actionDimBg = activeTheme === 'dark' ? '#00566a' : '#e0f7fa';
  const s = useMemo(() => createStyles(T, actionDimBg), [T, actionDimBg]);

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1
  const [safetyAccepted, setSafetyAccepted] = useState(false);

  // Profile
  const [experience, setExperience] = useState<ExperienceLevel>('beginner');
  const [location, setLocation] = useState<TrainingLocation>('gym');
  const [goal, setGoal] = useState<PrimaryGoal>('general_fitness');
  const [equipment, setEquipment] = useState<string[]>([]);
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 3, 5]);
  const [duration, setDuration] = useState(60);
  const [injuries, setInjuries] = useState('');
  const [templateId, setTemplateId] = useState('full_body_strength_3');
  const [planName, setPlanName] = useState('');

  // Success
  const [success, setSuccess] = useState<{
    planId: string;
    routineId: string | null;
    sessionLabel: string;
    isToday: boolean;
  } | null>(null);

  const profileDraft = useMemo(() => ({
    experience_level: experience,
    training_location: location,
    primary_goal: goal,
  }), [experience, location, goal]);

  const matchingTemplates = useMemo(
    () => filterTemplatesForProfile(profileDraft, selectedDays.length),
    [profileDraft, selectedDays.length]
  );

  useEffect(() => {
    const suggested = suggestTemplateId(profileDraft, selectedDays.length);
    setTemplateId(suggested);
    const tpl = PLAN_TEMPLATES.find(t => t.id === suggested);
    if (tpl && !planName) setPlanName(tpl.name);
  }, [profileDraft, selectedDays.length]);

  const selectedTemplate = PLAN_TEMPLATES.find(t => t.id === templateId);

  const toggleDay = (day: number) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const toggleEquipment = (item: string) => {
    setEquipment(prev =>
      prev.includes(item) ? prev.filter(e => e !== item) : [...prev, item]
    );
  };

  const canProceed = () => {
    if (step === 1) return safetyAccepted;
    if (step === 2) return true;
    if (step === 3) return true;
    if (step === 4) return selectedDays.length > 0;
    if (step === 5) return !!selectedTemplate && selectedDays.length >= selectedTemplate.minDays;
    if (step === 6) return planName.trim().length >= 2;
    return false;
  };

  const handleBack = () => {
    if (success) { router.replace('/student'); return; }
    if (step > 1) setStep(step - 1);
    else router.back();
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS) setStep(step + 1);
    else handleConfirm();
  };

  const handleConfirm = async () => {
    if (!user?.id || !selectedTemplate) return;

    if (selectedDays.length < selectedTemplate.minDays) {
      showAlert('Días insuficientes', `Esta plantilla necesita ${selectedTemplate.minDays} días.`);
      return;
    }

    setIsSubmitting(true);

    await upsertTrainingProfile(user.id, {
      experience_level: experience,
      training_location: location,
      primary_goal: goal,
      equipment,
      injuries_notes: injuries.trim() || null,
      session_duration_minutes: duration,
      safety_acknowledged_at: new Date().toISOString(),
      onboarding_completed_at: new Date().toISOString(),
    });

    const daysToUse = [...selectedDays].sort((a, b) => a - b).slice(0, selectedTemplate.routines.length);

    const { result, error } = await materializePlanFromTemplate({
      userId: user.id,
      templateId: selectedTemplate.id,
      trainingDays: daysToUse,
      planName: planName.trim(),
      injuriesNotes: injuries.trim() || null,
    });

    setIsSubmitting(false);

    if (error || !result) {
      showAlert('Error', error?.message ?? 'No se pudo crear el plan');
      return;
    }

    const next = getNextTrainingDay(daysToUse);
    setSuccess({
      planId: result.planId,
      routineId: result.firstRoutineId,
      sessionLabel: next.isToday ? 'hoy' : next.label,
      isToday: next.isToday,
    });
  };

  if (success) {
    return (
      <>
        <Stack.Screen options={{ title: '', headerShown: false }} />
        <View style={s.safe}>
          <LinearGradient colors={['transparent', T.done, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.topLine} />
          <View style={s.successWrap}>
            <View style={s.successIcon}>
              <Ionicons name="checkmark-circle" size={56} color={T.done} />
            </View>
            <Text style={s.successTitle}>¡Plan listo!</Text>
            <Text style={s.successDesc}>
              Tu primera sesión es {success.sessionLabel}.
              {'\n'}Podés ajustar ejercicios cuando quieras.
            </Text>

            {success.isToday && success.routineId ? (
              <TouchableOpacity
                onPress={() => router.replace(`/student/workout/${success.routineId}`)}
                activeOpacity={0.85}
                style={s.ctaBtn}
              >
                <LinearGradient colors={[actionDimBg, '#003d4d']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.ctaGrad}>
                  <Text style={s.ctaText}>ENTRENAR AHORA</Text>
                  <Ionicons name="play" size={18} color={T.action} />
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => router.replace(`/student/plan/${success.planId}`)}
                activeOpacity={0.85}
                style={s.ctaBtn}
              >
                <LinearGradient colors={[actionDimBg, '#003d4d']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.ctaGrad}>
                  <Text style={s.ctaText}>VER MI PLAN</Text>
                  <Ionicons name="arrow-forward" size={18} color={T.action} />
                </LinearGradient>
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={() => router.replace('/student')} style={s.linkBtn}>
              <Text style={s.linkBtnText}>Ir al inicio</Text>
            </TouchableOpacity>
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{
        title: 'ARMAR MI PLAN',
        headerLeft: () => (
          <TouchableOpacity onPress={handleBack} style={{ marginLeft: 4, padding: 4 }}>
            <Ionicons name="chevron-back" size={24} color={T.action} />
          </TouchableOpacity>
        ),
      }} />

      <KeyboardAvoidingView style={s.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <LinearGradient colors={['transparent', T.action, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.topLine} />

        <View style={s.stepsRow}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => {
            const n = i + 1;
            const done = n < step;
            const active = n === step;
            return (
              <View key={n} style={[s.stepDot, active && s.stepDotActive, done && s.stepDotDone]}>
                {done ? <Ionicons name="checkmark" size={12} color={T.surface} /> : (
                  <Text style={[s.stepNum, (active || done) && { color: T.surface }]}>{n}</Text>
                )}
              </View>
            );
          })}
        </View>

        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          {step === 1 && (
            <>
              <Text style={s.title}>Antes de empezar</Text>
              <Text style={s.subtitle}>
                GO Workout te ayuda a entrenar por tu cuenta, pero no reemplaza la atención de un profesional de la salud.
              </Text>
              <View style={s.warningCard}>
                <Ionicons name="medical-outline" size={22} color={T.attention} />
                <Text style={s.warningText}>
                  Si tenés dolor agudo, lesión reciente o condición médica, consultá a un médico antes de entrenar.
                  Informá tus restricciones en el paso 4 para adaptar el plan.
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSafetyAccepted(v => !v)} style={s.checkRow} activeOpacity={0.8}>
                <View style={[s.checkbox, safetyAccepted && s.checkboxOn]}>
                  {safetyAccepted && <Ionicons name="checkmark" size={14} color={T.surface} />}
                </View>
                <Text style={s.checkLabel}>Entiendo y quiero continuar</Text>
              </TouchableOpacity>
            </>
          )}

          {step === 2 && (
            <>
              <Text style={s.title}>Tu experiencia</Text>
              <Text style={s.subtitle}>Así calibramos volumen e intensidad</Text>
              {EXPERIENCE_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setExperience(opt.value)}
                  style={[s.optionCard, experience === opt.value && s.optionCardActive]}
                  activeOpacity={0.85}
                >
                  <Text style={[s.optionTitle, experience === opt.value && s.optionTitleActive]}>{opt.label}</Text>
                  <Text style={s.optionDesc}>{opt.desc}</Text>
                </TouchableOpacity>
              ))}
            </>
          )}

          {step === 3 && (
            <>
              <Text style={s.title}>¿Dónde entrenás?</Text>
              <View style={s.chipRow}>
                {LOCATION_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setLocation(opt.value)}
                    style={[s.chip, location === opt.value && s.chipActive]}
                    activeOpacity={0.8}
                  >
                    <Ionicons name={opt.icon as any} size={16} color={location === opt.value ? T.surface : T.textSecondary} />
                    <Text style={[s.chipText, location === opt.value && s.chipTextActive]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[s.sectionLabel, { marginTop: 24 }]}>OBJETIVO PRINCIPAL</Text>
              <View style={s.chipRow}>
                {GOAL_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setGoal(opt.value)}
                    style={[s.chip, goal === opt.value && s.chipActive]}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.chipText, goal === opt.value && s.chipTextActive]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {(location === 'home' || location === 'both') && (
                <>
                  <Text style={[s.sectionLabel, { marginTop: 24 }]}>EQUIPAMIENTO DISPONIBLE</Text>
                  <View style={s.chipRow}>
                    {EQUIPMENT_OPTIONS.map(item => (
                      <TouchableOpacity
                        key={item}
                        onPress={() => toggleEquipment(item)}
                        style={[s.chip, equipment.includes(item) && s.chipActive]}
                        activeOpacity={0.8}
                      >
                        <Text style={[s.chipText, equipment.includes(item) && s.chipTextActive]}>{item}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
            </>
          )}

          {step === 4 && (
            <>
              <Text style={s.title}>Tu disponibilidad</Text>
              <Text style={s.subtitle}>¿Qué días podés entrenar?</Text>
              <View style={s.dayRow}>
                {DAY_LABELS.map((label, i) => {
                  const dayNum = i + 1;
                  const active = selectedDays.includes(dayNum);
                  return (
                    <TouchableOpacity key={label} onPress={() => toggleDay(dayNum)} style={[s.dayDot, active && s.dayDotActive]}>
                      <Text style={[s.dayLabel, active && s.dayLabelActive]}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={s.hint}>{selectedDays.length} día{selectedDays.length !== 1 ? 's' : ''} por semana</Text>

              <Text style={s.sectionLabel}>DURACIÓN POR SESIÓN</Text>
              <View style={s.chipRow}>
                {DURATION_OPTIONS.map(min => (
                  <TouchableOpacity
                    key={min}
                    onPress={() => setDuration(min)}
                    style={[s.chip, duration === min && s.chipActive]}
                    activeOpacity={0.8}
                  >
                    <Text style={[s.chipText, duration === min && s.chipTextActive]}>{min} min</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.sectionLabel}>LESIONES O RESTRICCIONES (opcional)</Text>
              <TextInput
                value={injuries}
                onChangeText={setInjuries}
                placeholder="Ej: hombro derecho sensible, evitar impacto..."
                placeholderTextColor={T.textSecondary}
                style={s.textArea}
                multiline
                textAlignVertical="top"
              />
            </>
          )}

          {step === 5 && (
            <>
              <Text style={s.title}>Elegí tu plan</Text>
              <Text style={s.subtitle}>
                Recomendado según tu perfil. {selectedDays.length} días/semana.
              </Text>
              {(matchingTemplates.length > 0
                ? matchingTemplates
                : PLAN_TEMPLATES.filter(t => t.minDays <= selectedDays.length && t.maxDays >= selectedDays.length)
              ).map(tpl => (
                <TemplateCard
                  key={tpl.id}
                  template={tpl}
                  selected={templateId === tpl.id}
                  onSelect={() => {
                    setTemplateId(tpl.id);
                    setPlanName(tpl.name);
                    if (selectedDays.length !== tpl.minDays) {
                      const defaults = tpl.minDays === 4 ? [1, 2, 4, 5] : [1, 3, 5];
                      setSelectedDays(defaults.slice(0, tpl.minDays));
                    }
                  }}
                  s={s}
                  T={T}
                />
              ))}
            </>
          )}

          {step === 6 && selectedTemplate && (
            <>
              <Text style={s.title}>Confirmá tu plan</Text>
              <Text style={s.subtitle}>Podés editarlo después desde el detalle del plan</Text>

              <View style={s.inputWrap}>
                <TextInput
                  value={planName}
                  onChangeText={setPlanName}
                  placeholder="Nombre del plan"
                  placeholderTextColor={T.textSecondary}
                  style={s.input}
                  maxLength={50}
                />
              </View>

              <View style={s.previewCard}>
                <Text style={s.previewLabel}>PLANTILLA</Text>
                <Text style={s.previewTitle}>{selectedTemplate.name}</Text>
                <Text style={s.previewMeta}>{selectedTemplate.discipline} · {selectedTemplate.routines.length} rutinas</Text>
                <Text style={s.previewDesc}>{selectedTemplate.description}</Text>

                <Text style={[s.previewLabel, { marginTop: 16 }]}>RUTINAS</Text>
                {selectedTemplate.routines.map((r, i) => (
                  <View key={r.name} style={s.previewRoutine}>
                    <Text style={s.previewRoutineDay}>
                      {getDayLabel(selectedDays.sort((a, b) => a - b)[i] ?? i + 1)}
                    </Text>
                    <Text style={s.previewRoutineName}>{r.name}</Text>
                    <Text style={s.previewRoutineMeta}>
                      {r.blocks.reduce((n, b) => n + b.exercises.length, 0)} ejercicios
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </ScrollView>

        <View style={s.footer}>
          <TouchableOpacity onPress={handleNext} disabled={!canProceed() || isSubmitting} activeOpacity={0.85} style={s.ctaBtn}>
            {canProceed() && !isSubmitting ? (
              <LinearGradient colors={[actionDimBg, '#003d4d']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.ctaGrad}>
                <Text style={s.ctaText}>{step === TOTAL_STEPS ? 'CREAR MI PLAN' : 'CONTINUAR'}</Text>
                <Ionicons name={step === TOTAL_STEPS ? 'checkmark-circle-outline' : 'arrow-forward'} size={18} color={T.action} />
              </LinearGradient>
            ) : (
              <View style={[s.ctaGrad, s.ctaDisabled]}>
                {isSubmitting ? <ActivityIndicator color={T.action} /> : (
                  <Text style={[s.ctaText, { color: T.textSecondary }]}>
                    {step === TOTAL_STEPS ? 'CREAR MI PLAN' : 'CONTINUAR'}
                  </Text>
                )}
              </View>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

function TemplateCard({
  template, selected, onSelect, s, T,
}: {
  template: PlanTemplate;
  selected: boolean;
  onSelect: () => void;
  s: ReturnType<typeof createStyles>;
  T: ThemeTokens;
}) {
  const exCount = template.routines.reduce(
    (n, r) => n + r.blocks.reduce((m, b) => m + b.exercises.length, 0), 0
  );
  return (
    <TouchableOpacity onPress={onSelect} style={[s.templateCard, selected && s.templateCardActive]} activeOpacity={0.85}>
      <View style={{ flex: 1 }}>
        <Text style={[s.templateName, selected && { color: T.action }]}>{template.name}</Text>
        <Text style={s.templateMeta}>{template.minDays} días · {exCount} ejercicios · {template.discipline}</Text>
        <Text style={s.templateDesc}>{template.description}</Text>
      </View>
      {selected && <Ionicons name="checkmark-circle" size={22} color={T.action} />}
    </TouchableOpacity>
  );
}

function createStyles(T: ThemeTokens, actionDimBg: string) {
  return StyleSheet.create({
    safe:    { flex: 1, backgroundColor: T.surface },
    topLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, opacity: 0.4, zIndex: 10 },
    scroll:  { padding: 24, paddingBottom: 16 },

    stepsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 14 },
    stepDot:  { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: T.border, alignItems: 'center', justifyContent: 'center', backgroundColor: T.surfaceElevated },
    stepDotActive: { borderColor: T.action, backgroundColor: T.action },
    stepDotDone:   { borderColor: T.action, backgroundColor: T.action },
    stepNum:  { color: T.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk_700Bold' },

    title:    { color: T.textPrimary, fontSize: 26, fontFamily: 'SpaceGrotesk_700Bold', lineHeight: 32, marginBottom: 8 },
    subtitle: { color: T.textSecondary, fontSize: 14, fontFamily: 'SpaceGrotesk_400Regular', lineHeight: 20, marginBottom: 20 },
    sectionLabel: { color: T.textSecondary, fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 2, marginBottom: 10, marginTop: 8 },
    hint:     { color: T.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular', textAlign: 'center', marginTop: 8, marginBottom: 8 },

    warningCard: { flexDirection: 'row', gap: 12, backgroundColor: T.surfaceElevated, borderRadius: 12, borderWidth: 1, borderColor: T.attention + '55', padding: 16, marginBottom: 20 },
    warningText: { flex: 1, color: T.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular', lineHeight: 19 },

    checkRow:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
    checkbox:   { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: T.border, alignItems: 'center', justifyContent: 'center' },
    checkboxOn: { backgroundColor: T.action, borderColor: T.action },
    checkLabel: { flex: 1, color: T.textPrimary, fontSize: 14, fontFamily: 'SpaceGrotesk_600SemiBold' },

    optionCard:       { backgroundColor: T.surfaceElevated, borderRadius: 12, borderWidth: 1, borderColor: T.border, padding: 16, marginBottom: 10 },
    optionCardActive: { borderColor: T.action, backgroundColor: actionDimBg },
    optionTitle:      { color: T.textPrimary, fontSize: 15, fontFamily: 'SpaceGrotesk_700Bold', marginBottom: 4 },
    optionTitleActive:{ color: T.action },
    optionDesc:       { color: T.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular' },

    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: T.surfaceElevated, borderWidth: 1, borderColor: T.border },
    chipActive: { backgroundColor: T.action, borderColor: T.action },
    chipText:   { color: T.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk_600SemiBold' },
    chipTextActive: { color: T.surface },

    dayRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 4 },
    dayDot: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, borderColor: T.border, alignItems: 'center', justifyContent: 'center', backgroundColor: T.border },
    dayDotActive: { backgroundColor: T.action, borderColor: T.action },
    dayLabel:       { color: T.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk_700Bold' },
    dayLabelActive: { color: T.surface },

    textArea: { backgroundColor: T.surfaceElevated, borderRadius: 12, borderWidth: 1, borderColor: T.border, color: T.textPrimary, fontSize: 14, fontFamily: 'SpaceGrotesk_400Regular', padding: 14, minHeight: 90 },

    templateCard:       { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: T.surfaceElevated, borderRadius: 14, borderWidth: 1, borderColor: T.border, padding: 16, marginBottom: 10 },
    templateCardActive: { borderColor: T.action, backgroundColor: actionDimBg },
    templateName: { color: T.textPrimary, fontSize: 15, fontFamily: 'SpaceGrotesk_700Bold', marginBottom: 4 },
    templateMeta: { color: T.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular', marginBottom: 6 },
    templateDesc: { color: T.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular', lineHeight: 17 },

    inputWrap: { backgroundColor: T.surfaceElevated, borderRadius: 12, borderWidth: 1, borderColor: T.border, marginBottom: 16 },
    input:     { color: T.textPrimary, fontSize: 17, fontFamily: 'SpaceGrotesk_600SemiBold', paddingHorizontal: 16, paddingVertical: 14 },

    previewCard:  { backgroundColor: T.surfaceElevated, borderRadius: 14, borderWidth: 1, borderColor: T.border, padding: 16 },
    previewLabel: { color: T.textSecondary, fontSize: 9, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 2, marginBottom: 6 },
    previewTitle: { color: T.textPrimary, fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold' },
    previewMeta:  { color: T.action, fontSize: 12, fontFamily: 'SpaceGrotesk_600SemiBold', marginTop: 2, marginBottom: 8 },
    previewDesc:  { color: T.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular', lineHeight: 18 },
    previewRoutine:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: T.border, marginTop: 4 },
    previewRoutineDay:  { color: T.action, fontSize: 11, fontFamily: 'SpaceGrotesk_700Bold', width: 72 },
    previewRoutineName: { flex: 1, color: T.textPrimary, fontSize: 13, fontFamily: 'SpaceGrotesk_600SemiBold' },
    previewRoutineMeta: { color: T.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular' },

    footer:     { padding: 20, paddingBottom: 32 },
    ctaBtn:     { borderRadius: 14, overflow: 'hidden' },
    ctaGrad:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
    ctaDisabled:{ backgroundColor: T.border },
    ctaText:    { color: T.action, fontSize: 14, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1.5 },

    successWrap:  { flex: 1, justifyContent: 'center', padding: 32, alignItems: 'center' },
    successIcon:  { marginBottom: 20 },
    successTitle: { color: T.textPrimary, fontSize: 26, fontFamily: 'SpaceGrotesk_700Bold', marginBottom: 12, textAlign: 'center' },
    successDesc:  { color: T.textSecondary, fontSize: 15, fontFamily: 'SpaceGrotesk_400Regular', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
    linkBtn:      { paddingVertical: 16 },
    linkBtnText:  { color: T.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk_600SemiBold' },
  });
}

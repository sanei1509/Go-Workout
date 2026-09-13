import { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Keyboard,
  Switch,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeTokens } from '@/constants/theme';
import { useAlert } from '@/components/AppAlert';
import {
  createInvitation,
  findStudentByEmail,
  FormField,
  FORM_FIELD_LABELS,
} from '@/lib/services/invitationService';
import { DISCIPLINES } from '@/lib/constants/disciplines';

const PLAN_TYPES = [
  'Personalizado',
  'Grupal',
  'Online',
  'Presencial',
  'Híbrido',
];

const FREQUENCIES = [
  '1 vez por semana',
  '2 veces por semana',
  '3 veces por semana',
  '4 veces por semana',
  '5 veces por semana',
  '6 veces por semana',
  'Todos los días',
];

const AVAILABLE_FORM_FIELDS: FormField[] = [
  'age',
  'weight',
  'height',
  'injuries',
  'diseases',
  'goals',
  'experience',
];

export default function CreateInvitationScreen() {
  const { user, profile } = useAuth();
  const { showAlert } = useAlert();
  const { T, activeTheme } = useTheme();
  const actionDimBg = activeTheme === 'dark' ? '#00566a' : '#e0f7fa';
  const ctaGradient = activeTheme === 'dark'
    ? ['#00566a', '#003d4d'] as const
    : [T.border, T.surfaceElevated] as const;
  const s = useMemo(() => createStyles(T, actionDimBg), [T, actionDimBg]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Disciplinas del trainer acotan las opciones; si no declaró, lista completa.
  const disciplineOptions =
    profile?.disciplines && profile.disciplines.length > 0
      ? profile.disciplines
      : [...DISCIPLINES];

  // Form state
  const [studentEmail, setStudentEmail] = useState('');
  const [foundStudent, setFoundStudent] = useState<{
    id: string;
    full_name: string;
    email: string;
  } | null>(null);
  const [studentError, setStudentError] = useState<string | null>(null);

  const [discipline, setDiscipline] = useState<string>(disciplineOptions[0]);
  const [planType, setPlanType] = useState<string>(PLAN_TYPES[0]);
  const [frequency, setFrequency] = useState<string>(FREQUENCIES[2]);
  const [termsText, setTermsText] = useState<string>('');
  const [hasRequiredForm, setHasRequiredForm] = useState<boolean>(false);
  const [requiredFields, setRequiredFields] = useState<FormField[]>([]);

  const toggleField = (field: FormField) => {
    setRequiredFields((prev) =>
      prev.includes(field)
        ? prev.filter((f) => f !== field)
        : [...prev, field]
    );
  };

  const handleToggleRequiredForm = (value: boolean) => {
    setHasRequiredForm(value);
    if (!value) {
      setRequiredFields([]);
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  const handleSearchStudent = async () => {
    if (!studentEmail.trim()) {
      setStudentError('Ingresá el email del alumno');
      return;
    }

    Keyboard.dismiss();
    setIsSearching(true);
    setStudentError(null);
    setFoundStudent(null);

    const { student, error } = await findStudentByEmail(studentEmail);

    setIsSearching(false);

    if (error) {
      setStudentError(error.message);
      return;
    }

    if (student) {
      setFoundStudent(student);
    }
  };

  const handleClearStudent = () => {
    setFoundStudent(null);
    setStudentEmail('');
    setStudentError(null);
  };

  const validateForm = (): string | null => {
    if (!foundStudent) {
      return 'Buscá y seleccioná un alumno primero';
    }
    if (!discipline) {
      return 'Seleccioná una disciplina';
    }
    if (!planType) {
      return 'Seleccioná un tipo de plan';
    }
    if (!frequency) {
      return 'Seleccioná una frecuencia';
    }
    if (hasRequiredForm && requiredFields.length === 0) {
      return 'Seleccioná al menos un campo para el formulario';
    }
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      showAlert('Error', validationError);
      return;
    }

    if (!user?.id || !foundStudent) {
      showAlert('Error', 'No se pudo identificar al entrenador o alumno');
      return;
    }

    setIsSubmitting(true);

    const { error } = await createInvitation({
      trainer_id: user.id,
      student_id: foundStudent.id,
      discipline,
      plan_type: planType,
      frequency,
      terms_text: termsText.trim() || undefined,
      has_required_form: hasRequiredForm,
      required_fields: hasRequiredForm ? requiredFields : undefined,
    });

    setIsSubmitting(false);

    if (error) {
      showAlert('Error', error.message);
      return;
    }

    showAlert(
      'Invitación enviada',
      `${foundStudent.full_name} recibirá la invitación en su bandeja de entrada`,
      [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={s.safe}>
      <LinearGradient
        colors={['transparent', T.action, 'transparent']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={s.topLine}
      />

      {/* ── Top bar ────────────────────────────────────────────────── */}
      <View style={s.topBar}>
        <TouchableOpacity onPress={handleGoBack} style={{ padding: 4 }}>
          <Ionicons name="chevron-back" size={24} color={T.action} />
        </TouchableOpacity>
        <Text style={s.topBarTitle}>Nueva invitación</Text>
        <View style={{ width: 32 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Alumno ─────────────────────────────────────────────── */}
          <Text style={s.sectionTitle}>ALUMNO</Text>
          <View style={s.card}>
            {foundStudent ? (
              <View style={s.foundRow}>
                <View style={s.foundIcon}>
                  <Ionicons name="checkmark" size={18} color={T.done} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.foundName}>{foundStudent.full_name}</Text>
                  <Text style={s.foundEmail}>{foundStudent.email}</Text>
                </View>
                <TouchableOpacity onPress={handleClearStudent} style={s.clearBtn}>
                  <Ionicons name="close" size={16} color={T.textSecondary} />
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={s.searchRow}>
                  <TextInput
                    value={studentEmail}
                    onChangeText={setStudentEmail}
                    placeholder="email@delalumno.com"
                    placeholderTextColor={T.textSecondary}
                    style={s.searchInput}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    returnKeyType="search"
                    onSubmitEditing={handleSearchStudent}
                  />
                  <TouchableOpacity
                    onPress={handleSearchStudent}
                    disabled={isSearching}
                    style={s.searchBtn}
                    activeOpacity={0.85}
                  >
                    {isSearching
                      ? <ActivityIndicator size="small" color={T.action} />
                      : <Ionicons name="search" size={18} color={T.action} />
                    }
                  </TouchableOpacity>
                </View>
                {studentError && (
                  <View style={s.errorRow}>
                    <Ionicons name="alert-circle-outline" size={13} color={'#EF4444'} />
                    <Text style={s.errorText}>{studentError}</Text>
                  </View>
                )}
              </>
            )}
          </View>

          {/* ── Disciplina ─────────────────────────────────────────── */}
          <Text style={s.sectionTitle}>DISCIPLINA</Text>
          <View style={s.chipsWrap}>
            {disciplineOptions.map((d) => {
              const active = discipline === d;
              return (
                <TouchableOpacity
                  key={d}
                  onPress={() => setDiscipline(d)}
                  style={[s.chip, active && s.chipActive]}
                  activeOpacity={0.8}
                >
                  <Text style={[s.chipText, active && s.chipTextActive]}>{d}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Tipo de plan ───────────────────────────────────────── */}
          <Text style={s.sectionTitle}>TIPO DE PLAN</Text>
          <View style={s.chipsWrap}>
            {PLAN_TYPES.map((p) => {
              const active = planType === p;
              return (
                <TouchableOpacity
                  key={p}
                  onPress={() => setPlanType(p)}
                  style={[s.chip, active && s.chipActive]}
                  activeOpacity={0.8}
                >
                  <Text style={[s.chipText, active && s.chipTextActive]}>{p}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Frecuencia ─────────────────────────────────────────── */}
          <Text style={s.sectionTitle}>FRECUENCIA</Text>
          <View style={s.chipsWrap}>
            {FREQUENCIES.map((f) => {
              const active = frequency === f;
              return (
                <TouchableOpacity
                  key={f}
                  onPress={() => setFrequency(f)}
                  style={[s.chip, active && s.chipActive]}
                  activeOpacity={0.8}
                >
                  <Text style={[s.chipText, active && s.chipTextActive]}>{f}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Términos ───────────────────────────────────────────── */}
          <Text style={s.sectionTitle}>TÉRMINOS Y CONDICIONES (OPCIONAL)</Text>
          <View style={s.card}>
            <TextInput
              value={termsText}
              onChangeText={setTermsText}
              placeholder="Condiciones del entrenamiento, pagos, cancelaciones..."
              placeholderTextColor={T.textSecondary}
              style={s.termsInput}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* ── Formulario requerido ───────────────────────────────── */}
          <View style={s.formToggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.formToggleTitle}>Formulario inicial</Text>
              <Text style={s.formToggleSub}>
                Pedile datos al alumno al aceptar la invitación
              </Text>
            </View>
            <Switch
              value={hasRequiredForm}
              onValueChange={handleToggleRequiredForm}
              trackColor={{ false: T.border, true: actionDimBg }}
              thumbColor={hasRequiredForm ? T.action : T.textSecondary}
            />
          </View>

          {hasRequiredForm && (
            <View style={s.chipsWrap}>
              {AVAILABLE_FORM_FIELDS.map((f) => {
                const active = requiredFields.includes(f);
                return (
                  <TouchableOpacity
                    key={f}
                    onPress={() => toggleField(f)}
                    style={[s.chip, active && s.chipActiveTertiary]}
                    activeOpacity={0.8}
                  >
                    {active && <Ionicons name="checkmark" size={12} color={T.attention} />}
                    <Text style={[s.chipText, active && { color: T.attention }]}>
                      {FORM_FIELD_LABELS[f]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>

        {/* ── CTA ────────────────────────────────────────────────────── */}
        <View style={s.footer}>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting || !foundStudent}
            activeOpacity={0.85}
            style={s.ctaBtn}
          >
            {foundStudent && !isSubmitting ? (
              <LinearGradient
                colors={ctaGradient}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={s.ctaGrad}
              >
                <Ionicons name="paper-plane-outline" size={17} color={T.action} />
                <Text style={s.ctaText}>ENVIAR INVITACIÓN</Text>
              </LinearGradient>
            ) : (
              <View style={[s.ctaGrad, { backgroundColor: T.border }]}>
                {isSubmitting
                  ? <ActivityIndicator color={T.action} />
                  : <Text style={[s.ctaText, { color: T.textSecondary }]}>ENVIAR INVITACIÓN</Text>
                }
              </View>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(T: ThemeTokens, actionDimBg: string) {
  return StyleSheet.create({
    safe:    { flex: 1, backgroundColor: T.surface },
    topLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, opacity: 0.4, zIndex: 10 },

    topBar:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
    topBarTitle: { color: T.textPrimary, fontSize: 16, fontFamily: 'SpaceGrotesk_700Bold' },

    sectionTitle: { color: T.textSecondary, fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 2, marginBottom: 10, marginTop: 20 },

    card: { backgroundColor: T.surfaceElevated, borderRadius: 12, borderWidth: 1, borderColor: T.border, padding: 14 },

    // Búsqueda
    searchRow:   { flexDirection: 'row', gap: 10 },
    searchInput: { flex: 1, backgroundColor: T.border, borderWidth: 1, borderColor: T.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: T.textPrimary, fontSize: 14, fontFamily: 'SpaceGrotesk_400Regular' },
    searchBtn:   { width: 46, borderRadius: 10, backgroundColor: actionDimBg, alignItems: 'center', justifyContent: 'center' },
    errorRow:    { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 },
    errorText:   { color: '#EF4444', fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular' },

    // Alumno encontrado
    foundRow:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
    foundIcon:  { width: 36, height: 36, borderRadius: 18, backgroundColor: '#0a1f10', borderWidth: 1, borderColor: T.done, alignItems: 'center', justifyContent: 'center' },
    foundName:  { color: T.textPrimary, fontSize: 14, fontFamily: 'SpaceGrotesk_700Bold' },
    foundEmail: { color: T.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular' },
    clearBtn:   { width: 30, height: 30, borderRadius: 8, backgroundColor: T.border, alignItems: 'center', justifyContent: 'center' },

    // Chips
    chipsWrap:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip:               { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 8, backgroundColor: T.surfaceElevated, borderWidth: 1, borderColor: T.border },
    chipActive:         { backgroundColor: actionDimBg, borderColor: T.action },
    chipActiveTertiary: { backgroundColor: '#130d00', borderColor: T.attention },
    chipText:           { color: T.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk_600SemiBold' },
    chipTextActive:     { color: T.action },

    // Términos
    termsInput: { color: T.textPrimary, fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular', minHeight: 90, lineHeight: 19 },

    // Toggle formulario
    formToggleRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: T.surfaceElevated, borderRadius: 12, borderWidth: 1, borderColor: T.border, padding: 14, marginTop: 24, marginBottom: 12 },
    formToggleTitle: { color: T.textPrimary, fontSize: 14, fontFamily: 'SpaceGrotesk_700Bold', marginBottom: 2 },
    formToggleSub:   { color: T.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular' },

    // Footer
    footer:  { padding: 16, paddingBottom: 24, borderTopWidth: 1, borderTopColor: T.border, backgroundColor: T.surface },
    ctaBtn:  { borderRadius: 12, overflow: 'hidden' },
    ctaGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingVertical: 15 },
    ctaText: { color: T.action, fontSize: 13, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1.5 },
  });
}

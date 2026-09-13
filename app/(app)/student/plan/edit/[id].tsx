import { useState, useCallback, useMemo } from 'react';
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
  Switch,
} from 'react-native';
import { useAlert } from '@/components/AppAlert';
import { Stack, useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  getPlanById,
  updatePlan,
  FREQUENCIES,
  Plan,
} from '@/lib/services/planService';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeTokens } from '@/constants/theme';

const DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export default function EditPlanScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { showAlert } = useAlert();
  const { T, activeTheme } = useTheme();
  const actionDimBg = activeTheme === 'dark' ? '#00566a' : '#e0f7fa';
  const s = useMemo(() => createStyles(T, actionDimBg), [T, actionDimBg]);

  const [plan, setPlan] = useState<Plan | null>(null);
  const [name, setName] = useState('');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => { loadPlan(); }, [id])
  );

  const loadPlan = async () => {
    if (!id) return;
    setIsLoading(true);
    const { plan: data, error: err } = await getPlanById(id);
    if (err || !data) {
      setError(err?.message ?? 'Plan no encontrado');
      setIsLoading(false);
      return;
    }
    if (data.trainer_id) {
      setError('Los planes asignados por tu entrenador no se pueden editar acá.');
      setIsLoading(false);
      return;
    }
    setPlan(data);
    setName(data.name);
    setSelectedDays(data.training_days ?? []);
    setIsActive(data.is_active);
    setError(null);
    setIsLoading(false);
  };

  const handleToggleDay = (day: number) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const canSave = name.trim().length >= 2 && selectedDays.length > 0;

  const handleSave = async () => {
    if (!id || !canSave) return;
    setIsSaving(true);
    const sorted = [...selectedDays].sort((a, b) => a - b);
    const { plan: updated, error: err } = await updatePlan(id, {
      name: name.trim(),
      training_days: sorted,
      weekly_frequency: sorted.length,
      is_active: isActive,
    });
    setIsSaving(false);
    if (err || !updated) {
      showAlert('Error', err?.message ?? 'No se pudo guardar');
      return;
    }
    router.back();
  };

  const freqLabel = selectedDays.length > 0
    ? FREQUENCIES.find(f => f.value === selectedDays.length)?.label ?? `${selectedDays.length} días por semana`
    : null;

  return (
    <>
      <Stack.Screen options={{
        title: 'EDITAR PLAN',
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.back()} style={{ marginLeft: 4, padding: 4 }}>
            <Ionicons name="chevron-back" size={24} color={T.action} />
          </TouchableOpacity>
        ),
      }} />

      <KeyboardAvoidingView style={s.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <LinearGradient
          colors={['transparent', T.action, 'transparent']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={s.topLine}
        />

        {isLoading ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color={T.action} />
          </View>
        ) : error ? (
          <View style={s.center}>
            <Ionicons name="alert-circle-outline" size={48} color="#f87171" />
            <Text style={s.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => router.back()} style={s.errorBtn}>
              <Text style={s.errorBtnText}>VOLVER</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
              <Text style={s.sectionLabel}>NOMBRE</Text>
              <View style={s.inputWrap}>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Nombre del plan"
                  placeholderTextColor={T.textSecondary}
                  style={s.input}
                  maxLength={50}
                />
                <Text style={s.charCount}>{name.length}/50</Text>
              </View>

              <Text style={s.sectionLabel}>DISCIPLINA</Text>
              <View style={s.readOnlyChip}>
                <Ionicons name="lock-closed-outline" size={14} color={T.textSecondary} />
                <Text style={s.readOnlyText}>{plan?.discipline}</Text>
              </View>
              <Text style={s.hint}>La disciplina no se puede cambiar — afecta el catálogo de ejercicios.</Text>

              <Text style={s.sectionLabel}>DÍAS DE ENTRENAMIENTO</Text>
              <View style={s.daySelector}>
                <View style={s.dayDotsRow}>
                  {DAY_LABELS.map((label, i) => {
                    const dayNum = i + 1;
                    const active = selectedDays.includes(dayNum);
                    return (
                      <TouchableOpacity
                        key={label}
                        onPress={() => handleToggleDay(dayNum)}
                        activeOpacity={0.7}
                        style={[s.dayDot, active && s.dayDotActive]}
                      >
                        <Text style={[s.dayLabel, active && s.dayLabelActive]}>{label}</Text>
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
                  <Text style={s.freqHint}>Seleccioná al menos un día</Text>
                )}
              </View>

              <Text style={s.sectionLabel}>ESTADO</Text>
              <View style={s.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.switchTitle}>Plan activo</Text>
                  <Text style={s.switchSub}>Los planes inactivos no aparecen en tu calendario semanal</Text>
                </View>
                <Switch
                  value={isActive}
                  onValueChange={setIsActive}
                  trackColor={{ false: T.border, true: actionDimBg }}
                  thumbColor={isActive ? T.action : T.textSecondary}
                />
              </View>
            </ScrollView>

            <View style={s.footer}>
              <TouchableOpacity
                onPress={handleSave}
                disabled={!canSave || isSaving}
                activeOpacity={0.85}
                style={s.ctaBtn}
              >
                {canSave && !isSaving ? (
                  <LinearGradient
                    colors={[actionDimBg, '#003d4d']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={s.ctaGrad}
                  >
                    <Text style={s.ctaText}>GUARDAR CAMBIOS</Text>
                    <Ionicons name="checkmark-circle-outline" size={18} color={T.action} />
                  </LinearGradient>
                ) : (
                  <View style={[s.ctaGrad, s.ctaGradDisabled]}>
                    {isSaving
                      ? <ActivityIndicator color={T.action} />
                      : <Text style={[s.ctaText, { color: T.textSecondary }]}>GUARDAR CAMBIOS</Text>
                    }
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </>
  );
}

function createStyles(T: ThemeTokens, actionDimBg: string) {
  return StyleSheet.create({
    safe:    { flex: 1, backgroundColor: T.surface },
    topLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, opacity: 0.4, zIndex: 10 },
    scroll:  { padding: 24, paddingBottom: 16 },
    center:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },

    errorText:   { color: T.textSecondary, fontFamily: 'SpaceGrotesk_400Regular', textAlign: 'center', marginTop: 12, lineHeight: 20 },
    errorBtn:    { marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10, backgroundColor: T.surfaceElevated, borderWidth: 1, borderColor: T.border },
    errorBtnText:{ color: T.action, fontFamily: 'SpaceGrotesk_700Bold', fontSize: 13 },

    sectionLabel: { color: T.textSecondary, fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 2, marginBottom: 10, marginTop: 20 },

    inputWrap:  { backgroundColor: T.surfaceElevated, borderRadius: 14, borderWidth: 1.5, borderColor: T.border, overflow: 'hidden' },
    input:      { color: T.textPrimary, fontSize: 18, fontFamily: 'SpaceGrotesk_600SemiBold', paddingHorizontal: 20, paddingVertical: 16 },
    charCount:  { color: T.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular', textAlign: 'right', paddingHorizontal: 16, paddingBottom: 10 },

    readOnlyChip: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', backgroundColor: T.surfaceElevated, borderRadius: 10, borderWidth: 1, borderColor: T.border, paddingHorizontal: 14, paddingVertical: 10 },
    readOnlyText: { color: T.textPrimary, fontSize: 14, fontFamily: 'SpaceGrotesk_600SemiBold' },
    hint:         { color: T.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular', marginTop: 8, lineHeight: 18 },

    daySelector: { backgroundColor: T.surfaceElevated, borderRadius: 16, borderWidth: 1, borderColor: T.border, padding: 20, alignItems: 'center' },
    dayDotsRow:  { flexDirection: 'row', gap: 8, marginBottom: 16 },
    dayDot:       { width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, borderColor: T.border, alignItems: 'center', justifyContent: 'center', backgroundColor: T.border },
    dayDotActive: { backgroundColor: T.action, borderColor: T.action },
    dayLabel:       { color: T.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk_700Bold' },
    dayLabelActive: { color: T.surface },
    freqResult:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
    freqResultText: { color: T.action, fontSize: 14, fontFamily: 'SpaceGrotesk_700Bold' },
    freqHint:       { color: T.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular' },

    switchRow:  { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: T.surfaceElevated, borderRadius: 14, borderWidth: 1, borderColor: T.border, padding: 16 },
    switchTitle:{ color: T.textPrimary, fontSize: 14, fontFamily: 'SpaceGrotesk_600SemiBold', marginBottom: 4 },
    switchSub:  { color: T.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular', lineHeight: 17 },

    footer:         { padding: 20, paddingBottom: 32 },
    ctaBtn:         { borderRadius: 14, overflow: 'hidden' },
    ctaGrad:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
    ctaGradDisabled:{ backgroundColor: T.border },
    ctaText:        { color: T.action, fontSize: 14, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1.5 },
  });
}

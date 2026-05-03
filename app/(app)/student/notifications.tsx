import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Switch, ScrollView, StyleSheet } from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import {
  setupWorkoutReminder,
  cancelWorkoutReminder,
  hasActiveReminder,
  getAverageWorkoutHour,
  MIN_SESSIONS_FOR_HISTORY,
} from '@/lib/services/notificationService';

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

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const { user } = useAuth();
  const [isEnabled, setIsEnabled]         = useState(false);
  const [isLoading, setIsLoading]         = useState(true);
  const [isSaving, setIsSaving]           = useState(false);
  const [reminderHour, setReminderHour]   = useState(8);
  const [reminderMinute, setReminderMinute] = useState(0);
  const [fromHistory, setFromHistory]     = useState(false);
  const [hasEnoughHistory, setHasEnoughHistory] = useState(false);
  const [manualHour, setManualHour]       = useState(8);
  const [manualMinute, setManualMinute]   = useState(0);

  useEffect(() => { loadState(); }, []);

  const loadState = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    const [active, avgMinutes] = await Promise.all([
      hasActiveReminder(),
      getAverageWorkoutHour(user.id),
    ]);
    setIsEnabled(active);
    setHasEnoughHistory(avgMinutes !== null);
    if (avgMinutes !== null) {
      const rem = avgMinutes - 15;
      const h = Math.max(0, Math.floor(rem / 60));
      const m = Math.max(0, rem % 60);
      setReminderHour(h); setReminderMinute(m);
      setFromHistory(true);
      setManualHour(h); setManualMinute(m);
    }
    setIsLoading(false);
  };

  const handleToggle = async (value: boolean) => {
    if (!user?.id) return;
    setIsSaving(true);
    if (!value) {
      await cancelWorkoutReminder();
      setIsEnabled(false);
    } else {
      const manualMins = hasEnoughHistory
        ? undefined
        : manualHour * 60 + manualMinute + 15;
      const result = await setupWorkoutReminder(user.id, manualMins);
      if (result.scheduled) {
        setIsEnabled(true);
        setReminderHour(result.hour);
        setReminderMinute(result.minute);
        setFromHistory(result.fromHistory);
      }
    }
    setIsSaving(false);
  };

  const handleSaveManualTime = async () => {
    if (!user?.id) return;
    setIsSaving(true);
    const result = await setupWorkoutReminder(user.id, manualHour * 60 + manualMinute + 15);
    if (result.scheduled) {
      setIsEnabled(true);
      setReminderHour(result.hour);
      setReminderMinute(result.minute);
      setFromHistory(false);
    }
    setIsSaving(false);
  };

  const fmt = (h: number, m: number) =>
    `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

  const adjustHour = (delta: number) =>
    setManualHour(h => Math.min(23, Math.max(0, h + delta)));

  const adjustMinute = (delta: number) =>
    setManualMinute(m => {
      const next = m + delta;
      if (next < 0) return 45;
      if (next >= 60) return 0;
      return next;
    });

  // Notification preview time (15 min before)
  const notifH = Math.max(0, manualHour - (manualMinute < 15 ? 1 : 0));
  const notifM = (manualMinute - 15 + 60) % 60;

  return (
    <>
      <Stack.Screen options={{
        title: 'RECORDATORIOS',
        headerLeft: () => (
          <TouchableOpacity onPress={() => router.navigate('/student/profile')} style={{ marginLeft: 4, padding: 4 }}>
            <Ionicons name="chevron-back" size={24} color={C.primary} />
          </TouchableOpacity>
        ),
      }} />
      <View style={s.safe}>
        <LinearGradient
          colors={['transparent', C.primary, 'transparent']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={s.topLine}
        />

        <ScrollView contentContainerStyle={s.scroll}>

          {/* ── Toggle ──────────────────────────────────────────── */}
          <Text style={s.sectionTitle}>NOTIFICACIÓN</Text>
          <View style={s.toggleCard}>
            <View style={s.toggleRow}>
              <View style={s.toggleIconWrap}>
                <Ionicons name="notifications-outline" size={20} color={C.primary} />
              </View>
              <View style={s.toggleInfo}>
                <Text style={s.toggleLabel}>Recordatorio diario</Text>
                <Text style={s.toggleSub}>
                  Recibí un aviso antes de tu hora habitual de entrenamiento
                </Text>
              </View>
              <Switch
                value={isEnabled}
                onValueChange={handleToggle}
                disabled={isLoading || isSaving}
                trackColor={{ false: C.border, true: C.primaryDim }}
                thumbColor={isEnabled ? C.primary : C.neutral}
              />
            </View>

            {isEnabled && (
              <View style={s.activeInfo}>
                <View style={s.activeRow}>
                  <Ionicons name="alarm-outline" size={16} color={C.primary} />
                  <Text style={s.activeText}>
                    Próxima notificación a las{' '}
                    <Text style={s.activeTime}>{fmt(reminderHour, reminderMinute)}</Text>
                  </Text>
                </View>
                {fromHistory && (
                  <View style={s.historyRow}>
                    <Ionicons name="analytics-outline" size={14} color={C.neutral} />
                    <Text style={s.historyText}>
                      Calculado a partir de tu historial de entrenamientos
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* ── Selector manual ──────────────────────────────────── */}
          {!hasEnoughHistory && (
            <>
              <Text style={s.sectionTitle}>HORA DE ENTRENAMIENTO</Text>
              <View style={s.timeCard}>
                <Text style={s.timeCardSub}>
                  Todavía no tenés suficientes sesiones (mín. {MIN_SESSIONS_FOR_HISTORY}).
                  Indicá a qué hora solés entrenar.
                </Text>

                {/* Picker */}
                <View style={s.pickerRow}>
                  {/* Horas */}
                  <View style={s.pickerCol}>
                    <TouchableOpacity onPress={() => adjustHour(1)} style={s.chevronBtn} activeOpacity={0.7}>
                      <Ionicons name="chevron-up" size={26} color={C.primary} />
                    </TouchableOpacity>
                    <Text style={s.pickerDigit}>{manualHour.toString().padStart(2, '0')}</Text>
                    <TouchableOpacity onPress={() => adjustHour(-1)} style={s.chevronBtn} activeOpacity={0.7}>
                      <Ionicons name="chevron-down" size={26} color={C.primary} />
                    </TouchableOpacity>
                  </View>

                  <Text style={s.pickerColon}>:</Text>

                  {/* Minutos */}
                  <View style={s.pickerCol}>
                    <TouchableOpacity onPress={() => adjustMinute(15)} style={s.chevronBtn} activeOpacity={0.7}>
                      <Ionicons name="chevron-up" size={26} color={C.primary} />
                    </TouchableOpacity>
                    <Text style={s.pickerDigit}>{manualMinute.toString().padStart(2, '0')}</Text>
                    <TouchableOpacity onPress={() => adjustMinute(-15)} style={s.chevronBtn} activeOpacity={0.7}>
                      <Ionicons name="chevron-down" size={26} color={C.primary} />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={s.notifPreview}>
                  Te avisamos a las {fmt(notifH, notifM)}, 15 min antes de entrenar
                </Text>

                <TouchableOpacity
                  onPress={handleSaveManualTime}
                  disabled={isSaving}
                  activeOpacity={0.85}
                  style={s.saveBtn}
                >
                  <LinearGradient
                    colors={[C.primaryDim, '#003d4d']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={s.saveBtnGrad}
                  >
                    <Ionicons name="checkmark-circle-outline" size={18} color={C.primary} />
                    <Text style={s.saveBtnText}>ACTIVAR RECORDATORIO</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* ── Info ────────────────────────────────────────────── */}
          <View style={s.infoCard}>
            <View style={s.infoRow}>
              <Ionicons name="information-circle-outline" size={18} color={C.primary} />
              <Text style={s.infoText}>
                La hora se recalcula automáticamente después de cada entrenamiento completado,
                para adaptarse a tu rutina real.
              </Text>
            </View>
          </View>

        </ScrollView>
      </View>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: C.bg },
  topLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, opacity: 0.4, zIndex: 10 },
  scroll:  { padding: 20, paddingBottom: 48 },

  sectionTitle: { color: C.neutral, fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 3, marginBottom: 10 },

  // Toggle card
  toggleCard:    { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 16, marginBottom: 24 },
  toggleRow:     { flexDirection: 'row', alignItems: 'center' },
  toggleIconWrap:{ width: 40, height: 40, borderRadius: 8, backgroundColor: C.primaryDim, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  toggleInfo:    { flex: 1, marginRight: 12 },
  toggleLabel:   { color: C.textHi, fontSize: 14, fontFamily: 'SpaceGrotesk_700Bold', marginBottom: 3 },
  toggleSub:     { color: C.textLo, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular', lineHeight: 17 },

  activeInfo:  { marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.border, gap: 8 },
  activeRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activeText:  { color: C.textLo, fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular' },
  activeTime:  { color: C.primary, fontFamily: 'SpaceGrotesk_700Bold' },
  historyRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  historyText: { color: C.neutral, fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular' },

  // Time card
  timeCard:    { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 20, marginBottom: 24 },
  timeCardSub: { color: C.textLo, fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular', lineHeight: 19, marginBottom: 24 },

  pickerRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  pickerCol:  { alignItems: 'center' },
  chevronBtn: { padding: 10 },
  pickerDigit:{ color: C.textHi, fontSize: 48, fontFamily: 'SpaceGrotesk_700Bold', width: 72, textAlign: 'center' },
  pickerColon:{ color: C.border, fontSize: 42, fontFamily: 'SpaceGrotesk_700Bold', marginHorizontal: 4, marginBottom: 8 },

  notifPreview: { color: C.neutral, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular', textAlign: 'center', marginBottom: 20 },

  saveBtn:     { borderRadius: 12, overflow: 'hidden' },
  saveBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
  saveBtnText: { color: C.primary, fontSize: 13, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1 },

  // Info
  infoCard: { backgroundColor: C.cardDeep, borderRadius: 12, borderWidth: 1, borderColor: C.primaryDim, padding: 14 },
  infoRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoText: { color: C.textLo, fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular', flex: 1, lineHeight: 19 },
});

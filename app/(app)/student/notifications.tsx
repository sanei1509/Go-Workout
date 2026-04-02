import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Switch, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import {
  setupWorkoutReminder,
  cancelWorkoutReminder,
  hasActiveReminder,
  getAverageWorkoutHour,
  MIN_SESSIONS_FOR_HISTORY,
} from '@/lib/services/notificationService';

export default function NotificationsScreen() {
  const { user } = useAuth();
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [reminderHour, setReminderHour] = useState(8);
  const [reminderMinute, setReminderMinute] = useState(0);
  const [fromHistory, setFromHistory] = useState(false);
  const [hasEnoughHistory, setHasEnoughHistory] = useState(false);
  // Hora manual: minutos desde medianoche (por defecto 8:00)
  const [manualHour, setManualHour] = useState(8);
  const [manualMinute, setManualMinute] = useState(0);

  useEffect(() => {
    loadState();
  }, []);

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
      const reminderMinutes = avgMinutes - 15;
      const h = Math.max(0, Math.floor(reminderMinutes / 60));
      const m = Math.max(0, reminderMinutes % 60);
      setReminderHour(h);
      setReminderMinute(m);
      setFromHistory(true);
      setManualHour(h);
      setManualMinute(m);
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
      // Si tiene historial, setupWorkoutReminder lo calcula solo
      // Si no, usamos la hora manual + 15min (la notificación se envía 15min antes de entrenar)
      const manualMinutesFromMidnight = hasEnoughHistory
        ? undefined
        : manualHour * 60 + manualMinute + 15;
      const result = await setupWorkoutReminder(user.id, manualMinutesFromMidnight);
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
    const minutesFromMidnight = manualHour * 60 + manualMinute + 15;
    const result = await setupWorkoutReminder(user.id, minutesFromMidnight);
    if (result.scheduled) {
      setIsEnabled(true);
      setReminderHour(result.hour);
      setReminderMinute(result.minute);
      setFromHistory(false);
    }
    setIsSaving(false);
  };

  const formatTime = (h: number, m: number) =>
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

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900 ml-2">Recordatorios</Text>
      </View>

      <ScrollView className="flex-1 p-4">
        {/* Toggle principal */}
        <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 mr-4">
              <Text className="text-gray-900 font-semibold text-base">Recordatorio diario</Text>
              <Text className="text-gray-500 text-sm mt-1">
                Recibí una notificación antes de tu hora habitual de entrenamiento
              </Text>
            </View>
            <Switch
              value={isEnabled}
              onValueChange={handleToggle}
              disabled={isLoading || isSaving}
              trackColor={{ false: '#D1D5DB', true: '#3B82F6' }}
              thumbColor="white"
            />
          </View>

          {isEnabled && (
            <View className="mt-4 pt-4 border-t border-gray-100">
              <View className="flex-row items-center">
                <Ionicons name="alarm-outline" size={20} color="#3B82F6" />
                <Text className="text-gray-700 ml-2">
                  Notificación a las{' '}
                  <Text className="font-bold text-blue-600">
                    {formatTime(reminderHour, reminderMinute)}
                  </Text>
                </Text>
              </View>
              {fromHistory && (
                <View className="flex-row items-center mt-2">
                  <Ionicons name="analytics-outline" size={16} color="#6B7280" />
                  <Text className="text-gray-400 text-xs ml-1">
                    Calculado a partir de tu historial de entrenamientos
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Selector manual (sin historial o para override) */}
        {!hasEnoughHistory && (
          <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
            <View className="flex-row items-center mb-2">
              <Ionicons name="time-outline" size={20} color="#F97316" />
              <Text className="text-gray-900 font-semibold ml-2">Hora de entrenamiento</Text>
            </View>
            <Text className="text-gray-500 text-sm mb-4">
              Todavía no tenés suficientes sesiones (mínimo {MIN_SESSIONS_FOR_HISTORY}).
              Indicá a qué hora solés entrenar.
            </Text>

            {/* Selector hora:minuto */}
            <View className="flex-row items-center justify-center mb-4">
              {/* Horas */}
              <View className="items-center">
                <TouchableOpacity onPress={() => adjustHour(1)} className="p-3">
                  <Ionicons name="chevron-up" size={24} color="#3B82F6" />
                </TouchableOpacity>
                <Text className="text-4xl font-bold text-gray-900 w-16 text-center">
                  {manualHour.toString().padStart(2, '0')}
                </Text>
                <TouchableOpacity onPress={() => adjustHour(-1)} className="p-3">
                  <Ionicons name="chevron-down" size={24} color="#3B82F6" />
                </TouchableOpacity>
              </View>

              <Text className="text-4xl font-bold text-gray-400 mx-2">:</Text>

              {/* Minutos (en pasos de 15) */}
              <View className="items-center">
                <TouchableOpacity onPress={() => adjustMinute(15)} className="p-3">
                  <Ionicons name="chevron-up" size={24} color="#3B82F6" />
                </TouchableOpacity>
                <Text className="text-4xl font-bold text-gray-900 w-16 text-center">
                  {manualMinute.toString().padStart(2, '0')}
                </Text>
                <TouchableOpacity onPress={() => adjustMinute(-15)} className="p-3">
                  <Ionicons name="chevron-down" size={24} color="#3B82F6" />
                </TouchableOpacity>
              </View>
            </View>

            <Text className="text-gray-400 text-xs text-center mb-3">
              Te vamos a avisar 15 minutos antes ({formatTime(
                Math.max(0, manualHour - (manualMinute < 15 ? 1 : 0)),
                (manualMinute - 15 + 60) % 60
              )})
            </Text>

            <TouchableOpacity
              onPress={handleSaveManualTime}
              disabled={isSaving}
              className="bg-blue-500 rounded-xl py-3 items-center"
            >
              <Text className="text-white font-semibold">Activar recordatorio</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Info */}
        <View className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <View className="flex-row items-start">
            <Ionicons name="information-circle" size={20} color="#3B82F6" />
            <Text className="text-blue-700 text-sm ml-2 flex-1">
              La hora se recalcula automáticamente después de cada entrenamiento completado,
              para adaptarse a tu rutina real.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

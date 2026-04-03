import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

// Configurar cómo se muestran las notificaciones cuando la app está en primer plano
// expo-notifications no está disponible en Expo Go desde SDK 53 — falla silenciosamente
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch (e) {
  console.log('expo-notifications no disponible en Expo Go:', e);
}

const NOTIFICATION_ID = 'workout-reminder';
export const MIN_SESSIONS_FOR_HISTORY = 3;
const REMINDER_MINUTES_BEFORE = 15;

// Solicitar permisos de notificaciones
export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('workout-reminders', {
      name: 'Recordatorios de entrenamiento',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// Calcular la hora promedio de entrenamiento de las últimas sesiones
export async function getAverageWorkoutHour(userId: string): Promise<number | null> {
  const { data: sessions } = await supabase
    .from('workout_sessions')
    .select('started_at')
    .eq('user_id', userId)
    .not('finished_at', 'is', null)
    .order('started_at', { ascending: false })
    .limit(10);

  if (!sessions || sessions.length < MIN_SESSIONS_FOR_HISTORY) return null;

  // Calcular promedio en minutos desde medianoche
  const totalMinutes = sessions.reduce((sum, s) => {
    const date = new Date(s.started_at);
    return sum + date.getHours() * 60 + date.getMinutes();
  }, 0);

  const avgMinutes = Math.round(totalMinutes / sessions.length);
  return avgMinutes; // minutos desde medianoche
}

// Programar notificación diaria para el día siguiente
export async function scheduleWorkoutReminder(minutesFromMidnight: number): Promise<void> {
  // Cancelar recordatorio anterior si existe
  await cancelWorkoutReminder();

  const reminderMinutes = minutesFromMidnight - REMINDER_MINUTES_BEFORE;
  const hours = Math.floor(reminderMinutes / 60);
  const minutes = reminderMinutes % 60;

  // Ajustar si queda negativo (antes de medianoche)
  const finalHours = hours < 0 ? 0 : hours;
  const finalMinutes = minutes < 0 ? 0 : minutes;

  await Notifications.scheduleNotificationAsync({
    identifier: NOTIFICATION_ID,
    content: {
      title: 'Hora de entrenar 💪',
      body: 'Tu sesión de hoy te está esperando',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: finalHours,
      minute: finalMinutes,
    },
  });
}

// Cancelar recordatorio activo
export async function cancelWorkoutReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_ID);
}

// Verificar si hay un recordatorio activo
export async function hasActiveReminder(): Promise<boolean> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  return scheduled.some(n => n.identifier === NOTIFICATION_ID);
}

// Lógica principal: programa el recordatorio basado en historial o en hora manual
export async function setupWorkoutReminder(
  userId: string,
  manualMinutesFromMidnight?: number
): Promise<{ scheduled: boolean; hour: number; minute: number; fromHistory: boolean }> {
  const granted = await requestNotificationPermissions();
  if (!granted) return { scheduled: false, hour: 0, minute: 0, fromHistory: false };

  let minutesFromMidnight = manualMinutesFromMidnight ?? null;
  let fromHistory = false;

  if (minutesFromMidnight === null) {
    minutesFromMidnight = await getAverageWorkoutHour(userId);
    fromHistory = minutesFromMidnight !== null;
  }

  if (minutesFromMidnight === null) {
    // Sin historial suficiente y sin hora manual: no programar
    return { scheduled: false, hour: 0, minute: 0, fromHistory: false };
  }

  await scheduleWorkoutReminder(minutesFromMidnight);

  const reminderMinutes = minutesFromMidnight - REMINDER_MINUTES_BEFORE;
  const hour = Math.max(0, Math.floor(reminderMinutes / 60));
  const minute = Math.max(0, reminderMinutes % 60);

  return { scheduled: true, hour, minute, fromHistory };
}

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'active_workout_snapshot';

export interface ExerciseProgressSnapshot {
  exerciseId: string;
  setsCompleted: number;
  isComplete: boolean;
}

export interface ActiveWorkoutSnapshot {
  userId: string;
  routineId: string;
  sessionId: string;
  startedAt: string;
  currentExerciseIndex: number;
  progress: ExerciseProgressSnapshot[];
  updatedAt: string;
}

export async function getActiveSnapshot(userId: string): Promise<ActiveWorkoutSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveWorkoutSnapshot;
    if (parsed.userId !== userId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveActiveSnapshot(snapshot: Omit<ActiveWorkoutSnapshot, 'updatedAt'>): Promise<void> {
  try {
    const payload: ActiveWorkoutSnapshot = { ...snapshot, updatedAt: new Date().toISOString() };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
  }
}

export async function clearActiveSnapshot(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
  }
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import { insertSetLog, type CreateSetLogData } from './setLogService';
import { finishWorkoutSession } from './workoutService';

const QUEUE_KEY = 'workout_sync_queue_v1';
const MAX_RETRIES = 8;

export type SyncOperation =
  | { id: string; type: 'insert_set_log'; payload: CreateSetLogData; retries: number; createdAt: string }
  | { id: string; type: 'finish_session'; sessionId: string; retries: number; createdAt: string };

export type SyncStatus = 'synced' | 'pending' | 'syncing' | 'error';

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function getSyncQueue(): Promise<SyncOperation[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SyncOperation[];
  } catch {
    return [];
  }
}

async function saveQueue(queue: SyncOperation[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function enqueueSetLog(payload: CreateSetLogData): Promise<string> {
  const queue = await getSyncQueue();
  const id = uid();
  queue.push({ id, type: 'insert_set_log', payload, retries: 0, createdAt: new Date().toISOString() });
  await saveQueue(queue);
  return id;
}

export async function enqueueFinishSession(sessionId: string): Promise<string> {
  const queue = await getSyncQueue();
  const filtered = queue.filter(op => !(op.type === 'finish_session' && op.sessionId === sessionId));
  const id = uid();
  filtered.push({ id, type: 'finish_session', sessionId, retries: 0, createdAt: new Date().toISOString() });
  await saveQueue(filtered);
  return id;
}

export async function clearSyncQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}

export async function processSyncQueue(): Promise<{
  status: SyncStatus;
  pending: number;
  error: Error | null;
}> {
  const queue = await getSyncQueue();
  if (queue.length === 0) {
    return { status: 'synced', pending: 0, error: null };
  }

  const remaining: SyncOperation[] = [];
  let lastError: Error | null = null;

  for (let i = 0; i < queue.length; i++) {
    const op = queue[i];
    let err: Error | null = null;

    if (op.type === 'insert_set_log') {
      ({ error: err } = await insertSetLog(op.payload));
    } else {
      ({ error: err } = await finishWorkoutSession(op.sessionId));
    }

    if (err) {
      lastError = err;
      if (op.retries + 1 < MAX_RETRIES) {
        remaining.push({ ...op, retries: op.retries + 1 });
      }
      remaining.push(...queue.slice(i + 1));
      break;
    }
  }

  await saveQueue(remaining);

  if (remaining.length === 0) {
    return { status: 'synced', pending: 0, error: null };
  }
  return {
    status: lastError ? 'error' : 'pending',
    pending: remaining.length,
    error: lastError,
  };
}

export async function flushSyncQueue(): Promise<{ success: boolean; error: Error | null }> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const { pending, error } = await processSyncQueue();
    if (pending === 0) return { success: true, error: null };
    if (error && attempt === 3) return { success: false, error };
    await new Promise(r => setTimeout(r, 600 * (attempt + 1)));
  }
  const pending = await getSyncQueue();
  return {
    success: pending.length === 0,
    error: pending.length > 0 ? new Error('No se pudieron sincronizar todos los registros') : null,
  };
}

export async function getPendingSyncCount(): Promise<number> {
  return (await getSyncQueue()).length;
}

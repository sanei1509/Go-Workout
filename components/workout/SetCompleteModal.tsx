import { useEffect, useMemo, useState } from 'react';
import {
  View, Text, Modal, TouchableOpacity, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeTokens } from '@/constants/theme';

const RIR_OPTIONS = [0, 1, 2, 3, 4, 5];

export interface SetCompletePayload {
  reps: number;
  weightKg: number;
  rir: number | null;
  skipped: boolean;
}

interface SetCompleteModalProps {
  visible: boolean;
  setNumber: number;
  totalSets: number;
  exerciseName: string;
  exerciseType: string;
  defaultReps: number;
  defaultWeight: number;
  onConfirm: (payload: SetCompletePayload) => void;
  onClose: () => void;
}

export function SetCompleteModal({
  visible,
  setNumber,
  totalSets,
  exerciseName,
  exerciseType,
  defaultReps,
  defaultWeight,
  onConfirm,
  onClose,
}: SetCompleteModalProps) {
  const { T, activeTheme } = useTheme();
  const actionDimBg = activeTheme === 'dark' ? '#00566a' : '#e0f7fa';
  const s = useMemo(() => createStyles(T, actionDimBg), [T, actionDimBg]);

  const [reps, setReps] = useState(defaultReps);
  const [weight, setWeight] = useState(defaultWeight);
  const [rir, setRir] = useState<number | null>(null);

  useEffect(() => {
    if (visible) {
      setReps(defaultReps);
      setWeight(defaultWeight);
      setRir(null);
    }
  }, [visible, defaultReps, defaultWeight, setNumber]);

  const isReps = exerciseType === 'reps';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.card}>
          <Text style={s.label}>SERIE {setNumber} DE {totalSets}</Text>
          <Text style={s.title} numberOfLines={2}>{exerciseName}</Text>

          {isReps ? (
            <>
              <Text style={s.fieldLabel}>REPS HECHAS</Text>
              <View style={s.stepperRow}>
                <TouchableOpacity onPress={() => setReps(r => Math.max(1, r - 1))} style={s.stepBtn}>
                  <Ionicons name="remove" size={20} color={T.action} />
                </TouchableOpacity>
                <Text style={s.stepValue}>{reps}</Text>
                <TouchableOpacity onPress={() => setReps(r => Math.min(50, r + 1))} style={s.stepBtn}>
                  <Ionicons name="add" size={20} color={T.action} />
                </TouchableOpacity>
              </View>

              <Text style={s.fieldLabel}>PESO (KG)</Text>
              <View style={s.stepperRow}>
                <TouchableOpacity onPress={() => setWeight(w => Math.max(0, w - 2.5))} style={s.stepBtn}>
                  <Ionicons name="remove" size={20} color={T.action} />
                </TouchableOpacity>
                <Text style={s.stepValue}>{weight}</Text>
                <TouchableOpacity onPress={() => setWeight(w => Math.min(500, w + 2.5))} style={s.stepBtn}>
                  <Ionicons name="add" size={20} color={T.action} />
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={s.fieldLabel}>{exerciseType === 'time' ? 'SEGUNDOS' : 'METROS'}</Text>
              <View style={s.stepperRow}>
                <TouchableOpacity onPress={() => setReps(r => Math.max(1, r - (exerciseType === 'time' ? 5 : 10)))} style={s.stepBtn}>
                  <Ionicons name="remove" size={20} color={T.action} />
                </TouchableOpacity>
                <Text style={s.stepValue}>{reps}</Text>
                <TouchableOpacity onPress={() => setReps(r => r + (exerciseType === 'time' ? 5 : 10))} style={s.stepBtn}>
                  <Ionicons name="add" size={20} color={T.action} />
                </TouchableOpacity>
              </View>
            </>
          )}

          <Text style={s.fieldLabel}>RIR — REPS EN RESERVA (opcional)</Text>
          <View style={s.rirRow}>
            {RIR_OPTIONS.map(n => (
              <TouchableOpacity
                key={n}
                onPress={() => setRir(rir === n ? null : n)}
                style={[s.rirChip, rir === n && s.rirChipActive]}
              >
                <Text style={[s.rirText, rir === n && s.rirTextActive]}>{n === 5 ? '5+' : n}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            onPress={() => onConfirm({ reps, weightKg: weight, rir, skipped: false })}
            style={s.confirmBtn}
            activeOpacity={0.85}
          >
            <Text style={s.confirmText}>GUARDAR SERIE</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onConfirm({ reps: 0, weightKg: 0, rir: null, skipped: true })}
            style={s.skipBtn}
            activeOpacity={0.7}
          >
            <Text style={s.skipText}>Omitir serie</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} style={s.cancelBtn}>
            <Text style={s.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(T: ThemeTokens, actionDimBg: string) {
  return StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
    card: {
      backgroundColor: T.surfaceElevated,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 24,
      paddingBottom: 36,
      borderWidth: 1,
      borderColor: T.border,
    },
    label: { color: T.textSecondary, fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 2, marginBottom: 6 },
    title: { color: T.textPrimary, fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold', marginBottom: 20 },
    fieldLabel: { color: T.textSecondary, fontSize: 9, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 2, marginBottom: 8, marginTop: 12 },
    stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 },
    stepBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center' },
    stepValue: { color: T.textPrimary, fontSize: 24, fontFamily: 'SpaceGrotesk_700Bold', minWidth: 48, textAlign: 'center' },
    rirRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
    rirChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: T.border, backgroundColor: T.border },
    rirChipActive: { backgroundColor: actionDimBg, borderColor: T.action },
    rirText: { color: T.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk_600SemiBold' },
    rirTextActive: { color: T.action },
    confirmBtn: { backgroundColor: T.action, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
    confirmText: { color: T.actionFg, fontSize: 14, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1.5 },
    skipBtn: { alignItems: 'center', paddingVertical: 14 },
    skipText: { color: T.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk_600SemiBold' },
    cancelBtn: { alignItems: 'center', paddingVertical: 8 },
    cancelText: { color: T.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular' },
  });
}

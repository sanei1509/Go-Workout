import { useMemo } from 'react';
import {
  View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeTokens } from '@/constants/theme';
import { getSubstituteExercises } from '@/lib/exercises/substitutes';

interface SubstituteExerciseModalProps {
  visible: boolean;
  exerciseName: string;
  onSelect: (name: string) => void;
  onClose: () => void;
}

export function SubstituteExerciseModal({
  visible,
  exerciseName,
  onSelect,
  onClose,
}: SubstituteExerciseModalProps) {
  const { T } = useTheme();
  const s = useMemo(() => createStyles(T), [T]);
  const alternatives = useMemo(() => getSubstituteExercises(exerciseName), [exerciseName]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={s.safe}>
        <View style={s.header}>
          <Text style={s.title}>SUSTITUIR EJERCICIO</Text>
          <TouchableOpacity onPress={onClose} style={{ padding: 6 }}>
            <Ionicons name="close" size={22} color={T.textSecondary} />
          </TouchableOpacity>
        </View>
        <Text style={s.sub}>En lugar de: {exerciseName}</Text>
        <ScrollView contentContainerStyle={s.list}>
          {alternatives.map(alt => (
            <TouchableOpacity
              key={alt.label}
              onPress={() => { onSelect(alt.label); onClose(); }}
              style={s.row}
              activeOpacity={0.8}
            >
              <View style={{ flex: 1 }}>
                <Text style={s.rowName}>{alt.label}</Text>
                <Text style={s.rowMuscles}>{alt.primary.join(' · ')}</Text>
              </View>
              <Ionicons name="swap-horizontal" size={18} color={T.action} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

function createStyles(T: ThemeTokens) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: T.surface, paddingTop: 12 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 10 },
    title: { color: T.textPrimary, fontSize: 13, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 2, flex: 1 },
    sub: { color: T.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular', paddingHorizontal: 20, marginBottom: 12 },
    list: { paddingHorizontal: 20, paddingBottom: 32 },
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: T.border },
    rowName: { color: T.textPrimary, fontSize: 14, fontFamily: 'SpaceGrotesk_600SemiBold' },
    rowMuscles: { color: T.textSecondary, fontSize: 10, fontFamily: 'SpaceGrotesk_400Regular', marginTop: 2, textTransform: 'capitalize' },
  });
}

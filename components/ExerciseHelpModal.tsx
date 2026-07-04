import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  ScrollView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { lookupExercise } from '@/lib/exercises/lookup';
import type { MuscleGroup } from '@/lib/exercises/catalog';
import { searchExercises } from '@/lib/services/exerciseService';

// ─── Datos por músculo ────────────────────────────────────────────────────────

const MUSCLE_COLOR: Record<MuscleGroup, string> = {
  chest:      '#00D1FF',
  back:       '#4ade80',
  shoulders:  '#a78bfa',
  biceps:     '#FEB127',
  triceps:    '#fb923c',
  forearms:   '#94a3b8',
  traps:      '#c084fc',
  core:       '#f97316',
  glutes:     '#ec4899',
  quads:      '#4ade80',
  hamstrings: '#22d3ee',
  calves:     '#64748b',
};

const MUSCLE_LABEL: Record<MuscleGroup, string> = {
  chest:      'Pecho',
  back:       'Espalda',
  shoulders:  'Hombros',
  biceps:     'Bíceps',
  triceps:    'Tríceps',
  forearms:   'Antebr.',
  traps:      'Trapecios',
  core:       'Core',
  glutes:     'Glúteos',
  quads:      'Cuádric.',
  hamstrings: 'Isquiot.',
  calves:     'Gemelos',
};

// ─── Barra individual ─────────────────────────────────────────────────────────

const BAR_MAX_H   = 80;  // altura para primarios
const BAR_SEC_H   = 40;  // altura para secundarios
const BAR_W       = 30;
const ANIM_DURATION = 480;

function MuscleBar({
  muscle,
  isPrimary,
  delay,
}: {
  muscle: MuscleGroup;
  isPrimary: boolean;
  delay: number;
}) {
  const color     = MUSCLE_COLOR[muscle];
  const label     = MUSCLE_LABEL[muscle];
  const targetH   = isPrimary ? BAR_MAX_H : BAR_SEC_H;

  const progress  = useSharedValue(0);
  const pulse     = useSharedValue(1);

  useEffect(() => {
    // fill animation
    progress.value = withDelay(
      delay,
      withTiming(1, { duration: ANIM_DURATION, easing: Easing.out(Easing.cubic) })
    );
    // subtle continuous pulse for primary bars only
    if (isPrimary) {
      pulse.value = withDelay(
        delay + ANIM_DURATION,
        withRepeat(
          withSequence(
            withTiming(1.06, { duration: 900, easing: Easing.inOut(Easing.ease) }),
            withTiming(1.00, { duration: 900, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          false
        )
      );
    }
  }, []);

  const barStyle = useAnimatedStyle(() => ({
    height:    progress.value * targetH,
    transform: [{ scaleX: pulse.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: isPrimary ? progress.value * 0.35 : 0,
    height:  progress.value * targetH + 12,
  }));

  return (
    <View style={bs.col}>
      {/* Label role: PRIMARIO / SECUNDARIO */}
      <View style={[bs.roleTag, { backgroundColor: isPrimary ? color + '25' : 'transparent' }]}>
        <Text style={[bs.roleText, { color: isPrimary ? color : color + '80' }]}>
          {isPrimary ? '●' : '○'}
        </Text>
      </View>

      {/* Bar container — fixed height so bars grow from bottom */}
      <View style={bs.barTrack}>
        {/* Glow halo behind primary bars */}
        <Animated.View
          style={[
            bs.glow,
            { backgroundColor: color + '40', width: BAR_W + 10 },
            glowStyle,
          ]}
        />
        <Animated.View
          style={[
            bs.bar,
            {
              backgroundColor: color,
              opacity: isPrimary ? 1 : 0.45,
              width: BAR_W,
            },
            barStyle,
          ]}
        />
      </View>

      <Text style={[bs.label, { color: isPrimary ? color : color + '90' }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

// ─── Sección de barras ────────────────────────────────────────────────────────

function MuscleActivationBars({
  primary,
  secondary,
}: {
  primary: MuscleGroup[];
  secondary: MuscleGroup[];
}) {
  const bars = [
    ...primary.map((m, i) => ({ muscle: m, isPrimary: true,  delay: i * 70 })),
    ...secondary.map((m, i) => ({ muscle: m, isPrimary: false, delay: primary.length * 70 + 80 + i * 70 })),
  ];

  return (
    <View style={bs.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={bs.scroll}>
        {bars.map(({ muscle, isPrimary, delay }) => (
          <MuscleBar key={muscle} muscle={muscle} isPrimary={isPrimary} delay={delay} />
        ))}
      </ScrollView>
      <View style={bs.legend}>
        <View style={bs.legendItem}>
          <Text style={bs.legendDot}>●</Text>
          <Text style={bs.legendText}>Primario</Text>
        </View>
        <View style={bs.legendItem}>
          <Text style={[bs.legendDot, { opacity: 0.45 }]}>○</Text>
          <Text style={[bs.legendText, { opacity: 0.5 }]}>Secundario</Text>
        </View>
      </View>
    </View>
  );
}

const bs = StyleSheet.create({
  container: { marginBottom: 20 },
  scroll:    { flexDirection: 'row', gap: 10, paddingHorizontal: 4, paddingBottom: 4 },
  col:       { alignItems: 'center', width: 48 },
  roleTag:   { width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  roleText:  { fontSize: 8, lineHeight: 10 },
  barTrack:  {
    height: BAR_MAX_H,
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 6,
  },
  bar: {
    borderRadius: 6,
    position: 'absolute',
    bottom: 0,
  },
  glow: {
    position: 'absolute',
    bottom: -4,
    borderRadius: 10,
    blurRadius: 8,
  },
  label: {
    fontSize: 10,
    fontFamily: 'SpaceGrotesk-Medium',
    textAlign: 'center',
    width: 48,
  },
  legend: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 4,
    marginTop: 10,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:  { fontSize: 10, color: '#ffffff70' },
  legendText: { fontSize: 11, fontFamily: 'SpaceGrotesk-Regular', color: '#ffffff70' },
});

// ─── Modal principal ──────────────────────────────────────────────────────────

interface ExerciseHelpModalProps {
  exerciseName: string | null;
  onClose: () => void;
}

export function ExerciseHelpModal({ exerciseName, onClose }: ExerciseHelpModalProps) {
  const visible = !!exerciseName;
  const entry   = exerciseName ? lookupExercise(exerciseName) : null;

  // Media (imagen/gif) desde la DB. El catálogo local ya cubre músculos + tip,
  // así que esto es un enriquecimiento opcional: si no hay red o no hay match,
  // el modal funciona igual.
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!exerciseName) {
      setMediaUrl(null);
      return;
    }
    let active = true;
    searchExercises(exerciseName).then(({ exercises }) => {
      if (!active) return;
      const url = exercises.find((e) => e.image_url)?.image_url ?? null;
      setMediaUrl(url);
    });
    return () => {
      active = false;
    };
  }, [exerciseName]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={s.overlay}>
          <TouchableWithoutFeedback>
            <View style={s.card}>
              <View style={s.handle} />

              <View style={s.header}>
                <Text style={s.exerciseName}>
                  {entry?.label ?? exerciseName ?? ''}
                </Text>
                <TouchableOpacity onPress={onClose} hitSlop={12}>
                  <Text style={s.closeBtn}>✕</Text>
                </TouchableOpacity>
              </View>

              {entry ? (
                <ScrollView showsVerticalScrollIndicator={false}>
                  {mediaUrl && (
                    <Image
                      source={{ uri: mediaUrl }}
                      style={s.media}
                      resizeMode="cover"
                    />
                  )}

                  <MuscleActivationBars
                    primary={entry.primary}
                    secondary={entry.secondary}
                  />

                  <View style={s.tipBox}>
                    <Text style={s.tipLabel}>Técnica</Text>
                    <Text style={s.tipText}>{entry.tip}</Text>
                  </View>
                </ScrollView>
              ) : mediaUrl ? (
                <Image source={{ uri: mediaUrl }} style={s.media} resizeMode="cover" />
              ) : (
                <View style={s.noData}>
                  <Text style={s.noDataText}>
                    No tenemos información técnica sobre este ejercicio todavía.
                  </Text>
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#111c20',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 12,
    maxHeight: '80%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#ffffff30',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  exerciseName: {
    fontSize: 18,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#ffffff',
    flex: 1,
    marginRight: 8,
  },
  closeBtn: {
    fontSize: 16,
    color: '#ffffff60',
    padding: 4,
  },
  media: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 20,
    backgroundColor: '#ffffff0a',
  },
  tipBox: {
    backgroundColor: '#ffffff0a',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#00D1FF',
  },
  tipLabel: {
    fontSize: 11,
    fontFamily: 'SpaceGrotesk-Bold',
    color: '#00D1FF',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  tipText: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Regular',
    color: '#ffffffcc',
    lineHeight: 21,
  },
  noData: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 14,
    fontFamily: 'SpaceGrotesk-Regular',
    color: '#ffffff50',
    textAlign: 'center',
  },
});

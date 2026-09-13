import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeTokens } from '@/constants/theme';
import {
  type WorkoutRecommendation,
  actionIcon,
  actionColor,
} from '@/lib/services/progressionService';

interface NextStepCardProps {
  recommendation: WorkoutRecommendation;
  compact?: boolean;
}

export function NextStepCard({ recommendation, compact }: NextStepCardProps) {
  const { T } = useTheme();
  const s = useMemo(() => createStyles(T), [T]);
  const color = actionColor(recommendation.action, T);
  const icon = actionIcon(recommendation.action);

  return (
    <View style={[s.card, compact && s.cardCompact]}>
      <View style={[s.iconWrap, { backgroundColor: color + '22', borderColor: color + '44' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.label}>PRÓXIMO PASO · {recommendation.routineName.toUpperCase()}</Text>
        <Text style={s.title}>{recommendation.title}</Text>
        <Text style={s.detail}>{recommendation.detail}</Text>
      </View>
    </View>
  );
}

function createStyles(T: ThemeTokens) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      gap: 14,
      backgroundColor: T.surfaceElevated,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: T.border,
      padding: 16,
      marginBottom: 16,
    },
    cardCompact: { marginBottom: 12 },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: {
      color: T.textSecondary,
      fontSize: 9,
      fontFamily: 'SpaceGrotesk_700Bold',
      letterSpacing: 1.5,
      marginBottom: 4,
    },
    title: {
      color: T.textPrimary,
      fontSize: 15,
      fontFamily: 'SpaceGrotesk_700Bold',
      marginBottom: 4,
    },
    detail: {
      color: T.textSecondary,
      fontSize: 12,
      fontFamily: 'SpaceGrotesk_400Regular',
      lineHeight: 17,
    },
  });
}

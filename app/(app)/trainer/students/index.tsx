import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Image,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { getTrainerStudents, TrainerStudent } from '@/lib/services/trainerService';
import { formatRelativeDate } from '@/lib/services/workoutService';

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
  green:      '#4ade80',
};

const INACTIVITY_THRESHOLD_DAYS = 7;

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

export default function StudentsListScreen() {
  const { user } = useAuth();
  const [students, setStudents] = useState<TrainerStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadStudents = useCallback(async () => {
    if (!user?.id) return;
    const { students } = await getTrainerStudents(user.id);
    setStudents(students);
    setIsLoading(false);
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadStudents();
    }, [loadStudents])
  );

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadStudents();
    setIsRefreshing(false);
  };

  if (isLoading) {
    return (
      <View style={s.loadingContainer}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh}
            tintColor={C.primary} colors={[C.primary]} />
        }
      >
        <View style={s.headerRow}>
          <Text style={s.sectionTitle}>MIS ALUMNOS</Text>
          <View style={s.countBadge}>
            <Text style={s.countText}>{students.length}</Text>
          </View>
        </View>

        {students.length === 0 ? (
          <View style={s.emptyCard}>
            <Ionicons name="people-outline" size={32} color={C.neutral} />
            <Text style={s.emptyTitle}>Todavía no tenés alumnos</Text>
            <Text style={s.emptyBody}>
              Cuando un alumno acepte tu invitación va a aparecer acá.
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/trainer/create-invitation')}
              activeOpacity={0.85}
              style={{ alignSelf: 'stretch', marginTop: 8 }}
            >
              <LinearGradient
                colors={['#00566a', '#003d4d']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={s.emptyCta}
              >
                <Ionicons name="person-add-outline" size={16} color={C.primary} />
                <Text style={s.emptyCtaText}>INVITAR ALUMNO</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          students.map((st) => (
            <TouchableOpacity
              key={st.student_id}
              style={s.studentCard}
              onPress={() => router.push(`/trainer/students/${st.student_id}`)}
              activeOpacity={0.75}
            >
              <View style={s.accent} />
              {st.avatar_url ? (
                <Image source={{ uri: st.avatar_url }} style={s.avatar} />
              ) : (
                <View style={s.avatarFallback}>
                  <Text style={s.avatarLetter}>
                    {st.full_name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{st.full_name}</Text>
                <View style={s.tagRow}>
                  <View style={s.tag}>
                    <Text style={s.tagText}>{st.discipline.toUpperCase()}</Text>
                  </View>
                </View>
                {(() => {
                  const inactive = st.last_session_at && daysSince(st.last_session_at) >= INACTIVITY_THRESHOLD_DAYS;
                  const color = !st.last_session_at ? C.neutral : inactive ? C.tertiary : C.green;
                  return (
                    <View style={s.lastSessionRow}>
                      <Ionicons
                        name={!st.last_session_at ? 'moon-outline' : inactive ? 'alert-circle-outline' : 'time-outline'}
                        size={11}
                        color={color}
                      />
                      <Text style={[s.lastSession, { color }]}>
                        {st.last_session_at
                          ? `Entrenó ${formatRelativeDate(st.last_session_at).toLowerCase()}`
                          : 'Sin entrenamientos todavía'}
                      </Text>
                    </View>
                  );
                })()}
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.neutral} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:        { flex: 1, backgroundColor: C.bg },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },

  headerRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionTitle: { color: C.neutral, fontSize: 11, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 2 },
  countBadge:   { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: C.primaryDim, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  countText:    { color: C.primary, fontSize: 11, fontFamily: 'SpaceGrotesk_700Bold' },

  emptyCard:  { alignItems: 'center', backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, padding: 28, gap: 8 },
  emptyTitle: { color: C.textHi, fontSize: 15, fontFamily: 'SpaceGrotesk_700Bold' },
  emptyBody:  { color: C.textLo, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular', textAlign: 'center', lineHeight: 17 },
  emptyCta:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 10 },
  emptyCtaText: { color: C.primary, fontSize: 12, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1.5 },

  studentCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border,
    paddingVertical: 14, paddingRight: 14, paddingLeft: 18,
    marginBottom: 10, overflow: 'hidden',
  },
  accent:         { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: C.primary },
  avatar:         { width: 46, height: 46, borderRadius: 23 },
  avatarFallback: { width: 46, height: 46, borderRadius: 23, backgroundColor: C.primaryDim, alignItems: 'center', justifyContent: 'center' },
  avatarLetter:   { color: C.primary, fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold' },

  name:           { color: C.textHi, fontSize: 15, fontFamily: 'SpaceGrotesk_700Bold', marginBottom: 5 },
  tagRow:         { flexDirection: 'row', gap: 6, marginBottom: 5 },
  tag:            { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5, backgroundColor: C.cardDeep, borderWidth: 1, borderColor: C.border },
  tagText:        { color: C.textLo, fontSize: 8, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1 },
  lastSessionRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  lastSession:    { color: C.neutral, fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular' },
});

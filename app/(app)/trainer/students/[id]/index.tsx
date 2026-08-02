import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Image,
} from 'react-native';
import { router, useLocalSearchParams, Stack, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import {
  getTrainerStudents,
  getStudentForm,
  TrainerStudent,
  StudentForm,
} from '@/lib/services/trainerService';
import {
  getGeneralStats,
  getWeeklySessionsBars,
  GeneralStats,
  WeeklySessionsBar,
} from '@/lib/services/progressService';
import { getPlansAssignedByTrainer, Plan } from '@/lib/services/planService';
import {
  getUserSessions,
  WorkoutSession,
  formatDuration,
  formatRelativeDate,
} from '@/lib/services/workoutService';
import { FORM_FIELD_LABELS, FormField } from '@/lib/services/invitationService';

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

const BAR_MAX_HEIGHT = 56;

export default function StudentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [student, setStudent] = useState<TrainerStudent | null>(null);
  const [form, setForm] = useState<StudentForm | null>(null);
  const [stats, setStats] = useState<GeneralStats | null>(null);
  const [bars, setBars] = useState<WeeklySessionsBar[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadAll = useCallback(async () => {
    if (!user?.id || !id) return;

    const { students } = await getTrainerStudents(user.id);
    const st = students.find((x) => x.student_id === id) ?? null;
    setStudent(st);

    const [formRes, statsRes, barsRes, plansRes, sessionsRes] = await Promise.all([
      st ? getStudentForm(st.invitation_id) : Promise.resolve({ form: null, error: null }),
      getGeneralStats(id),
      getWeeklySessionsBars(id, 6),
      getPlansAssignedByTrainer(user.id, id),
      getUserSessions(id, 5),
    ]);
    setForm(formRes.form);
    setStats(statsRes.stats);
    setBars(barsRes.bars);
    setPlans(plansRes.plans);
    setSessions(sessionsRes.sessions.filter((sn) => sn.finished_at));
    setIsLoading(false);
  }, [user?.id, id]);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll])
  );

  const maxBar = Math.max(1, ...bars.map((b) => b.count));
  const formFields = (Object.keys(FORM_FIELD_LABELS) as FormField[]).filter(
    (f) => form && form[f] != null && `${form[f]}`.trim() !== ''
  );

  return (
    <View style={s.container}>
      <Stack.Screen
        options={{
          headerTitle: student?.full_name ?? 'Alumno',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.navigate('/trainer/students')}
              style={{ paddingRight: 12 }}
            >
              <Ionicons name="chevron-back" size={24} color={C.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      {isLoading ? (
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : !student ? (
        <View style={s.loadingContainer}>
          <Text style={s.emptyBody}>No encontramos a este alumno.</Text>
        </View>
      ) : (
        <>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 20, paddingBottom: 110 }}
          >
            {/* ── Hero ────────────────────────────────────────────────── */}
            <View style={s.heroCard}>
              <LinearGradient
                colors={['transparent', C.primary, 'transparent']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={s.heroTopLine}
              />
              <View style={s.heroBody}>
                {student.avatar_url ? (
                  <Image source={{ uri: student.avatar_url }} style={s.avatar} />
                ) : (
                  <View style={s.avatarFallback}>
                    <Text style={s.avatarLetter}>
                      {student.full_name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={s.heroName}>{student.full_name}</Text>
                  {student.email && <Text style={s.heroEmail}>{student.email}</Text>}
                  <View style={s.tagRow}>
                    <View style={s.tag}>
                      <Text style={s.tagText}>{student.discipline.toUpperCase()}</Text>
                    </View>
                    <View style={s.tag}>
                      <Text style={s.tagText}>{student.plan_type.toUpperCase()}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* ── Progreso ───────────────────────────────────────────── */}
            <Text style={s.sectionTitle}>PROGRESO</Text>
            <View style={s.statsRow}>
              <View style={s.statItem}>
                <Text style={s.statValue}>
                  {stats ? Math.round(stats.volumeThisWeek) : 0}
                </Text>
                <Text style={s.statLabel}>VOL. SEMANA</Text>
                {stats != null && stats.volumeChange !== 0 && (
                  <Text style={[s.statChange, { color: stats.volumeChange > 0 ? C.green : '#f87171' }]}>
                    {stats.volumeChange > 0 ? '+' : ''}{Math.round(stats.volumeChange)}%
                  </Text>
                )}
              </View>
              <View style={s.statDivider} />
              <View style={s.statItem}>
                <Text style={s.statValue}>{stats?.totalSets ?? 0}</Text>
                <Text style={s.statLabel}>SETS TOTALES</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statItem}>
                <Text style={s.statValue}>{stats?.distinctExercises ?? 0}</Text>
                <Text style={s.statLabel}>EJERCICIOS</Text>
              </View>
            </View>

            {/* Barras de sesiones por semana */}
            {bars.length > 0 && (
              <View style={s.barsCard}>
                <Text style={s.barsTitle}>SESIONES POR SEMANA</Text>
                <View style={s.barsRow}>
                  {bars.map((b, i) => (
                    <View key={i} style={s.barCol}>
                      <Text style={s.barCount}>{b.count > 0 ? b.count : ''}</Text>
                      <View
                        style={[
                          s.bar,
                          {
                            height: Math.max(4, (b.count / maxBar) * BAR_MAX_HEIGHT),
                            backgroundColor: b.count > 0 ? C.primary : C.cardDeep,
                          },
                        ]}
                      />
                      <Text style={s.barLabel}>{b.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* ── Formulario ─────────────────────────────────────────── */}
            <Text style={s.sectionTitle}>FORMULARIO INICIAL</Text>
            {formFields.length > 0 ? (
              <View style={s.formCard}>
                {formFields.map((f, i) => (
                  <View key={f} style={[s.formRow, i > 0 && s.formRowBorder]}>
                    <Text style={s.formLabel}>{FORM_FIELD_LABELS[f].toUpperCase()}</Text>
                    <Text style={s.formValue}>{`${form![f]}`}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={s.quietCard}>
                <Ionicons name="document-text-outline" size={18} color={C.neutral} />
                <Text style={s.quietText}>No completó el formulario inicial.</Text>
              </View>
            )}

            {/* ── Planes asignados ───────────────────────────────────── */}
            <Text style={s.sectionTitle}>PLANES ASIGNADOS</Text>
            {plans.length === 0 ? (
              <View style={s.quietCard}>
                <Ionicons name="clipboard-outline" size={18} color={C.neutral} />
                <Text style={s.quietText}>Todavía no le asignaste un plan.</Text>
              </View>
            ) : (
              <View style={s.planList}>
                {plans.map((p, i) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[s.planItem, i > 0 && s.planItemBorder]}
                    onPress={() => router.push(`/trainer/plan/${p.id}`)}
                    activeOpacity={0.75}
                  >
                    <View style={s.planAccent} />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={s.planName}>{p.name}</Text>
                        {!p.is_published && (
                          <View style={s.draftTag}>
                            <Text style={s.draftTagText}>BORRADOR</Text>
                          </View>
                        )}
                      </View>
                      <Text style={s.planMeta}>
                        {p.discipline} · {p.weekly_frequency} días/semana
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={C.neutral} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* ── Últimas sesiones ───────────────────────────────────── */}
            <Text style={s.sectionTitle}>ÚLTIMAS SESIONES</Text>
            {sessions.length === 0 ? (
              <View style={s.quietCard}>
                <Ionicons name="moon-outline" size={18} color={C.neutral} />
                <Text style={s.quietText}>Sin entrenamientos registrados.</Text>
              </View>
            ) : (
              <View style={s.planList}>
                {sessions.map((sn, i) => (
                  <View key={sn.id} style={[s.sessionRow, i > 0 && s.planItemBorder]}>
                    <View style={s.sessionIcon}>
                      <Ionicons name="checkmark" size={14} color={C.green} />
                    </View>
                    <Text style={s.sessionDate}>{formatRelativeDate(sn.started_at)}</Text>
                    <Text style={s.sessionDuration}>
                      {formatDuration(sn.started_at, sn.finished_at)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          {/* ── CTA fija ─────────────────────────────────────────────── */}
          <View style={s.footer}>
            <TouchableOpacity
              onPress={() => router.push(`/trainer/students/${id}/assign-plan`)}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#00566a', '#003d4d']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={s.ctaBtn}
              >
                <Ionicons name="add-circle-outline" size={18} color={C.primary} />
                <Text style={s.ctaText}>ASIGNAR PLAN</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container:        { flex: 1, backgroundColor: C.bg },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },

  sectionTitle: { color: C.neutral, fontSize: 11, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 2, marginBottom: 10, marginTop: 20 },

  // Hero
  heroCard:      { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  heroTopLine:   { height: 2, opacity: 0.6 },
  heroBody:      { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18 },
  avatar:        { width: 56, height: 56, borderRadius: 28, borderWidth: 1.5, borderColor: C.primary },
  avatarFallback:{ width: 56, height: 56, borderRadius: 28, backgroundColor: C.primaryDim, alignItems: 'center', justifyContent: 'center' },
  avatarLetter:  { color: C.primary, fontSize: 22, fontFamily: 'SpaceGrotesk_700Bold' },
  heroName:      { color: C.textHi, fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold', marginBottom: 2 },
  heroEmail:     { color: C.neutral, fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular', marginBottom: 7 },
  tagRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag:           { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5, backgroundColor: C.cardDeep, borderWidth: 1, borderColor: C.border },
  tagText:       { color: C.textLo, fontSize: 8, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1 },

  // Stats
  statsRow:    { flexDirection: 'row', backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, overflow: 'hidden', marginBottom: 10 },
  statItem:    { flex: 1, alignItems: 'center', paddingVertical: 14 },
  statDivider: { width: 1, backgroundColor: C.border },
  statValue:   { color: C.textHi, fontSize: 20, fontFamily: 'SpaceGrotesk_700Bold', marginBottom: 2 },
  statLabel:   { color: C.textLo, fontSize: 8, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1.5 },
  statChange:  { fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold', marginTop: 2 },

  // Bars
  barsCard:  { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 16 },
  barsTitle: { color: C.neutral, fontSize: 9, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 2, marginBottom: 12 },
  barsRow:   { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  barCol:    { alignItems: 'center', flex: 1, gap: 4 },
  barCount:  { color: C.primary, fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold', height: 14 },
  bar:       { width: 18, borderRadius: 4 },
  barLabel:  { color: C.neutral, fontSize: 8, fontFamily: 'SpaceGrotesk_400Regular' },

  // Form
  formCard:      { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  formRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, paddingHorizontal: 16, paddingVertical: 12 },
  formRowBorder: { borderTopWidth: 1, borderTopColor: C.border },
  formLabel:     { color: C.neutral, fontSize: 9, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1.5, paddingTop: 2 },
  formValue:     { color: C.textHi, fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular', flex: 1, textAlign: 'right' },

  // Quiet card (empty states discretos)
  quietCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 16 },
  quietText: { color: C.textLo, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular', flex: 1 },
  emptyBody: { color: C.textLo, fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular' },

  // Plan list
  planList:       { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  planItem:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingRight: 14, paddingLeft: 18, gap: 12 },
  planItemBorder: { borderTopWidth: 1, borderTopColor: C.border },
  planAccent:     { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: C.primary },
  planName:       { color: C.textHi, fontSize: 14, fontFamily: 'SpaceGrotesk_700Bold', marginBottom: 2 },
  planMeta:       { color: C.neutral, fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular' },
  draftTag:       { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: C.cardDeep, borderWidth: 1, borderColor: C.border },
  draftTagText:   { color: C.neutral, fontSize: 7, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1 },

  // Sessions
  sessionRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  sessionIcon:     { width: 26, height: 26, borderRadius: 13, backgroundColor: '#0a1f10', alignItems: 'center', justifyContent: 'center' },
  sessionDate:     { flex: 1, color: C.textHi, fontSize: 13, fontFamily: 'SpaceGrotesk_600SemiBold' },
  sessionDuration: { color: C.neutral, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular' },

  // Footer CTA
  footer:  { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: 24, backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.border },
  ctaBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 10, gap: 10 },
  ctaText: { color: C.primary, fontSize: 13, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1.5 },
});

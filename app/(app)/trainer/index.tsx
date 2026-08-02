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
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { useAlert } from '@/components/AppAlert';
import { getTrainerStudents, TrainerStudent } from '@/lib/services/trainerService';
import { getTrainerInvitations } from '@/lib/services/invitationService';
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
};

export default function TrainerDashboard() {
  const { profile, user, signOut } = useAuth();
  const { showAlert } = useAlert();
  const [students, setStudents] = useState<TrainerStudent[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const needsDisciplines = !profile?.disciplines || profile.disciplines.length === 0;

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    const [studentsRes, pendingRes] = await Promise.all([
      getTrainerStudents(user.id),
      getTrainerInvitations(user.id, 'PENDING'),
    ]);
    setStudents(studentsRes.students);
    setPendingCount(pendingRes.invitations.length);
    setIsLoading(false);
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const handleLogout = async () => {
    const { error } = await signOut();
    if (error) {
      showAlert('Error', error.message);
      return;
    }
    router.replace('/login');
  };

  const firstName = (profile?.full_name || user?.email || 'Entrenador').split(' ')[0];

  if (isLoading) {
    return (
      <View style={s.loadingContainer}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <LinearGradient
        colors={['transparent', C.primary, 'transparent']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={s.topLine}
      />

      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh}
              tintColor={C.primary} colors={[C.primary]} />
          }
        >
          {/* ── Header ──────────────────────────────────────────────── */}
          <View style={s.header}>
            <View>
              <Text style={s.headerLabel}>PANEL DEL ENTRENADOR</Text>
              <Text style={s.greeting}>Hola, {firstName}</Text>
            </View>
            <TouchableOpacity onPress={handleLogout} style={s.logoutBtn} activeOpacity={0.7}>
              <Ionicons name="log-out-outline" size={20} color={C.neutral} />
            </TouchableOpacity>
          </View>

          {/* ── Prompt de disciplinas ───────────────────────────────── */}
          {needsDisciplines && (
            <TouchableOpacity
              style={s.disciplinesPrompt}
              onPress={() => router.push('/trainer/profile')}
              activeOpacity={0.85}
            >
              <View style={s.disciplinesPromptIcon}>
                <Ionicons name="barbell-outline" size={20} color={C.tertiary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.disciplinesPromptTitle}>Elegí tus disciplinas</Text>
                <Text style={s.disciplinesPromptBody}>
                  Definí en qué entrenás (1 a 3) para armar planes con ejercicios de tu especialidad.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.tertiary} />
            </TouchableOpacity>
          )}

          {/* ── Stats ───────────────────────────────────────────────── */}
          <View style={s.statsStrip}>
            <View style={s.statBlock}>
              <View style={s.statIconWrap}>
                <Ionicons name="people-outline" size={16} color={C.primary} />
              </View>
              <View>
                <Text style={s.statValue}>{students.length}</Text>
                <Text style={s.statLabel}>ALUMNOS</Text>
              </View>
            </View>
            <View style={s.statDivider} />
            <View style={s.statBlock}>
              <View style={[s.statIconWrap, { backgroundColor: '#2a1f00' }]}>
                <Ionicons name="mail-unread-outline" size={16} color={C.tertiary} />
              </View>
              <View>
                <Text style={s.statValue}>{pendingCount}</Text>
                <Text style={s.statLabel}>PENDIENTES</Text>
              </View>
            </View>
          </View>

          {/* ── Acciones ────────────────────────────────────────────── */}
          <Text style={s.sectionTitle}>ACCIONES</Text>

          <TouchableOpacity
            onPress={() => router.push('/trainer/create-invitation')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#00566a', '#003d4d']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={s.ctaBtn}
            >
              <Ionicons name="person-add-outline" size={18} color={C.primary} />
              <Text style={s.ctaText}>INVITAR ALUMNO</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={s.actionsRow}>
            <TouchableOpacity
              style={s.actionCard}
              onPress={() => router.push('/trainer/students')}
              activeOpacity={0.85}
            >
              <Ionicons name="people-outline" size={20} color={C.primary} />
              <Text style={s.actionCardText}>VER ALUMNOS</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.actionCard}
              onPress={() => router.push('/trainer/coach')}
              activeOpacity={0.85}
            >
              <Ionicons name="sparkles-outline" size={20} color="#a78bfa" />
              <Text style={s.actionCardText}>ASISTENTE IA</Text>
            </TouchableOpacity>
          </View>

          {/* ── Alumnos recientes ───────────────────────────────────── */}
          <View style={s.sectionHeaderRow}>
            <Text style={s.sectionTitle}>ALUMNOS RECIENTES</Text>
            {students.length > 3 && (
              <TouchableOpacity onPress={() => router.push('/trainer/students')}>
                <Text style={s.sectionLink}>VER TODOS</Text>
              </TouchableOpacity>
            )}
          </View>

          {students.length === 0 ? (
            <View style={s.emptyCard}>
              <Ionicons name="people-outline" size={28} color={C.neutral} />
              <Text style={s.emptyTitle}>Todavía no tenés alumnos</Text>
              <Text style={s.emptyBody}>
                Invitá a tu primer alumno para empezar a asignarle planes.
              </Text>
            </View>
          ) : (
            <View style={s.studentList}>
              {students.slice(0, 3).map((st, i) => (
                <TouchableOpacity
                  key={st.student_id}
                  style={[s.studentItem, i > 0 && s.studentItemBorder]}
                  onPress={() => router.push(`/trainer/students/${st.student_id}`)}
                  activeOpacity={0.7}
                >
                  <View style={s.studentAccent} />
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
                    <Text style={s.studentName}>{st.full_name}</Text>
                    <Text style={s.studentMeta}>
                      {st.discipline} · {st.last_session_at
                        ? `Entrenó ${formatRelativeDate(st.last_session_at).toLowerCase()}`
                        : 'Sin entrenamientos'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={C.neutral} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  container:        { flex: 1, backgroundColor: C.bg },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },
  topLine:          { position: 'absolute', top: 0, left: 0, right: 0, height: 2, opacity: 0.4, zIndex: 10 },

  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  headerLabel: { color: C.neutral, fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 3, marginBottom: 4 },
  greeting:    { color: C.textHi, fontSize: 24, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: -0.5 },
  logoutBtn:   { width: 38, height: 38, borderRadius: 10, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },

  disciplinesPrompt: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#130d00', borderRadius: 12, borderWidth: 1, borderColor: '#4a3200',
    padding: 14, marginBottom: 14,
  },
  disciplinesPromptIcon:  { width: 36, height: 36, borderRadius: 10, backgroundColor: '#2a1f00', alignItems: 'center', justifyContent: 'center' },
  disciplinesPromptTitle: { color: C.tertiary, fontSize: 14, fontFamily: 'SpaceGrotesk_700Bold', marginBottom: 2 },
  disciplinesPromptBody:  { color: C.textLo, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular', lineHeight: 16 },

  statsStrip:  { flexDirection: 'row', backgroundColor: C.card, borderRadius: 10, borderWidth: 1, borderColor: C.border, overflow: 'hidden', marginBottom: 22 },
  statBlock:   { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  statDivider: { width: 1, backgroundColor: C.border },
  statIconWrap:{ width: 32, height: 32, borderRadius: 8, backgroundColor: C.primaryDim, alignItems: 'center', justifyContent: 'center' },
  statValue:   { color: C.textHi, fontSize: 18, fontFamily: 'SpaceGrotesk_600SemiBold' },
  statLabel:   { color: C.neutral, fontSize: 9, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1.5 },

  sectionTitle:     { color: C.neutral, fontSize: 11, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 2, marginBottom: 10 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 22 },
  sectionLink:      { color: C.primary, fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1.5, marginBottom: 10 },

  ctaBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 10, gap: 10, marginBottom: 10 },
  ctaText: { color: C.primary, fontSize: 13, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1.5 },

  actionsRow:     { flexDirection: 'row', gap: 10 },
  actionCard:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.card, borderRadius: 10, borderWidth: 1, borderColor: C.border, paddingVertical: 14 },
  actionCardText: { color: C.textHi, fontSize: 11, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1 },

  emptyCard:  { alignItems: 'center', backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 28, gap: 8 },
  emptyTitle: { color: C.textHi, fontSize: 14, fontFamily: 'SpaceGrotesk_700Bold' },
  emptyBody:  { color: C.textLo, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular', textAlign: 'center', lineHeight: 17 },

  studentList:       { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  studentItem:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingRight: 14, paddingLeft: 18, gap: 12 },
  studentItemBorder: { borderTopWidth: 1, borderTopColor: C.border },
  studentAccent:     { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: C.primary },
  avatar:            { width: 38, height: 38, borderRadius: 19 },
  avatarFallback:    { width: 38, height: 38, borderRadius: 19, backgroundColor: C.primaryDim, alignItems: 'center', justifyContent: 'center' },
  avatarLetter:      { color: C.primary, fontSize: 15, fontFamily: 'SpaceGrotesk_700Bold' },
  studentName:       { color: C.textHi, fontSize: 14, fontFamily: 'SpaceGrotesk_700Bold', marginBottom: 2 },
  studentMeta:       { color: C.neutral, fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular' },
});

/**
 * Trainer Dashboard — pantalla piloto migrada al sistema de tokens
 *
 * PATRÓN A SEGUIR EN TODAS LAS PANTALLAS:
 *   1. Importar useTheme de @/contexts/ThemeContext
 *   2. Llamar const { T } = useTheme() dentro del componente
 *   3. Crear estilos con useMemo(() => createStyles(T), [T])
 *   4. Nunca referenciar valores hex directamente — siempre T.tokenName
 */
import { useState, useCallback, useMemo } from 'react';
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
import { useTheme } from '@/contexts/ThemeContext';
import { useAlert } from '@/components/AppAlert';
import { getTrainerStudents, TrainerStudent } from '@/lib/services/trainerService';
import { getTrainerInvitations } from '@/lib/services/invitationService';
import { formatRelativeDate } from '@/lib/services/workoutService';

export default function TrainerDashboard() {
  const { profile, user, signOut } = useAuth();
  const { showAlert } = useAlert();
  const { T, activeTheme } = useTheme();
  const s = useMemo(() => createStyles(T), [T]);

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

  // Color derivado: action con muy baja opacidad para fondos de íconos
  const actionDimBg = activeTheme === 'dark' ? '#00566a' : '#e0f7fa';
  // Fondo del prompt de atención (attention-tinted)
  const attentionDimBg = activeTheme === 'dark' ? '#130d00' : '#fff8e1';
  const attentionBorder = activeTheme === 'dark' ? '#4a3200' : '#ffe082';

  if (isLoading) {
    return (
      <View style={s.loadingContainer}>
        <ActivityIndicator size="large" color={T.action} />
      </View>
    );
  }

  return (
    <View style={s.container}>
      {/* Línea superior sutil — usa action pero con muy baja opacidad */}
      <LinearGradient
        colors={['transparent', T.action, 'transparent']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={s.topLine}
      />

      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={T.action}
              colors={[T.action]}
            />
          }
        >
          {/* ── Header ──────────────────────────────────────────────── */}
          <View style={s.header}>
            <View>
              <Text style={s.headerLabel}>PANEL DEL ENTRENADOR</Text>
              <Text style={s.greeting}>Hola, {firstName}</Text>
            </View>
            <TouchableOpacity onPress={handleLogout} style={s.logoutBtn} activeOpacity={0.7}>
              <Ionicons name="log-out-outline" size={20} color={T.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* ── Prompt de disciplinas ───────────────────────────────── */}
          {needsDisciplines && (
            <TouchableOpacity
              style={[s.disciplinesPrompt, { backgroundColor: attentionDimBg, borderColor: attentionBorder }]}
              onPress={() => router.push('/trainer/profile')}
              activeOpacity={0.85}
            >
              <View style={[s.disciplinesPromptIcon, { backgroundColor: attentionBorder }]}>
                <Ionicons name="barbell-outline" size={20} color={T.attention} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.disciplinesPromptTitle}>Elegí tus disciplinas</Text>
                <Text style={s.disciplinesPromptBody}>
                  Definí en qué entrenás (1 a 3) para armar planes con ejercicios de tu especialidad.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={T.attention} />
            </TouchableOpacity>
          )}

          {/* ── Stats ───────────────────────────────────────────────── */}
          <View style={s.statsStrip}>
            <View style={s.statBlock}>
              <View style={[s.statIconWrap, { backgroundColor: actionDimBg }]}>
                <Ionicons name="people-outline" size={16} color={T.action} />
              </View>
              <View>
                <Text style={s.statValue}>{students.length}</Text>
                <Text style={s.statLabel}>ALUMNOS</Text>
              </View>
            </View>
            <View style={s.statDivider} />
            <View style={s.statBlock}>
              <View style={[s.statIconWrap, { backgroundColor: attentionDimBg }]}>
                <Ionicons name="mail-unread-outline" size={16} color={T.attention} />
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
            style={s.ctaBtn}
          >
            <Ionicons name="person-add-outline" size={18} color={T.actionFg} />
            <Text style={s.ctaText}>INVITAR ALUMNO</Text>
          </TouchableOpacity>

          <View style={s.actionsRow}>
            <TouchableOpacity
              style={s.actionCard}
              onPress={() => router.push('/trainer/students')}
              activeOpacity={0.85}
            >
              <Ionicons name="people-outline" size={20} color={T.action} />
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
              <Ionicons name="people-outline" size={28} color={T.textSecondary} />
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
                    <View style={[s.avatarFallback, { backgroundColor: actionDimBg }]}>
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
                  <Ionicons name="chevron-forward" size={16} color={T.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Estilos dinámicos — reciben los tokens del tema activo.
// Se recalculan solo cuando cambia el tema (useMemo en el componente).
// ─────────────────────────────────────────────────────────────────────────────
function createStyles(T: import('@/constants/theme').ThemeTokens) {
  return StyleSheet.create({
    container:        { flex: 1, backgroundColor: T.surface },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: T.surface },
    topLine:          { position: 'absolute', top: 0, left: 0, right: 0, height: 2, opacity: 0.3, zIndex: 10 },

    header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
    headerLabel: { color: T.textSecondary, fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 3, marginBottom: 4 },
    greeting:    { color: T.textPrimary, fontSize: 24, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: -0.5 },
    logoutBtn:   { width: 38, height: 38, borderRadius: 10, backgroundColor: T.surfaceElevated, borderWidth: 1, borderColor: T.border, alignItems: 'center', justifyContent: 'center' },

    disciplinesPrompt:     { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 14 },
    disciplinesPromptIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    disciplinesPromptTitle: { color: T.attention, fontSize: 14, fontFamily: 'SpaceGrotesk_700Bold', marginBottom: 2 },
    disciplinesPromptBody:  { color: T.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular', lineHeight: 16 },

    statsStrip:  { flexDirection: 'row', backgroundColor: T.surfaceElevated, borderRadius: 10, borderWidth: 1, borderColor: T.border, overflow: 'hidden', marginBottom: 22 },
    statBlock:   { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
    statDivider: { width: 1, backgroundColor: T.border },
    statIconWrap:{ width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    statValue:   { color: T.textPrimary, fontSize: 18, fontFamily: 'SpaceGrotesk_600SemiBold' },
    statLabel:   { color: T.textSecondary, fontSize: 9, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1.5 },

    sectionTitle:     { color: T.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 2, marginBottom: 10 },
    sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 22 },
    sectionLink:      { color: T.action, fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1.5, marginBottom: 10 },

    ctaBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 10, gap: 10, marginBottom: 10, backgroundColor: T.action },
    ctaText: { color: T.actionFg, fontSize: 13, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1.5 },

    actionsRow:     { flexDirection: 'row', gap: 10 },
    actionCard:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: T.surfaceElevated, borderRadius: 10, borderWidth: 1, borderColor: T.border, paddingVertical: 14 },
    actionCardText: { color: T.textPrimary, fontSize: 11, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1 },

    emptyCard:  { alignItems: 'center', backgroundColor: T.surfaceElevated, borderRadius: 12, borderWidth: 1, borderColor: T.border, padding: 28, gap: 8 },
    emptyTitle: { color: T.textPrimary, fontSize: 14, fontFamily: 'SpaceGrotesk_700Bold' },
    emptyBody:  { color: T.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular', textAlign: 'center', lineHeight: 17 },

    studentList:       { backgroundColor: T.surfaceElevated, borderRadius: 12, borderWidth: 1, borderColor: T.border, overflow: 'hidden' },
    studentItem:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingRight: 14, paddingLeft: 18, gap: 12 },
    studentItemBorder: { borderTopWidth: 1, borderTopColor: T.border },
    studentAccent:     { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: T.action },
    avatar:            { width: 38, height: 38, borderRadius: 19 },
    avatarFallback:    { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
    avatarLetter:      { color: T.action, fontSize: 15, fontFamily: 'SpaceGrotesk_700Bold' },
    studentName:       { color: T.textPrimary, fontSize: 14, fontFamily: 'SpaceGrotesk_700Bold', marginBottom: 2 },
    studentMeta:       { color: T.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk_400Regular' },
  });
}

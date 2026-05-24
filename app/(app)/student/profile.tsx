import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Image,
  StyleSheet,
} from 'react-native';
import { useAlert } from '@/components/AppAlert';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/contexts/AuthContext';
import { getWeeklyStats, WeeklyStats } from '@/lib/services/todayService';
import { getUserSessions } from '@/lib/services/workoutService';
import { updateProfile, uploadAvatar } from '@/lib/services/profileService';
import { getStudentPendingInvitations } from '@/lib/services/invitationService';

// ─── Palette ──────────────────────────────────────────────────────────────────
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

export default function ProfileScreen() {
  const { profile, user, signOut, refreshProfile } = useAuth();
  const { showAlert } = useAlert();
  const [stats, setStats] = useState<WeeklyStats | null>(null);
  const [totalSessions, setTotalSessions] = useState(0);
  const [pendingInvitations, setPendingInvitations] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [user?.id])
  );

  const loadStats = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    const [statsResult, sessionsResult, invResult] = await Promise.all([
      getWeeklyStats(user.id),
      getUserSessions(user.id, 100),
      getStudentPendingInvitations(user.id),
    ]);
    setStats(statsResult.stats);
    setTotalSessions(sessionsResult.sessions.length);
    setPendingInvitations(invResult.invitations.length);
    setIsLoading(false);
  };

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed || !user?.id) return;
    setIsSavingName(true);
    const { error } = await updateProfile(user.id, { full_name: trimmed });
    if (error) {
      showAlert('Error', 'No se pudo guardar el nombre');
    } else {
      await refreshProfile();
      setIsEditingName(false);
    }
    setIsSavingName(false);
  };

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permiso requerido', 'Necesitamos acceso a tu galería para cambiar la foto.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setIsUploadingPhoto(true);
    const { url, error: uploadError } = await uploadAvatar(user!.id, asset.uri, asset.mimeType ?? 'image/jpeg');
    if (uploadError || !url) {
      showAlert('Error', uploadError?.message ?? 'No se pudo subir la imagen');
    } else {
      const { error: updateError } = await updateProfile(user!.id, { avatar_url: url });
      if (updateError) showAlert('Error', 'No se pudo guardar la foto');
      else await refreshProfile();
    }
    setIsUploadingPhoto(false);
  };

  const handleLogout = () => {
    showAlert('Cerrar sesión', '¿Estás seguro que querés salir?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir', style: 'destructive',
        onPress: async () => {
          const { error } = await signOut();
          if (error) {
            showAlert('Error', error.message);
            return;
          }
          router.replace('/login');
        },
      },
    ]);
  };

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Usuario';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <SafeAreaView style={s.safe}>
      <LinearGradient
        colors={['transparent', C.primary, 'transparent']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={s.topLine}
      />
      <ScrollView contentContainerStyle={s.scroll}>

        {/* ── Avatar + nombre ───────────────────────────────────────── */}
        <View style={s.heroCard}>
          <TouchableOpacity
            onPress={handlePickPhoto}
            disabled={isUploadingPhoto}
            style={s.avatarWrap}
            activeOpacity={0.85}
          >
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={s.avatar} />
            ) : (
              <LinearGradient
                colors={[C.primaryDim, '#002d3d']}
                style={s.avatarPlaceholder}
              >
                <Text style={s.avatarInitial}>{initial}</Text>
              </LinearGradient>
            )}
            <View style={s.cameraBtn}>
              {isUploadingPhoto
                ? <ActivityIndicator size="small" color={C.primary} />
                : <Ionicons name="camera" size={14} color={C.primary} />
              }
            </View>
          </TouchableOpacity>

          {isEditingName ? (
            <View style={s.editNameWrap}>
              <TextInput
                style={s.nameInput}
                value={nameInput}
                onChangeText={setNameInput}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleSaveName}
                placeholderTextColor={C.neutral}
              />
              <View style={s.editNameBtns}>
                <TouchableOpacity onPress={() => setIsEditingName(false)} style={s.cancelBtn}>
                  <Text style={s.cancelBtnText}>CANCELAR</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveName}
                  disabled={isSavingName || !nameInput.trim()}
                  style={s.saveBtn}
                >
                  {isSavingName
                    ? <ActivityIndicator size="small" color={C.primaryDim} />
                    : <Text style={s.saveBtnText}>GUARDAR</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => { setNameInput(displayName); setIsEditingName(true); }}
              style={s.nameRow}
              activeOpacity={0.8}
            >
              <Text style={s.displayName}>{displayName}</Text>
              <Ionicons name="pencil-outline" size={15} color={C.neutral} style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          )}

          <Text style={s.emailText}>{user?.email}</Text>
        </View>

        {/* ── Stats ─────────────────────────────────────────────────── */}
        {isLoading ? (
          <View style={{ paddingVertical: 16, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={C.primary} />
          </View>
        ) : (
          <View style={s.statsRow}>
            <View style={s.statItem}>
              <Text style={s.statValue}>{totalSessions}</Text>
              <Text style={s.statLabel}>SESIONES</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Text style={s.statValue}>{stats?.workoutsCompleted ?? 0}</Text>
              <Text style={s.statLabel}>ESTA SEM.</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statItem}>
              <Text style={[s.statValue, { color: C.tertiary }]}>{stats?.streak ?? 0}</Text>
              <Text style={s.statLabel}>RACHA</Text>
            </View>
          </View>
        )}

        {/* ── Menú ─────────────────────────────────────────────────── */}
        <Text style={s.sectionTitle}>OPCIONES</Text>
        <View style={s.menuCard}>
          <MenuItem
            icon="mail-outline"
            label="INVITACIONES"
            onPress={() => router.push('/student/invitations' as any)}
            badge={pendingInvitations > 0 ? pendingInvitations : undefined}
            badgeColor={C.tertiary}
          />
          <View style={s.menuDivider} />
          <MenuItem
            icon="notifications-outline"
            label="RECORDATORIOS"
            onPress={() => router.push('/student/notifications' as any)}
          />
        </View>

        {/* ── Logout ───────────────────────────────────────────────── */}
        <TouchableOpacity onPress={handleLogout} activeOpacity={0.85} style={s.logoutBtn}>
          <View style={s.logoutIcon}>
            <Ionicons name="log-out-outline" size={20} color="#f87171" />
          </View>
          <Text style={s.logoutText}>CERRAR SESIÓN</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── MenuItem ────────────────────────────────────────────────────────────────

function MenuItem({ icon, label, onPress, badge, badgeColor }: {
  icon: string; label: string; onPress: () => void;
  badge?: number; badgeColor?: string;
}) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={s.menuRow}>
      <View style={s.menuIcon}>
        <Ionicons name={icon as any} size={20} color={C.primary} />
      </View>
      <Text style={s.menuLabel}>{label}</Text>
      {badge !== undefined && (
        <View style={[s.menuBadge, { backgroundColor: badgeColor ?? C.primary }]}>
          <Text style={s.menuBadgeText}>{badge}</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={16} color={C.border} style={{ marginLeft: 6 }} />
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe:     { flex: 1, backgroundColor: C.bg },
  topLine:  { position: 'absolute', top: 0, left: 0, right: 0, height: 2, opacity: 0.4, zIndex: 10 },
  scroll:   { padding: 20, paddingBottom: 48 },

  sectionTitle: { color: C.neutral, fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 3, marginBottom: 12 },

  // Hero card
  heroCard:         { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 28, alignItems: 'center', marginBottom: 12 },
  avatarWrap:       { marginBottom: 16, position: 'relative' },
  avatar:           { width: 88, height: 88, borderRadius: 44, borderWidth: 2, borderColor: C.primary },
  avatarPlaceholder:{ width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.primary },
  avatarInitial:    { color: C.primary, fontSize: 36, fontFamily: 'SpaceGrotesk_700Bold' },
  cameraBtn:        { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  nameRow:          { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  displayName:      { color: C.textHi, fontSize: 20, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: -0.3 },
  emailText:        { color: C.neutral, fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular' },

  // Edit name
  editNameWrap: { width: '100%', marginBottom: 8 },
  nameInput:    { backgroundColor: C.cardDeep, borderWidth: 1, borderColor: C.primary, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, color: C.textHi, fontSize: 16, fontFamily: 'SpaceGrotesk_600SemiBold', textAlign: 'center', marginBottom: 12 },
  editNameBtns: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  cancelBtn:    { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: C.border },
  cancelBtnText:{ color: C.neutral, fontSize: 11, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1 },
  saveBtn:      { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 8, backgroundColor: C.primary },
  saveBtnText:  { color: C.primaryDim, fontSize: 11, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1 },

  // Stats
  statsRow:    { flexDirection: 'row', backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, marginBottom: 24, overflow: 'hidden' },
  statItem:    { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statDivider: { width: 1, backgroundColor: C.border },
  statValue:   { color: C.textHi, fontSize: 24, fontFamily: 'SpaceGrotesk_700Bold', marginBottom: 3 },
  statLabel:   { color: C.textLo, fontSize: 9, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 2 },

  // Menu
  menuCard:     { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, overflow: 'hidden', marginBottom: 24 },
  menuDivider:  { height: 1, backgroundColor: C.border },
  menuRow:      { flexDirection: 'row', alignItems: 'center', padding: 14 },
  menuIcon:     { width: 38, height: 38, borderRadius: 8, backgroundColor: C.primaryDim, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  menuLabel:    { flex: 1, color: C.textHi, fontSize: 12, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1 },
  menuBadge:    { minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  menuBadgeText:{ color: '#7a5500', fontSize: 11, fontFamily: 'SpaceGrotesk_700Bold' },

  // Logout
  logoutBtn:  { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: '#3d1515', padding: 14 },
  logoutIcon: { width: 38, height: 38, borderRadius: 8, backgroundColor: '#1a0808', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  logoutText: { color: '#f87171', fontSize: 12, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1 },
});

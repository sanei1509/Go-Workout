import { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeMode, ThemeTokens } from '@/constants/theme';
import { useAlert } from '@/components/AppAlert';
import { updateProfile, uploadAvatar } from '@/lib/services/profileService';
import { DISCIPLINES, MAX_TRAINER_DISCIPLINES } from '@/lib/constants/disciplines';

export default function TrainerProfileScreen() {
  const { profile, user, signOut, refreshProfile } = useAuth();
  const { showAlert } = useAlert();
  const { T, activeTheme, themeMode, setThemeMode } = useTheme();
  const actionDimBg = activeTheme === 'dark' ? '#00566a' : '#e0f7fa';
  const actionGradient = activeTheme === 'dark'
    ? ['#00566a', '#003d4d'] as const
    : [T.border, T.surfaceElevated] as const;
  const avatarGradient = activeTheme === 'dark'
    ? ['#00566a', '#002d3d'] as const
    : [T.border, T.surfaceElevated] as const;
  const s = useMemo(() => createStyles(T, actionDimBg), [T, actionDimBg]);

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const [selectedDisciplines, setSelectedDisciplines] = useState<string[]>(
    profile?.disciplines ?? []
  );
  const [isSavingDisciplines, setIsSavingDisciplines] = useState(false);

  const savedDisciplines = profile?.disciplines ?? [];
  const disciplinesDirty =
    selectedDisciplines.length !== savedDisciplines.length ||
    selectedDisciplines.some((d) => !savedDisciplines.includes(d));

  const toggleDiscipline = (d: string) => {
    setSelectedDisciplines((prev) => {
      if (prev.includes(d)) return prev.filter((x) => x !== d);
      if (prev.length >= MAX_TRAINER_DISCIPLINES) {
        showAlert(
          'Máximo alcanzado',
          `Podés elegir hasta ${MAX_TRAINER_DISCIPLINES} disciplinas.`
        );
        return prev;
      }
      return [...prev, d];
    });
  };

  const handleSaveDisciplines = async () => {
    if (!user?.id || selectedDisciplines.length === 0) return;
    setIsSavingDisciplines(true);
    const { error } = await updateProfile(user.id, { disciplines: selectedDisciplines });
    setIsSavingDisciplines(false);
    if (error) {
      showAlert('Error', error.message);
      return;
    }
    await refreshProfile();
  };

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!user?.id || !trimmed) return;
    setIsSavingName(true);
    const { error } = await updateProfile(user.id, { full_name: trimmed });
    setIsSavingName(false);
    if (error) showAlert('Error', error.message);
    else {
      await refreshProfile();
      setIsEditingName(false);
    }
  };

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permiso requerido', 'Necesitamos acceso a tus fotos para cambiar el avatar.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    setIsUploadingPhoto(true);
    const { url, error: uploadError } = await uploadAvatar(user!.id, asset.uri, asset.mimeType ?? 'image/jpeg');
    if (uploadError || !url) {
      showAlert('Error', uploadError?.message ?? 'No se pudo subir la foto');
    } else {
      const { error: updateError } = await updateProfile(user!.id, { avatar_url: url });
      if (updateError) showAlert('Error', updateError.message);
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

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Entrenador';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <SafeAreaView style={s.safe}>
      <LinearGradient
        colors={['transparent', T.action, 'transparent']}
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
                colors={avatarGradient}
                style={s.avatarPlaceholder}
              >
                <Text style={s.avatarInitial}>{initial}</Text>
              </LinearGradient>
            )}
            <View style={s.cameraBtn}>
              {isUploadingPhoto
                ? <ActivityIndicator size="small" color={T.action} />
                : <Ionicons name="camera" size={14} color={T.action} />
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
                placeholderTextColor={T.textSecondary}
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
                    ? <ActivityIndicator size="small" color={actionDimBg} />
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
              <Ionicons name="pencil-outline" size={15} color={T.textSecondary} style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          )}

          <Text style={s.emailText}>{user?.email}</Text>
          <View style={s.roleBadge}>
            <Ionicons name="barbell-outline" size={11} color={T.action} />
            <Text style={s.roleBadgeText}>ENTRENADOR</Text>
          </View>
        </View>

        {/* ── Tema ─────────────────────────────────────────────────── */}
        <Text style={s.sectionTitle}>APARIENCIA</Text>
        <View style={s.themeRow}>
          {(['auto', 'light', 'dark'] as ThemeMode[]).map((mode) => {
            const active = themeMode === mode;
            const label = mode === 'auto' ? 'AUTO' : mode === 'light' ? 'CLARO' : 'OSCURO';
            return (
              <TouchableOpacity
                key={mode}
                onPress={() => setThemeMode(mode)}
                activeOpacity={0.85}
                style={[s.themeChip, active && s.themeChipActive]}
              >
                <Text style={[s.themeChipText, active && s.themeChipTextActive]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Disciplinas ───────────────────────────────────────────── */}
        <Text style={s.sectionTitle}>MIS DISCIPLINAS</Text>
        <View style={s.disciplinesCard}>
          <Text style={s.disciplinesHint}>
            Elegí hasta {MAX_TRAINER_DISCIPLINES}. Acotan los ejercicios y planes que armás para tus alumnos.
          </Text>
          <View style={s.chipsWrap}>
            {DISCIPLINES.map((d) => {
              const active = selectedDisciplines.includes(d);
              return (
                <TouchableOpacity
                  key={d}
                  style={[s.chip, active && s.chipActive]}
                  onPress={() => toggleDiscipline(d)}
                  activeOpacity={0.8}
                >
                  {active && <Ionicons name="checkmark" size={12} color={T.action} />}
                  <Text style={[s.chipText, active && s.chipTextActive]}>{d}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {disciplinesDirty && (
            <TouchableOpacity
              onPress={handleSaveDisciplines}
              disabled={isSavingDisciplines || selectedDisciplines.length === 0}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={actionGradient}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={[s.saveDisciplinesBtn, selectedDisciplines.length === 0 && { opacity: 0.5 }]}
              >
                {isSavingDisciplines
                  ? <ActivityIndicator size="small" color={T.action} />
                  : (
                    <Text style={s.saveDisciplinesText}>
                      {selectedDisciplines.length === 0 ? 'ELEGÍ AL MENOS UNA' : 'GUARDAR DISCIPLINAS'}
                    </Text>
                  )
                }
              </LinearGradient>
            </TouchableOpacity>
          )}
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

// ─── Styles ───────────────────────────────────────────────────────────────────

function createStyles(T: ThemeTokens, actionDimBg: string) {
  return StyleSheet.create({
    safe:     { flex: 1, backgroundColor: T.surface },
    topLine:  { position: 'absolute', top: 0, left: 0, right: 0, height: 2, opacity: 0.4, zIndex: 10 },
    scroll:   { padding: 20, paddingBottom: 48 },

    sectionTitle: { color: T.textSecondary, fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 3, marginBottom: 12 },

    // Hero card
    heroCard:         { backgroundColor: T.surfaceElevated, borderRadius: 16, borderWidth: 1, borderColor: T.border, padding: 28, alignItems: 'center', marginBottom: 24 },
    avatarWrap:       { marginBottom: 16, position: 'relative' },
    avatar:           { width: 88, height: 88, borderRadius: 44, borderWidth: 2, borderColor: T.action },
    avatarPlaceholder:{ width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: T.action },
    avatarInitial:    { color: T.action, fontSize: 36, fontFamily: 'SpaceGrotesk_700Bold' },
    cameraBtn:        { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: T.surface, borderWidth: 1.5, borderColor: T.action, alignItems: 'center', justifyContent: 'center' },
    nameRow:          { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    displayName:      { color: T.textPrimary, fontSize: 20, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: -0.3 },
    emailText:        { color: T.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular' },
    roleBadge:        { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: actionDimBg },
    roleBadgeText:    { color: T.action, fontSize: 9, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 2 },

    // Edit name
    editNameWrap: { width: '100%', marginBottom: 8 },
    nameInput:    { backgroundColor: T.border, borderWidth: 1, borderColor: T.action, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, color: T.textPrimary, fontSize: 16, fontFamily: 'SpaceGrotesk_600SemiBold', textAlign: 'center', marginBottom: 12 },
    editNameBtns: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
    cancelBtn:    { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: T.border },
    cancelBtnText:{ color: T.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1 },
    saveBtn:      { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 8, backgroundColor: T.action },
    saveBtnText:  { color: actionDimBg, fontSize: 11, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1 },

    // Theme picker
    themeRow:            { flexDirection: 'row', gap: 8, marginBottom: 24 },
    themeChip:           { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: T.border, backgroundColor: T.surfaceElevated },
    themeChipActive:     { borderColor: T.action, backgroundColor: actionDimBg },
    themeChipText:       { color: T.textSecondary, fontSize: 10, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1.5 },
    themeChipTextActive: { color: T.action },

    // Disciplinas
    disciplinesCard: { backgroundColor: T.surfaceElevated, borderRadius: 12, borderWidth: 1, borderColor: T.border, padding: 16, marginBottom: 24 },
    disciplinesHint: { color: T.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk_400Regular', lineHeight: 17, marginBottom: 14 },
    chipsWrap:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip:            { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 8, backgroundColor: T.border, borderWidth: 1, borderColor: T.border },
    chipActive:      { backgroundColor: actionDimBg, borderColor: T.action },
    chipText:        { color: T.textSecondary, fontSize: 12, fontFamily: 'SpaceGrotesk_600SemiBold' },
    chipTextActive:  { color: T.action },
    saveDisciplinesBtn:  { alignItems: 'center', justifyContent: 'center', paddingVertical: 13, borderRadius: 10, marginTop: 16 },
    saveDisciplinesText: { color: T.action, fontSize: 12, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1.5 },

    // Logout
    logoutBtn:  { flexDirection: 'row', alignItems: 'center', backgroundColor: T.surfaceElevated, borderRadius: 12, borderWidth: 1, borderColor: '#3d1515', padding: 14 },
    logoutIcon: { width: 38, height: 38, borderRadius: 8, backgroundColor: '#1a0808', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
    logoutText: { color: '#f87171', fontSize: 12, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1 },
  });
}

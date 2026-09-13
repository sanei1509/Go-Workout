import { useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, Image, StyleSheet, ScrollView,
} from 'react-native';
import { useAlert } from '@/components/AppAlert';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeTokens } from '@/constants/theme';
import { Role } from '@/lib/services/profileService';

export default function OnboardingScreen() {
  const { setRole } = useAuth();
  const { showAlert } = useAlert();
  const { T, activeTheme } = useTheme();
  const s = useMemo(() => createStyles(T), [T]);

  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  const handleSelectRole = async (role: Role) => {
    setSelectedRole(role);
    setIsLoading(true);
    try {
      const { error } = await setRole(role);
      if (error) {
        showAlert('Error', error.message);
        setSelectedRole(null);
      } else {
        router.replace(role === 'TRAINER' ? '/(app)/trainer' : '/(app)/student');
      }
    } catch {
      showAlert('Error', 'Ocurrió un problema al configurar tu perfil');
      setSelectedRole(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Gradientes de card según tema y estado de selección
  const cardGradient = (role: Role) => {
    const isSelected = selectedRole === role;
    if (activeTheme === 'dark') {
      return isSelected
        ? ['#003d4d', '#00566a'] as const
        : ['#1a2123', '#141c1f'] as const;
    } else {
      return isSelected
        ? ['#e8f4f7', '#dceef3'] as const
        : ['#FFFFFF', '#F3F1EC'] as const;
    }
  };

  return (
    <View style={s.container}>
      <LinearGradient
        colors={['transparent', activeTheme === 'dark' ? '#00D1FF40' : '#D8D3CA', 'transparent']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={s.topLine}
      />

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={s.inner}>
          <View style={s.header}>
            <Image
              source={require('../assets/images/Logo_workout.png')}
              style={s.logo} resizeMode="contain"
            />
          </View>

          <View style={s.titleBlock}>
            <Text style={s.title}>YOUR ROLE</Text>
            <Text style={s.subtitle}>¿Cómo vas a usar GO Workout?</Text>
          </View>

          <View style={s.cards}>
            {(['TRAINER', 'STUDENT'] as Role[]).map((role) => {
              const isSelected = selectedRole === role;
              return (
                <TouchableOpacity
                  key={role}
                  onPress={() => handleSelectRole(role)}
                  disabled={isLoading}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={cardGradient(role)}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={[
                      s.card,
                      isSelected && s.cardSelected,
                      isLoading && s.cardDisabled,
                    ]}
                  >
                    {isSelected && <View style={s.cardAccentLine} />}
                    <Image
                      source={
                        role === 'TRAINER'
                          ? require('../assets/images/icon_entrenador.png')
                          : require('../assets/images/icon_alumno.png')
                      }
                      style={s.iconImage} resizeMode="contain"
                    />
                    <Text style={[s.cardTitle, isSelected && s.cardTitleSelected]}>
                      {role === 'TRAINER' ? 'ENTRENADOR' : 'ALUMNO'}
                    </Text>
                    <Text style={s.cardDesc}>
                      {role === 'TRAINER'
                        ? 'Creá y asigná rutinas a tus alumnos'
                        : 'Seguí las rutinas de tu entrenador'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </View>

          {isLoading && (
            <Text style={s.loadingText}>Configurando tu perfil...</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function createStyles(T: ThemeTokens) {
  return StyleSheet.create({
    container:        { flex: 1, backgroundColor: T.surface },
    topLine:          { position: 'absolute', top: 0, left: 0, right: 0, height: 2, zIndex: 10 },
    scrollContent:    { flexGrow: 1, justifyContent: 'center' },
    inner:            { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
    header:           { alignItems: 'center', marginBottom: 8 },
    logo:             { width: '100%', height: 200, opacity: 0.35 },
    titleBlock:       { marginBottom: 36 },
    title:            { color: T.textPrimary, fontSize: 36, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: -1, lineHeight: 40, marginBottom: 8 },
    subtitle:         { color: T.textSecondary, fontSize: 17, fontFamily: 'SpaceGrotesk_400Regular', letterSpacing: 0.5 },
    cards:            { gap: 16 },
    card: {
      borderWidth: 2, borderColor: T.border, borderRadius: 12,
      paddingHorizontal: 28, paddingVertical: 22,
      alignItems: 'center', overflow: 'hidden',
    },
    cardSelected:     { borderColor: T.action },
    cardDisabled:     { opacity: 0.5 },
    cardAccentLine: {
      position: 'absolute', left: 0, top: 0, bottom: 0,
      width: 4, backgroundColor: T.action,
      borderTopLeftRadius: 10, borderBottomLeftRadius: 10,
    },
    iconImage:        { width: 80, height: 80, marginBottom: 12 },
    cardTitle:        { color: T.textSecondary, fontSize: 22, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 4, marginBottom: 8, textAlign: 'center' },
    cardTitleSelected:{ color: T.action },
    cardDesc:         { color: T.textSecondary, fontSize: 14, fontFamily: 'SpaceGrotesk_400Regular', lineHeight: 20, textAlign: 'center' },
    loadingText:      { color: T.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular', textAlign: 'center', marginTop: 24, letterSpacing: 1 },
  });
}

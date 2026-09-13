import { useState, useMemo } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView,
  Platform, Image, StyleSheet, ScrollView,
} from 'react-native';
import { useAlert } from '@/components/AppAlert';
import { Link, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeTokens } from '@/constants/theme';

export default function RegistroScreen() {
  const { signUp } = useAuth();
  const { showAlert } = useAlert();
  const { T, activeTheme } = useTheme();
  const s = useMemo(() => createStyles(T), [T]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword) {
      showAlert('Error', 'Por favor completa todos los campos');
      return;
    }
    if (password !== confirmPassword) {
      showAlert('Error', 'Las contraseñas no coinciden');
      return;
    }
    if (password.length < 6) {
      showAlert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setIsLoading(true);
    const { error } = await signUp(email, password);
    setIsLoading(false);
    if (error) {
      showAlert('Error', error.message);
    } else {
      router.replace('/onboarding');
    }
  };

  const ctaBg = activeTheme === 'dark'
    ? ['#00566a', '#003d4d'] as const
    : [T.textPrimary, T.textPrimary] as const;
  const ctaTextColor = activeTheme === 'dark' ? T.action : T.surface;
  const ctaLoadingBg = activeTheme === 'dark' ? '#003040' : '#2a3a40';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={s.container}
    >
      <LinearGradient
        colors={['transparent', activeTheme === 'dark' ? '#00D1FF40' : '#D8D3CA', 'transparent']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={s.topLine}
      />

      <ScrollView
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={s.inner}>
          <View style={s.header}>
            <Image
              source={require('../assets/images/Logo_workout.png')}
              style={s.logo} resizeMode="contain"
            />
          </View>

          <View style={s.titleBlock}>
            <Text style={s.title}>JOIN THE TEAM</Text>
            <Text style={s.subtitle}>Creá tu cuenta y empezá hoy</Text>
          </View>

          <View style={s.form}>
            <View style={s.inputGroup}>
              <Text style={s.label}>EMAIL ADDRESS</Text>
              <TextInput
                style={[s.input, { color: T.textPrimary }, emailFocused && s.inputFocused]}
                placeholder="ATHLETE@GOWORKOUT.COM"
                placeholderTextColor={T.textSecondary}
                value={email} onChangeText={setEmail}
                onFocus={() => setEmailFocused(true)} onBlur={() => setEmailFocused(false)}
                autoCapitalize="none" keyboardType="email-address"
                autoComplete="email" keyboardAppearance={activeTheme}
              />
            </View>

            <View style={[s.inputGroup, { marginTop: 24 }]}>
              <Text style={s.label}>PASSWORD</Text>
              <TextInput
                style={[s.input, { color: T.textPrimary }, passwordFocused && s.inputFocused]}
                placeholder="••••••••" placeholderTextColor={T.textSecondary}
                value={password} onChangeText={setPassword}
                onFocus={() => setPasswordFocused(true)} onBlur={() => setPasswordFocused(false)}
                secureTextEntry autoComplete="password-new" keyboardAppearance={activeTheme}
              />
            </View>

            <View style={[s.inputGroup, { marginTop: 24 }]}>
              <Text style={s.label}>CONFIRM PASSWORD</Text>
              <TextInput
                style={[s.input, { color: T.textPrimary }, confirmFocused && s.inputFocused]}
                placeholder="••••••••" placeholderTextColor={T.textSecondary}
                value={confirmPassword} onChangeText={setConfirmPassword}
                onFocus={() => setConfirmFocused(true)} onBlur={() => setConfirmFocused(false)}
                secureTextEntry autoComplete="password-new" keyboardAppearance={activeTheme}
              />
            </View>

            <TouchableOpacity onPress={handleRegister} disabled={isLoading} activeOpacity={0.85}>
              {isLoading ? (
                <View style={[s.button, { backgroundColor: ctaLoadingBg }]}>
                  <Text style={[s.buttonText, { color: T.textSecondary }]}>CREATING...</Text>
                </View>
              ) : (
                <LinearGradient colors={ctaBg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.button}>
                  <Text style={[s.buttonText, { color: ctaTextColor }]}>CREATE ACCOUNT</Text>
                </LinearGradient>
              )}
            </TouchableOpacity>
          </View>

          <View style={s.footer}>
            <Text style={s.footerText}>¿Ya tenés cuenta?</Text>
            <Link href="/login" asChild>
              <TouchableOpacity>
                <Text style={s.footerLink}>Sign In</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(T: ThemeTokens) {
  return StyleSheet.create({
    container:     { flex: 1, backgroundColor: T.surface },
    topLine:       { position: 'absolute', top: 0, left: 0, right: 0, height: 2, zIndex: 10 },
    scrollContent: { flexGrow: 1, justifyContent: 'center' },
    inner:         { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
    header:        { alignItems: 'center', marginBottom: 8 },
    logo:          { width: '100%', height: 200, opacity: 0.35 },
    titleBlock:    { marginBottom: 36 },
    title:         { color: T.textPrimary, fontSize: 36, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: -1, lineHeight: 40, marginBottom: 8 },
    subtitle:      { color: T.textSecondary, fontSize: 17, fontFamily: 'SpaceGrotesk_400Regular', letterSpacing: 0.5 },
    form:          { marginBottom: 28 },
    inputGroup:    {},
    label:         { color: T.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 4, textTransform: 'uppercase', marginBottom: 8 },
    input:         { borderBottomWidth: 2, borderBottomColor: T.border, fontSize: 18, fontFamily: 'SpaceGrotesk_600SemiBold', paddingVertical: 8, paddingHorizontal: 0, backgroundColor: 'transparent' },
    inputFocused:  { borderBottomColor: T.action },
    button:        { paddingVertical: 20, borderRadius: 4, alignItems: 'center', marginTop: 32 },
    buttonText:    { fontSize: 18, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 2, textTransform: 'uppercase' },
    footer:        { flexDirection: 'row', alignItems: 'center', gap: 8 },
    footerText:    { color: T.textSecondary, fontSize: 13, fontFamily: 'SpaceGrotesk_400Regular' },
    footerLink:    { color: T.action, fontSize: 13, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 1 },
  });
}

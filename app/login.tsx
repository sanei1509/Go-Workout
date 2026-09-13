import { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useAlert } from '@/components/AppAlert';
import { Link, Redirect, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeTokens } from '@/constants/theme';
import { Svg, Path, G } from 'react-native-svg';

export default function LoginScreen() {
  const { session, isLoading: authLoading, signIn, signInWithGoogle } = useAuth();
  const { showAlert } = useAlert();
  const { T, activeTheme } = useTheme();
  const s = useMemo(() => createStyles(T), [T]);
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      showAlert('Error', 'Por favor completa todos los campos');
      return;
    }
    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);
    if (error) {
      showAlert('Error', error.message);
    } else {
      router.replace('/');
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    const { error } = await signInWithGoogle();
    setIsGoogleLoading(false);
    if (error) {
      showAlert('Error', error.message);
    } else {
      router.replace('/');
    }
  };

  if (authLoading) return null;
  if (session) return <Redirect href="/" />;

  // Colores derivados del tema (no son tokens directos pero dependen del tema)
  const ctaBg = activeTheme === 'dark'
    ? ['#00566a', '#003d4d'] as const
    : [T.textPrimary, T.textPrimary] as const;
  const ctaTextColor = activeTheme === 'dark' ? T.action : T.surface;
  const ctaLoadingBg = activeTheme === 'dark' ? '#003040' : '#2a3a40';
  const inputTextColor = T.textPrimary;
  const taglineColor = activeTheme === 'dark' ? T.action : T.textSecondary;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={s.container}
    >
      {/* Línea de acento superior — sutil en ambos temas */}
      <LinearGradient
        colors={['transparent', activeTheme === 'dark' ? '#00D1FF40' : '#D8D3CA', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={s.topLine}
      />

      <ScrollView
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[s.inner, { paddingBottom: Math.max(40, insets.bottom + 24) }]}>

          {/* ── Brand Header ── */}
          <View style={s.header}>
            <Image
              source={require('../assets/images/Logo_workout.png')}
              style={s.logo}
              resizeMode="contain"
            />
            <Text style={[s.tagline, { color: taglineColor }]}>JUST START</Text>
          </View>

          {/* ── Form ── */}
          <View style={s.form}>
            <View style={s.inputGroup}>
              <Text style={s.label}>EMAIL ADDRESS</Text>
              <TextInput
                style={[
                  s.input,
                  { color: inputTextColor },
                  emailFocused && s.inputFocused,
                ]}
                placeholder="ATHLETE@GOWORKOUT.COM"
                placeholderTextColor={T.textSecondary}
                value={email}
                onChangeText={setEmail}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                keyboardAppearance={activeTheme}
              />
            </View>

            <View style={[s.inputGroup, { marginTop: 24 }]}>
              <Text style={s.label}>PASSWORD</Text>
              <TextInput
                style={[
                  s.input,
                  { color: inputTextColor },
                  passwordFocused && s.inputFocused,
                ]}
                placeholder="••••••••"
                placeholderTextColor={T.textSecondary}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                secureTextEntry
                autoComplete="password"
                keyboardAppearance={activeTheme}
              />
            </View>

            <TouchableOpacity
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <View style={[s.button, { backgroundColor: ctaLoadingBg }]}>
                  <Text style={[s.buttonText, { color: T.textSecondary }]}>STARTING...</Text>
                </View>
              ) : (
                <LinearGradient
                  colors={ctaBg}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={s.button}
                >
                  <Text style={[s.buttonText, { color: ctaTextColor }]}>START</Text>
                </LinearGradient>
              )}
            </TouchableOpacity>
          </View>

          {/* ── Divider ── */}
          <View style={s.dividerRow}>
            <View style={s.dividerLine} />
            <Text style={s.dividerText}>OR</Text>
            <View style={s.dividerLine} />
          </View>

          {/* ── Google ── */}
          <TouchableOpacity
            onPress={handleGoogleLogin}
            disabled={isGoogleLoading}
            activeOpacity={0.85}
            style={s.googleButton}
          >
            {!isGoogleLoading && (
              <Svg width={20} height={20} viewBox="0 0 48 48">
                <G>
                  <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  <Path fill="none" d="M0 0h48v48H0z" />
                </G>
              </Svg>
            )}
            <Text style={s.googleButtonText}>
              {isGoogleLoading ? 'CONECTANDO...' : 'CONTINUAR CON GOOGLE'}
            </Text>
          </TouchableOpacity>

          {/* ── Footer links ── */}
          <View style={s.footer}>
            <TouchableOpacity>
              <Text style={s.footerLink}>Forgot Password?</Text>
            </TouchableOpacity>
            <Link href="/registro" asChild>
              <TouchableOpacity>
                <Text style={s.footerLinkAction}>Join the Team</Text>
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
    inner:         { paddingHorizontal: 24, paddingTop: 60 },

    header:  { alignItems: 'center', marginBottom: 32 },
    logo:    { width: '100%', height: 200, marginBottom: 0 },
    tagline: {
      fontSize: 13, fontFamily: 'SpaceGrotesk_700Bold',
      letterSpacing: 10, textTransform: 'uppercase', marginTop: -8,
    },

    form:       { marginBottom: 24 },
    inputGroup: {},
    label: {
      color: T.textSecondary, fontSize: 11,
      fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 4,
      textTransform: 'uppercase', marginBottom: 8,
    },
    input: {
      borderBottomWidth: 2, borderBottomColor: T.border,
      fontSize: 18, fontFamily: 'SpaceGrotesk_600SemiBold',
      paddingVertical: 8, paddingHorizontal: 0,
      backgroundColor: 'transparent',
    },
    inputFocused: { borderBottomColor: T.action },

    button: {
      paddingVertical: 20, borderRadius: 4,
      alignItems: 'center', marginTop: 32,
    },
    buttonText: {
      fontSize: 20, fontFamily: 'SpaceGrotesk_700Bold',
      letterSpacing: 2, textTransform: 'uppercase',
    },

    dividerRow:  { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
    dividerLine: { flex: 1, height: 1, backgroundColor: T.border },
    dividerText: {
      color: T.textSecondary, fontSize: 11,
      fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 3, marginHorizontal: 12,
    },

    googleButton: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderColor: T.border, borderRadius: 4,
      paddingVertical: 16, gap: 12, marginBottom: 8,
    },
    googleButtonText: {
      color: T.textPrimary, fontSize: 13,
      fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 2,
    },

    footer:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16 },
    footerLink:      { color: T.textSecondary, fontSize: 11, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 3, textTransform: 'uppercase' },
    footerLinkAction:{ color: T.action, fontSize: 11, fontFamily: 'SpaceGrotesk_700Bold', letterSpacing: 3, textTransform: 'uppercase' },
  });
}

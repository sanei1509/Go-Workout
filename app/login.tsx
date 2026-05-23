import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Link, Redirect, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { Svg, Path, G } from 'react-native-svg';

export default function LoginScreen() {
  const { session, isLoading: authLoading, signIn, signInWithGoogle } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }
    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      router.replace('/');
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    const { error } = await signInWithGoogle();
    setIsGoogleLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      router.replace('/');
    }
  };

  if (authLoading) {
    return null;
  }

  if (session) {
    return <Redirect href="/" />;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* Top accent line */}
      <LinearGradient
        colors={['transparent', '#00d1ff', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.topLine}
      />

<ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.inner, { paddingBottom: Math.max(40, insets.bottom + 24) }]}>
          {/* Brand Header */}
          <View style={styles.header}>
            <Image
              source={require('../assets/images/Logo_workout.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.tagline}>JUST START</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>EMAIL ADDRESS</Text>
              <TextInput
                style={[styles.input, emailFocused && styles.inputFocused]}
                placeholder="ATHLETE@GOWORKOUT.COM"
                placeholderTextColor="#859399"
                value={email}
                onChangeText={setEmail}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                keyboardAppearance="dark"
              />
            </View>

            <View style={[styles.inputGroup, { marginTop: 24 }]}>
              <Text style={styles.label}>PASSWORD</Text>
              <TextInput
                style={[styles.input, passwordFocused && styles.inputFocused]}
                placeholder="••••••••"
                placeholderTextColor="#859399"
                value={password}
                onChangeText={setPassword}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                secureTextEntry
                autoComplete="password"
                keyboardAppearance="dark"
              />
            </View>

            <TouchableOpacity
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              <View style={[styles.button, isLoading && styles.buttonLoading]}>
                <Text style={styles.buttonText}>
                  {isLoading ? 'STARTING...' : 'START'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Button */}
          <TouchableOpacity
            onPress={handleGoogleLogin}
            disabled={isGoogleLoading}
            activeOpacity={0.85}
            style={styles.googleButton}
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
            <Text style={styles.googleButtonText}>
              {isGoogleLoading ? 'CONECTANDO...' : 'CONTINUAR CON GOOGLE'}
            </Text>
          </TouchableOpacity>

          {/* Footer links */}
          <View style={styles.footer}>
            <TouchableOpacity>
              <Text style={styles.footerLink}>Forgot Password?</Text>
            </TouchableOpacity>
            <Link href="/registro" asChild>
              <TouchableOpacity>
                <Text style={styles.footerLinkCyan}>Join the Team</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090f12',
  },
  topLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    opacity: 0.4,
    zIndex: 10,
  },
scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  inner: {
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: '100%',
    height: 200,
    marginBottom: 0,
  },
  tagline: {
    color: '#4cd6ff',
    fontSize: 13,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 10,
    textTransform: 'uppercase',
    marginTop: -8,
  },
  form: {
    marginBottom: 24,
  },
  inputGroup: {},
  label: {
    color: '#859399',
    fontSize: 11,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 4,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  input: {
    borderBottomWidth: 2,
    borderBottomColor: '#3c494e',
    color: '#a4e6ff',
    fontSize: 18,
    fontFamily: 'SpaceGrotesk_600SemiBold',
    paddingVertical: 8,
    paddingHorizontal: 0,
    backgroundColor: 'transparent',
  },
  inputFocused: {
    borderBottomColor: '#00d1ff',
  },
  button: {
    backgroundColor: '#00d1ff',
    paddingVertical: 20,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 32,
    shadowColor: '#00d1ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  buttonLoading: {
    backgroundColor: '#006070',
  },
  buttonText: {
    color: '#00566a',
    fontSize: 20,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#3c494e',
  },
  dividerText: {
    color: '#859399',
    fontSize: 11,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 3,
    marginHorizontal: 12,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3c494e',
    borderRadius: 4,
    paddingVertical: 16,
    gap: 12,
    marginBottom: 8,
  },
  googleButtonText: {
    color: '#c8d8de',
    fontSize: 13,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
  },
  footerLink: {
    color: '#859399',
    fontSize: 11,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  footerLinkCyan: {
    color: '#4cd6ff',
    fontSize: 11,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
});

import { useState } from 'react';
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
import { Link, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';

export default function RegistroScreen() {
  const { signUp } = useAuth();
  const { showAlert } = useAlert();
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
        <View style={styles.inner}>
          {/* Logo */}
          <View style={styles.header}>
            <Image
              source={require('../assets/images/Logo_workout.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          {/* Title */}
          <View style={styles.titleBlock}>
            <Text style={styles.title}>JOIN THE TEAM</Text>
            <Text style={styles.subtitle}>Creá tu cuenta y empezá hoy</Text>
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
                autoComplete="password-new"
                keyboardAppearance="dark"
              />
            </View>

            <View style={[styles.inputGroup, { marginTop: 24 }]}>
              <Text style={styles.label}>CONFIRM PASSWORD</Text>
              <TextInput
                style={[styles.input, confirmFocused && styles.inputFocused]}
                placeholder="••••••••"
                placeholderTextColor="#859399"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                onFocus={() => setConfirmFocused(true)}
                onBlur={() => setConfirmFocused(false)}
                secureTextEntry
                autoComplete="password-new"
                keyboardAppearance="dark"
              />
            </View>

            <TouchableOpacity
              onPress={handleRegister}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              <View style={[styles.button, isLoading && styles.buttonLoading]}>
                <Text style={styles.buttonText}>
                  {isLoading ? 'CREATING...' : 'CREATE ACCOUNT'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>¿Ya tenés cuenta?</Text>
            <Link href="/login" asChild>
              <TouchableOpacity>
                <Text style={styles.footerLink}>Sign In</Text>
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
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 8,
  },
  logo: {
    width: '100%',
    height: 200,
    opacity: 0.35,
  },
  titleBlock: {
    marginBottom: 36,
  },
  title: {
    color: '#dde3e7',
    fontSize: 36,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: -1,
    lineHeight: 40,
    marginBottom: 8,
  },
  subtitle: {
    color: '#859399',
    fontSize: 17,
    fontFamily: 'SpaceGrotesk_400Regular',
    letterSpacing: 0.5,
  },
  form: {
    marginBottom: 28,
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
    fontSize: 18,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerText: {
    color: '#859399',
    fontSize: 13,
    fontFamily: 'SpaceGrotesk_400Regular',
  },
  footerLink: {
    color: '#4cd6ff',
    fontSize: 13,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 1,
  },
});

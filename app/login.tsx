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
import { Link, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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
          {/* Brand Header */}
          <View style={styles.header}>
            <Image
              source={require('../assets/images/Logo_workout.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.tagline}>JUST START</Text>
          </View>

          {/* Hero Image */}
          <View style={styles.heroContainer}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80' }}
              style={styles.heroImage}
              resizeMode="cover"
            />
            <LinearGradient
              colors={['rgba(9,15,18,0.15)', 'transparent', 'rgba(9,15,18,0.85)']}
              style={StyleSheet.absoluteFillObject}
            />
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
    paddingBottom: 40,
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
  heroContainer: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 32,
  },
  heroImage: {
    width: '100%',
    height: '100%',
    opacity: 0.55,
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

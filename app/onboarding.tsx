import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useAlert } from '@/components/AppAlert';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { Role } from '@/lib/services/profileService';

export default function OnboardingScreen() {
  const { setRole } = useAuth();
  const { showAlert } = useAlert();
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
    } catch (e) {
      showAlert('Error', 'Ocurrió un problema al configurar tu perfil');
      setSelectedRole(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top accent line */}
      <LinearGradient
        colors={['transparent', '#00d1ff', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.topLine}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
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
            <Text style={styles.title}>YOUR ROLE</Text>
            <Text style={styles.subtitle}>¿Cómo vas a usar GO Workout?</Text>
          </View>

          {/* Role cards */}
          <View style={styles.cards}>
            <TouchableOpacity
              onPress={() => handleSelectRole('TRAINER')}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={selectedRole === 'TRAINER' ? ['#003d4d', '#00566a'] : ['#1a2123', '#141c1f']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.card,
                  selectedRole === 'TRAINER' && styles.cardSelected,
                  isLoading && styles.cardDisabled,
                ]}
              >
                {selectedRole === 'TRAINER' && <View style={styles.cardAccentLine} />}
                <Image
                  source={require('../assets/images/icon_entrenador.png')}
                  style={styles.iconImage}
                  resizeMode="contain"
                />
                <Text style={[styles.cardTitle, selectedRole === 'TRAINER' && styles.cardTitleSelected]}>
                  ENTRENADOR
                </Text>
                <Text style={styles.cardDesc}>
                  Creá y asigná rutinas a tus alumnos
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleSelectRole('STUDENT')}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={selectedRole === 'STUDENT' ? ['#003d4d', '#00566a'] : ['#1a2123', '#141c1f']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[
                  styles.card,
                  selectedRole === 'STUDENT' && styles.cardSelected,
                  isLoading && styles.cardDisabled,
                ]}
              >
                {selectedRole === 'STUDENT' && <View style={styles.cardAccentLine} />}
                <Image
                  source={require('../assets/images/icon_alumno.png')}
                  style={styles.iconImage}
                  resizeMode="contain"
                />
                <Text style={[styles.cardTitle, selectedRole === 'STUDENT' && styles.cardTitleSelected]}>
                  ALUMNO
                </Text>
                <Text style={styles.cardDesc}>
                  Seguí las rutinas de tu entrenador
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {isLoading && (
            <Text style={styles.loadingText}>Configurando tu perfil...</Text>
          )}
        </View>
      </ScrollView>
    </View>
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
  cards: {
    gap: 16,
  },
  card: {
    borderWidth: 2,
    borderColor: '#3c494e',
    borderRadius: 12,
    paddingHorizontal: 28,
    paddingVertical: 22,
    alignItems: 'center',
    overflow: 'hidden',
  },
  cardSelected: {
    borderColor: '#00d1ff',
  },
  cardDisabled: {
    opacity: 0.5,
  },
  cardAccentLine: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#00d1ff',
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
  },
  iconImage: {
    width: 80,
    height: 80,
    marginBottom: 12,
  },
  cardTitle: {
    color: '#bbc9cf',
    fontSize: 22,
    fontFamily: 'SpaceGrotesk_700Bold',
    letterSpacing: 4,
    marginBottom: 8,
    textAlign: 'center',
  },
  cardTitleSelected: {
    color: '#00d1ff',
  },
  cardDesc: {
    color: '#859399',
    fontSize: 14,
    fontFamily: 'SpaceGrotesk_400Regular',
    lineHeight: 20,
    textAlign: 'center',
  },
  loadingText: {
    color: '#859399',
    fontSize: 13,
    fontFamily: 'SpaceGrotesk_400Regular',
    textAlign: 'center',
    marginTop: 24,
    letterSpacing: 1,
  },
});

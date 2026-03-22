import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Role } from '@/lib/services/profileService';

export default function OnboardingScreen() {
  const { setRole, user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  const handleSelectRole = async (role: Role) => {
    setSelectedRole(role);
    setIsLoading(true);

    const { error } = await setRole(role);
    setIsLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
      setSelectedRole(null);
    } else {
      router.replace('/');
    }
  };

  return (
    <View className="flex-1 bg-white justify-center px-6">
      <View className="mb-10">
        <Text className="text-3xl font-bold text-gray-900 text-center">
          ¡Bienvenido!
        </Text>
        <Text className="text-gray-500 text-center mt-2">
          ¿Cómo usarás Go Workout?
        </Text>
      </View>

      <View className="space-y-4">
        <TouchableOpacity
          className={`p-6 rounded-xl border-2 ${
            selectedRole === 'TRAINER'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200'
          } ${isLoading ? 'opacity-50' : ''}`}
          onPress={() => handleSelectRole('TRAINER')}
          disabled={isLoading}
        >
          <Text className="text-xl font-bold text-gray-900">
            Soy Entrenador
          </Text>
          <Text className="text-gray-500 mt-2">
            Crea y asigna rutinas a tus alumnos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className={`p-6 rounded-xl border-2 mt-4 ${
            selectedRole === 'STUDENT'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200'
          } ${isLoading ? 'opacity-50' : ''}`}
          onPress={() => handleSelectRole('STUDENT')}
          disabled={isLoading}
        >
          <Text className="text-xl font-bold text-gray-900">
            Soy Alumno
          </Text>
          <Text className="text-gray-500 mt-2">
            Sigue las rutinas de tu entrenador
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading && (
        <Text className="text-center text-gray-500 mt-6">
          Configurando tu perfil...
        </Text>
      )}
    </View>
  );
}

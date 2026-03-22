import { View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

export default function TrainerPanel() {
  const { profile, signOut, user } = useAuth();

  const handleLogout = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 px-6 pt-6">
        {/* Header */}
        <View className="flex-row justify-between items-center mb-8">
          <View>
            <Text className="text-2xl font-bold text-gray-900">
              Panel del Entrenador
            </Text>
            <Text className="text-gray-500 mt-1">
              Hola, {profile?.full_name || user?.email}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleLogout}
            className="bg-gray-100 px-4 py-2 rounded-lg"
          >
            <Text className="text-gray-700 font-medium">Salir</Text>
          </TouchableOpacity>
        </View>

        {/* Content placeholder */}
        <View className="flex-1 items-center justify-center">
          <View className="bg-blue-50 p-8 rounded-2xl items-center">
            <Text className="text-6xl mb-4">💪</Text>
            <Text className="text-xl font-bold text-gray-900 text-center">
              Panel del Entrenador
            </Text>
            <Text className="text-gray-500 text-center mt-2">
              Aquí podrás gestionar tus alumnos y rutinas
            </Text>
          </View>

          {/* Future features placeholder */}
          <View className="mt-8 w-full">
            <Text className="text-gray-400 text-center text-sm">
              Próximamente: Gestión de alumnos y rutinas
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

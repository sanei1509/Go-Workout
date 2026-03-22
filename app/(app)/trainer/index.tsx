import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';

export default function TrainerPanel() {
  const { profile, signOut, user } = useAuth();

  const handleLogout = async () => {
    await signOut();
    router.replace('/login');
  };

  const handleNewInvitation = () => {
    router.push('/trainer/create-invitation');
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

        {/* Quick Actions */}
        <View className="mb-6">
          <Text className="text-gray-600 font-semibold mb-3">Acciones rápidas</Text>
          <TouchableOpacity
            onPress={handleNewInvitation}
            className="bg-blue-500 p-4 rounded-xl flex-row items-center"
          >
            <View className="w-10 h-10 bg-blue-400 rounded-lg items-center justify-center mr-3">
              <Ionicons name="person-add" size={24} color="white" />
            </View>
            <View className="flex-1">
              <Text className="text-white font-semibold text-lg">
                Invitar alumno
              </Text>
              <Text className="text-blue-100 text-sm">
                Enviar invitación a un nuevo alumno
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Content placeholder */}
        <View className="flex-1 items-center justify-center">
          <View className="bg-blue-50 p-8 rounded-2xl items-center">
            <Text className="text-6xl mb-4">💪</Text>
            <Text className="text-xl font-bold text-gray-900 text-center">
              Bienvenido
            </Text>
            <Text className="text-gray-500 text-center mt-2">
              Gestioná tus alumnos desde la pestaña Invitaciones
            </Text>
          </View>

          {/* Future features placeholder */}
          <View className="mt-8 w-full">
            <Text className="text-gray-400 text-center text-sm">
              Próximamente: Gestión de rutinas y seguimiento
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

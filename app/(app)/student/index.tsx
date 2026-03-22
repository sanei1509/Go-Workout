import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useTraining } from '@/contexts/TrainingContext';
import { ActiveTrainer } from '@/lib/services/trainerService';

export default function StudentHome() {
  const { profile, signOut, user } = useAuth();
  const {
    mode,
    selectedTrainer,
    trainers,
    isLoading,
    hasTrainers,
    selectPersonalPlan,
    selectTrainer,
  } = useTraining();

  const [showContextSelector, setShowContextSelector] = useState(false);

  const handleLogout = async () => {
    await signOut();
    router.replace('/login');
  };

  const handleSelectTrainer = (trainer: ActiveTrainer) => {
    selectTrainer(trainer);
    setShowContextSelector(false);
  };

  const handleSelectPersonal = () => {
    selectPersonalPlan();
    setShowContextSelector(false);
  };

  const getContextLabel = () => {
    if (mode === 'trainer' && selectedTrainer) {
      return selectedTrainer.full_name;
    }
    return 'Plan personal';
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Modal Selector de Contexto */}
      <Modal
        visible={showContextSelector}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowContextSelector(false)}
      >
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
            <Text className="text-lg font-semibold text-gray-900">
              Elegí cómo entrenar
            </Text>
            <TouchableOpacity
              onPress={() => setShowContextSelector(false)}
              className="p-2"
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 px-4 py-4">
            {/* Plan Personal */}
            <TouchableOpacity
              onPress={handleSelectPersonal}
              className={`p-4 rounded-xl mb-3 border-2 ${
                mode === 'personal'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <View className="flex-row items-center">
                <View className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${
                  mode === 'personal' ? 'bg-blue-500' : 'bg-gray-100'
                }`}>
                  <Ionicons
                    name="person"
                    size={24}
                    color={mode === 'personal' ? 'white' : '#6B7280'}
                  />
                </View>
                <View className="flex-1">
                  <Text className={`font-semibold text-lg ${
                    mode === 'personal' ? 'text-blue-900' : 'text-gray-900'
                  }`}>
                    Plan personal
                  </Text>
                  <Text className="text-gray-500 text-sm">
                    Armá tus propias rutinas con asistencia de IA
                  </Text>
                </View>
                {mode === 'personal' && (
                  <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
                )}
              </View>
            </TouchableOpacity>

            {/* Lista de Entrenadores */}
            {trainers.length > 0 && (
              <>
                <Text className="text-gray-500 font-medium mb-3 mt-4">
                  Mis entrenadores
                </Text>
                {trainers.map((trainer) => (
                  <TouchableOpacity
                    key={trainer.id}
                    onPress={() => handleSelectTrainer(trainer)}
                    className={`p-4 rounded-xl mb-3 border-2 ${
                      mode === 'trainer' && selectedTrainer?.id === trainer.id
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <View className="flex-row items-center">
                      <View className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${
                        mode === 'trainer' && selectedTrainer?.id === trainer.id
                          ? 'bg-green-500'
                          : 'bg-purple-100'
                      }`}>
                        <Text className={`font-bold text-xl ${
                          mode === 'trainer' && selectedTrainer?.id === trainer.id
                            ? 'text-white'
                            : 'text-purple-600'
                        }`}>
                          {trainer.full_name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text className={`font-semibold text-lg ${
                          mode === 'trainer' && selectedTrainer?.id === trainer.id
                            ? 'text-green-900'
                            : 'text-gray-900'
                        }`}>
                          {trainer.full_name}
                        </Text>
                        <View className="flex-row flex-wrap mt-1">
                          <Text className="text-gray-500 text-sm">
                            {trainer.discipline} • {trainer.plan_type}
                          </Text>
                        </View>
                        <Text className="text-gray-400 text-xs mt-1">
                          {trainer.frequency}
                        </Text>
                      </View>
                      {mode === 'trainer' && selectedTrainer?.id === trainer.id && (
                        <Ionicons name="checkmark-circle" size={24} color="#16A34A" />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Header */}
      <View className="px-4 py-4 bg-white border-b border-gray-100">
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="text-gray-500 text-sm">Hola,</Text>
            <Text className="text-xl font-bold text-gray-900">
              {profile?.full_name || user?.email?.split('@')[0]}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleLogout}
            className="p-2"
          >
            <Ionicons name="log-out-outline" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Context Selector Button */}
        <TouchableOpacity
          onPress={() => setShowContextSelector(true)}
          className="mt-4 bg-gray-100 p-3 rounded-xl flex-row items-center justify-between"
        >
          <View className="flex-row items-center">
            <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
              mode === 'personal' ? 'bg-blue-500' : 'bg-green-500'
            }`}>
              {mode === 'personal' ? (
                <Ionicons name="person" size={20} color="white" />
              ) : (
                <Text className="text-white font-bold">
                  {selectedTrainer?.full_name.charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
            <View>
              <Text className="text-gray-500 text-xs">Entrenando con</Text>
              <Text className="text-gray-900 font-semibold">{getContextLabel()}</Text>
            </View>
          </View>
          <Ionicons name="chevron-down" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        {mode === 'personal' ? (
          // Vista Plan Personal
          <PersonalPlanView hasTrainers={hasTrainers} />
        ) : (
          // Vista Entrenador
          <TrainerView trainer={selectedTrainer!} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Componente para vista de Plan Personal
function PersonalPlanView({ hasTrainers }: { hasTrainers: boolean }) {
  return (
    <View>
      {/* Bienvenida */}
      <View className="bg-gradient-to-r from-blue-500 to-blue-600 bg-blue-500 rounded-2xl p-6 mb-4">
        <Text className="text-white text-2xl font-bold mb-2">
          Tu plan personal
        </Text>
        <Text className="text-blue-100">
          Armá tus propias rutinas y alcanzá tus objetivos
        </Text>
      </View>

      {/* Acciones rápidas */}
      <Text className="text-gray-700 font-semibold mb-3">Empezá a entrenar</Text>

      <TouchableOpacity className="bg-white rounded-xl p-4 mb-3 shadow-sm flex-row items-center">
        <View className="w-12 h-12 bg-purple-100 rounded-xl items-center justify-center mr-4">
          <Ionicons name="sparkles" size={24} color="#9333EA" />
        </View>
        <View className="flex-1">
          <View className="flex-row items-center">
            <Text className="text-gray-900 font-semibold">Crear rutina con IA</Text>
            <View className="bg-amber-400 px-2 py-0.5 rounded ml-2">
              <Text className="text-amber-900 text-xs font-bold">PRO</Text>
            </View>
          </View>
          <Text className="text-gray-500 text-sm">Generá una rutina personalizada</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      </TouchableOpacity>

      <TouchableOpacity className="bg-white rounded-xl p-4 mb-3 shadow-sm flex-row items-center">
        <View className="w-12 h-12 bg-green-100 rounded-xl items-center justify-center mr-4">
          <Ionicons name="add-circle" size={24} color="#16A34A" />
        </View>
        <View className="flex-1">
          <Text className="text-gray-900 font-semibold">Crear rutina manual</Text>
          <Text className="text-gray-500 text-sm">Armá tu rutina paso a paso</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      </TouchableOpacity>

      <TouchableOpacity className="bg-white rounded-xl p-4 mb-3 shadow-sm flex-row items-center">
        <View className="w-12 h-12 bg-orange-100 rounded-xl items-center justify-center mr-4">
          <Ionicons name="library" size={24} color="#EA580C" />
        </View>
        <View className="flex-1">
          <Text className="text-gray-900 font-semibold">Explorar ejercicios</Text>
          <Text className="text-gray-500 text-sm">Biblioteca de ejercicios</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
      </TouchableOpacity>

      {/* Info si no tiene entrenadores */}
      {!hasTrainers && (
        <View className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-4">
          <View className="flex-row items-start">
            <Ionicons name="information-circle" size={24} color="#3B82F6" />
            <View className="ml-3 flex-1">
              <Text className="text-blue-800 font-semibold">¿Querés un entrenador?</Text>
              <Text className="text-blue-700 mt-1">
                Revisá tus invitaciones en la pestaña "Invitaciones" para conectar con un entrenador.
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Próximamente */}
      <View className="mt-6 items-center">
        <Text className="text-gray-400 text-sm">
          Próximamente: Historial de entrenamientos y estadísticas
        </Text>
      </View>
    </View>
  );
}

// Componente para vista con Entrenador
function TrainerView({ trainer }: { trainer: ActiveTrainer }) {
  return (
    <View>
      {/* Info del entrenador */}
      <View className="bg-gradient-to-r from-green-500 to-green-600 bg-green-500 rounded-2xl p-6 mb-4">
        <View className="flex-row items-center mb-3">
          <View className="w-14 h-14 bg-white/20 rounded-full items-center justify-center mr-4">
            <Text className="text-white font-bold text-2xl">
              {trainer.full_name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text className="text-green-100 text-sm">Entrenando con</Text>
            <Text className="text-white text-xl font-bold">{trainer.full_name}</Text>
          </View>
        </View>
        <View className="flex-row flex-wrap">
          <View className="bg-white/20 px-3 py-1 rounded-full mr-2 mb-2">
            <Text className="text-white text-sm">{trainer.discipline}</Text>
          </View>
          <View className="bg-white/20 px-3 py-1 rounded-full mr-2 mb-2">
            <Text className="text-white text-sm">{trainer.plan_type}</Text>
          </View>
          <View className="bg-white/20 px-3 py-1 rounded-full mb-2">
            <Text className="text-white text-sm">{trainer.frequency}</Text>
          </View>
        </View>
      </View>

      {/* Rutinas pendientes (placeholder) */}
      <Text className="text-gray-700 font-semibold mb-3">Rutinas pendientes</Text>

      <View className="bg-white rounded-xl p-6 mb-4 shadow-sm items-center">
        <View className="w-16 h-16 bg-gray-100 rounded-full items-center justify-center mb-4">
          <Ionicons name="barbell-outline" size={32} color="#9CA3AF" />
        </View>
        <Text className="text-gray-500 text-center">
          Tu entrenador aún no te asignó rutinas
        </Text>
        <Text className="text-gray-400 text-sm text-center mt-1">
          Las rutinas aparecerán aquí cuando estén disponibles
        </Text>
      </View>

      {/* Historial (placeholder) */}
      <Text className="text-gray-700 font-semibold mb-3">Historial reciente</Text>

      <View className="bg-white rounded-xl p-6 shadow-sm items-center">
        <View className="w-16 h-16 bg-gray-100 rounded-full items-center justify-center mb-4">
          <Ionicons name="time-outline" size={32} color="#9CA3AF" />
        </View>
        <Text className="text-gray-500 text-center">
          Todavía no tenés entrenamientos registrados
        </Text>
      </View>

      {/* Próximamente */}
      <View className="mt-6 items-center">
        <Text className="text-gray-400 text-sm">
          Próximamente: Rutinas y seguimiento de progreso
        </Text>
      </View>
    </View>
  );
}

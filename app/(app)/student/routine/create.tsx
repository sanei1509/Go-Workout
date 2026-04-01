import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { createRoutine } from '@/lib/services/routineService';

const DAYS = [
  { value: 1, label: 'Día 1' },
  { value: 2, label: 'Día 2' },
  { value: 3, label: 'Día 3' },
  { value: 4, label: 'Día 4' },
  { value: 5, label: 'Día 5' },
  { value: 6, label: 'Día 6' },
  { value: 7, label: 'Día 7' },
];

export default function CreateRoutineScreen() {
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const [name, setName] = useState('');
  const [dayNumber, setDayNumber] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);

  const handleGoBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      router.back();
    }
  };

  const handleNext = () => {
    if (step === 1 && name.trim().length < 3) {
      Alert.alert('Error', 'El nombre debe tener al menos 3 caracteres');
      return;
    }
    if (step === 2 && dayNumber === null) {
      Alert.alert('Error', 'Seleccioná un día para la rutina');
      return;
    }
    setStep(step + 1);
  };

  const handleCreate = async () => {
    if (!planId) {
      Alert.alert('Error', 'No se encontró el plan');
      return;
    }

    if (name.trim().length < 3 || dayNumber === null) {
      Alert.alert('Error', 'Completá todos los campos requeridos');
      return;
    }

    setIsLoading(true);
    const { routine, error } = await createRoutine({
      plan_id: planId,
      name: name.trim(),
      day_number: dayNumber,
      notes: notes.trim() || undefined,
    });

    setIsLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    if (routine) {
      router.replace(`/student/routine/${routine.id}`);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <View>
            <Text className="text-2xl font-bold text-gray-900 mb-2">
              Nombre de la rutina
            </Text>
            <Text className="text-gray-500 mb-6">
              Elegí un nombre descriptivo, por ejemplo "Día de pecho" o "Full body"
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Ej: Día 1 - Pecho y Tríceps"
              placeholderTextColor="#9CA3AF"
              className="bg-gray-100 rounded-xl px-4 py-4 text-gray-900 text-lg"
              autoFocus
            />
          </View>
        );

      case 2:
        return (
          <View>
            <Text className="text-2xl font-bold text-gray-900 mb-2">
              Día de entrenamiento
            </Text>
            <Text className="text-gray-500 mb-6">
              ¿Qué día de la semana corresponde esta rutina?
            </Text>
            <View className="flex-row flex-wrap">
              {DAYS.map((day) => (
                <TouchableOpacity
                  key={day.value}
                  onPress={() => setDayNumber(day.value)}
                  className={`w-[30%] m-[1.5%] p-4 rounded-xl border-2 ${
                    dayNumber === day.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <Text
                    className={`text-center font-semibold ${
                      dayNumber === day.value ? 'text-blue-600' : 'text-gray-700'
                    }`}
                  >
                    {day.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 3:
        return (
          <View>
            <Text className="text-2xl font-bold text-gray-900 mb-2">
              Notas (opcional)
            </Text>
            <Text className="text-gray-500 mb-6">
              Agregá cualquier información adicional sobre esta rutina
            </Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Ej: Enfoque en hipertrofia, descanso entre series 60-90s"
              placeholderTextColor="#9CA3AF"
              className="bg-gray-100 rounded-xl px-4 py-4 text-gray-900 text-base"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={{ minHeight: 120 }}
            />

            {/* Resumen */}
            <View className="mt-6 bg-blue-50 rounded-xl p-4">
              <Text className="text-blue-800 font-semibold mb-2">Resumen</Text>
              <Text className="text-blue-700">
                <Text className="font-medium">Nombre:</Text> {name}
              </Text>
              <Text className="text-blue-700">
                <Text className="font-medium">Día:</Text> {DAYS.find(d => d.value === dayNumber)?.label}
              </Text>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
          <TouchableOpacity onPress={handleGoBack} className="p-2 -ml-2">
            <Ionicons name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-gray-900">
            Nueva rutina
          </Text>
          <View className="w-10" />
        </View>

        {/* Progress */}
        <View className="px-4 py-3">
          <View className="flex-row">
            {[1, 2, 3].map((s) => (
              <View
                key={s}
                className={`flex-1 h-1 rounded-full mx-1 ${
                  s <= step ? 'bg-blue-500' : 'bg-gray-200'
                }`}
              />
            ))}
          </View>
          <Text className="text-gray-500 text-sm mt-2 text-center">
            Paso {step} de 3
          </Text>
        </View>

        {/* Content */}
        <ScrollView
          className="flex-1 px-4"
          contentContainerStyle={{ paddingVertical: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          {renderStepContent()}
        </ScrollView>

        {/* Footer */}
        <View className="px-4 pb-4">
          {step < 3 ? (
            <TouchableOpacity
              onPress={handleNext}
              className="bg-blue-500 py-4 rounded-xl"
            >
              <Text className="text-white text-center font-semibold text-lg">
                Continuar
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleCreate}
              disabled={isLoading}
              className={`py-4 rounded-xl ${
                isLoading ? 'bg-gray-300' : 'bg-blue-500'
              }`}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white text-center font-semibold text-lg">
                  Crear rutina
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

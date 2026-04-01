import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import {
  createPlan,
  DISCIPLINES,
  FREQUENCIES,
} from '@/lib/services/planService';

export default function CreatePlanScreen() {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [discipline, setDiscipline] = useState<string | null>(null);
  const [frequency, setFrequency] = useState<number | null>(null);

  // Current step
  const [step, setStep] = useState(1);

  const handleGoBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      router.back();
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return name.trim().length >= 2;
      case 2:
        return discipline !== null;
      case 3:
        return frequency !== null;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!user?.id || !discipline || !frequency) return;

    setIsSubmitting(true);

    const { plan, error } = await createPlan(user.id, {
      name: name.trim(),
      discipline,
      weekly_frequency: frequency,
    });

    setIsSubmitting(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    // Navegar al detalle del plan creado
    router.replace(`/student/plan/${plan?.id}`);
  };

  const renderStep1 = () => (
    <View className="flex-1">
      <Text className="text-2xl font-bold text-gray-900 mb-2">
        ¿Cómo se llama tu plan?
      </Text>
      <Text className="text-gray-500 mb-6">
        Dale un nombre que te ayude a identificarlo
      </Text>

      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Ej: Rutina de fuerza, Plan de verano..."
        className="bg-white border border-gray-200 rounded-xl px-4 py-4 text-lg text-gray-900"
        autoFocus
        maxLength={50}
      />

      <Text className="text-gray-400 text-sm mt-2 text-right">
        {name.length}/50
      </Text>
    </View>
  );

  const renderStep2 = () => (
    <View className="flex-1">
      <Text className="text-2xl font-bold text-gray-900 mb-2">
        ¿Qué disciplina vas a entrenar?
      </Text>
      <Text className="text-gray-500 mb-6">
        Elegí la disciplina principal de este plan
      </Text>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="flex-row flex-wrap">
          {DISCIPLINES.map((d) => (
            <TouchableOpacity
              key={d}
              onPress={() => setDiscipline(d)}
              className={`px-4 py-3 rounded-xl mr-2 mb-2 ${
                discipline === d
                  ? 'bg-blue-500'
                  : 'bg-white border border-gray-200'
              }`}
            >
              <Text
                className={`font-medium ${
                  discipline === d ? 'text-white' : 'text-gray-700'
                }`}
              >
                {d}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  const renderStep3 = () => (
    <View className="flex-1">
      <Text className="text-2xl font-bold text-gray-900 mb-2">
        ¿Cuántos días por semana?
      </Text>
      <Text className="text-gray-500 mb-6">
        Elegí la frecuencia de entrenamiento
      </Text>

      <View>
        {FREQUENCIES.map((f) => (
          <TouchableOpacity
            key={f.value}
            onPress={() => setFrequency(f.value)}
            className={`p-4 rounded-xl mb-3 flex-row items-center justify-between ${
              frequency === f.value
                ? 'bg-blue-500'
                : 'bg-white border border-gray-200'
            }`}
          >
            <Text
              className={`font-medium text-lg ${
                frequency === f.value ? 'text-white' : 'text-gray-700'
              }`}
            >
              {f.label}
            </Text>
            {frequency === f.value && (
              <Ionicons name="checkmark-circle" size={24} color="white" />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={handleGoBack} className="p-2 -ml-2">
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="text-gray-500">Paso {step} de 3</Text>
        <View className="w-10" />
      </View>

      {/* Progress bar */}
      <View className="h-1 bg-gray-200">
        <View
          className="h-full bg-blue-500"
          style={{ width: `${(step / 3) * 100}%` }}
        />
      </View>

      {/* Content */}
      <View className="flex-1 px-4 py-6">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </View>

      {/* Footer */}
      <View className="px-4 py-4 bg-white border-t border-gray-100">
        <TouchableOpacity
          onPress={handleNext}
          disabled={!canProceed() || isSubmitting}
          className={`py-4 rounded-xl flex-row items-center justify-center ${
            canProceed() && !isSubmitting ? 'bg-blue-500' : 'bg-gray-300'
          }`}
        >
          {isSubmitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Text className="text-white font-semibold text-lg">
                {step === 3 ? 'Crear plan' : 'Continuar'}
              </Text>
              {step < 3 && (
                <Ionicons name="arrow-forward" size={20} color="white" className="ml-2" />
              )}
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

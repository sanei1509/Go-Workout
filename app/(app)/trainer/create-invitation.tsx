import { useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Switch,
  Keyboard,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '@/contexts/AuthContext';
import {
  createInvitation,
  findStudentByEmail,
  FormField,
  FORM_FIELD_LABELS,
} from '@/lib/services/invitationService';

const DISCIPLINES = [
  'Musculación',
  'Crossfit',
  'Calistenia',
  'Funcional',
  'Running',
  'Natación',
  'Yoga',
  'Pilates',
  'Boxeo',
  'Artes Marciales',
  'Otro',
];

const AVAILABLE_FORM_FIELDS: FormField[] = [
  'age',
  'weight',
  'height',
  'injuries',
  'diseases',
  'goals',
  'experience',
];

const PLAN_TYPES = [
  'Personalizado',
  'Grupal',
  'Online',
  'Presencial',
  'Híbrido',
];

const FREQUENCIES = [
  '1 vez por semana',
  '2 veces por semana',
  '3 veces por semana',
  '4 veces por semana',
  '5 veces por semana',
  '6 veces por semana',
  'Todos los días',
];

export default function CreateInvitationScreen() {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Form state
  const [studentEmail, setStudentEmail] = useState('');
  const [foundStudent, setFoundStudent] = useState<{
    id: string;
    full_name: string;
    email: string;
  } | null>(null);
  const [studentError, setStudentError] = useState<string | null>(null);

  const [discipline, setDiscipline] = useState<string>(DISCIPLINES[0]);
  const [planType, setPlanType] = useState<string>(PLAN_TYPES[0]);
  const [frequency, setFrequency] = useState<string>(FREQUENCIES[2]);
  const [termsText, setTermsText] = useState<string>('');
  const [hasRequiredForm, setHasRequiredForm] = useState<boolean>(false);
  const [requiredFields, setRequiredFields] = useState<FormField[]>([]);

  const toggleField = (field: FormField) => {
    setRequiredFields((prev) =>
      prev.includes(field)
        ? prev.filter((f) => f !== field)
        : [...prev, field]
    );
  };

  const handleToggleRequiredForm = (value: boolean) => {
    setHasRequiredForm(value);
    if (!value) {
      setRequiredFields([]);
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  const handleSearchStudent = async () => {
    if (!studentEmail.trim()) {
      setStudentError('Ingresá el email del alumno');
      return;
    }

    Keyboard.dismiss();
    setIsSearching(true);
    setStudentError(null);
    setFoundStudent(null);

    const { student, error } = await findStudentByEmail(studentEmail);

    setIsSearching(false);

    if (error) {
      setStudentError(error.message);
      return;
    }

    if (student) {
      setFoundStudent(student);
    }
  };

  const handleClearStudent = () => {
    setFoundStudent(null);
    setStudentEmail('');
    setStudentError(null);
  };

  const validateForm = (): string | null => {
    if (!foundStudent) {
      return 'Buscá y seleccioná un alumno primero';
    }
    if (!discipline) {
      return 'Seleccioná una disciplina';
    }
    if (!planType) {
      return 'Seleccioná un tipo de plan';
    }
    if (!frequency) {
      return 'Seleccioná una frecuencia';
    }
    if (hasRequiredForm && requiredFields.length === 0) {
      return 'Seleccioná al menos un campo para el formulario';
    }
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateForm();
    if (validationError) {
      Alert.alert('Error', validationError);
      return;
    }

    if (!user?.id || !foundStudent) {
      Alert.alert('Error', 'No se pudo identificar al entrenador o alumno');
      return;
    }

    setIsSubmitting(true);

    const { invitation, error } = await createInvitation({
      trainer_id: user.id,
      student_id: foundStudent.id,
      discipline,
      plan_type: planType,
      frequency,
      terms_text: termsText.trim() || undefined,
      has_required_form: hasRequiredForm,
      required_fields: hasRequiredForm ? requiredFields : undefined,
    });

    setIsSubmitting(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    Alert.alert(
      'Invitación enviada',
      `${foundStudent.full_name} recibirá la invitación en su bandeja de entrada`,
      [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={handleGoBack} className="p-2 -ml-2">
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900 ml-2">
          Nueva invitación
        </Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        {/* Búsqueda de alumno */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <Text className="text-gray-500 text-sm mb-2">Email del alumno *</Text>

          {foundStudent ? (
            // Alumno encontrado
            <View className="bg-green-50 border border-green-200 rounded-lg p-3">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <View className="w-10 h-10 bg-green-100 rounded-full items-center justify-center mr-3">
                    <Ionicons name="checkmark-circle" size={24} color="#16A34A" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-green-800 font-semibold">
                      {foundStudent.full_name}
                    </Text>
                    <Text className="text-green-600 text-sm">
                      {foundStudent.email}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={handleClearStudent}
                  className="p-2"
                >
                  <Ionicons name="close-circle" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            // Campo de búsqueda
            <>
              <View className="flex-row">
                <TextInput
                  value={studentEmail}
                  onChangeText={(text) => {
                    setStudentEmail(text);
                    setStudentError(null);
                  }}
                  placeholder="alumno@email.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  className="flex-1 border border-gray-200 rounded-l-lg px-4 py-3 text-gray-900"
                  editable={!isSearching}
                />
                <TouchableOpacity
                  onPress={handleSearchStudent}
                  disabled={isSearching}
                  className={`px-4 rounded-r-lg items-center justify-center ${
                    isSearching ? 'bg-blue-300' : 'bg-blue-500'
                  }`}
                >
                  {isSearching ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Ionicons name="search" size={20} color="white" />
                  )}
                </TouchableOpacity>
              </View>

              {studentError && (
                <View className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 flex-row items-center">
                  <Ionicons name="alert-circle" size={20} color="#DC2626" />
                  <Text className="text-red-700 ml-2 flex-1">{studentError}</Text>
                </View>
              )}

              <Text className="text-gray-400 text-xs mt-2">
                El alumno debe estar registrado en la app para poder invitarlo
              </Text>
            </>
          )}
        </View>

        {/* Disciplina */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <Text className="text-gray-500 text-sm mb-2">Disciplina *</Text>
          <View className="border border-gray-200 rounded-lg overflow-hidden">
            <Picker
              selectedValue={discipline}
              onValueChange={setDiscipline}
            >
              {DISCIPLINES.map((d) => (
                <Picker.Item key={d} label={d} value={d} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Tipo de plan */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <Text className="text-gray-500 text-sm mb-2">Tipo de plan *</Text>
          <View className="border border-gray-200 rounded-lg overflow-hidden">
            <Picker
              selectedValue={planType}
              onValueChange={setPlanType}
            >
              {PLAN_TYPES.map((p) => (
                <Picker.Item key={p} label={p} value={p} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Frecuencia */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <Text className="text-gray-500 text-sm mb-2">Frecuencia *</Text>
          <View className="border border-gray-200 rounded-lg overflow-hidden">
            <Picker
              selectedValue={frequency}
              onValueChange={setFrequency}
            >
              {FREQUENCIES.map((f) => (
                <Picker.Item key={f} label={f} value={f} />
              ))}
            </Picker>
          </View>
        </View>

        {/* Términos y condiciones */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <Text className="text-gray-500 text-sm mb-2">
            Términos y condiciones (opcional)
          </Text>
          <TextInput
            value={termsText}
            onChangeText={setTermsText}
            placeholder="Escribí los términos que el alumno debe aceptar..."
            multiline
            numberOfLines={4}
            className="border border-gray-200 rounded-lg p-3 text-gray-900 min-h-[100px]"
            textAlignVertical="top"
          />
        </View>

        {/* Formulario requerido */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 mr-4">
              <Text className="text-gray-900 font-medium">
                Formulario requerido
              </Text>
              <Text className="text-gray-500 text-sm mt-1">
                El alumno deberá completar un formulario al aceptar
              </Text>
            </View>
            <Switch
              value={hasRequiredForm}
              onValueChange={handleToggleRequiredForm}
              trackColor={{ false: '#E5E7EB', true: '#3B82F6' }}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* Selección de campos requeridos */}
          {hasRequiredForm && (
            <View className="mt-4 pt-4 border-t border-gray-100">
              <Text className="text-gray-700 font-medium mb-3">
                Seleccioná los datos que necesitás:
              </Text>
              {AVAILABLE_FORM_FIELDS.map((field) => (
                <TouchableOpacity
                  key={field}
                  onPress={() => toggleField(field)}
                  className="flex-row items-center py-2"
                >
                  <View
                    className={`w-6 h-6 rounded border-2 mr-3 items-center justify-center ${
                      requiredFields.includes(field)
                        ? 'bg-blue-500 border-blue-500'
                        : 'border-gray-300'
                    }`}
                  >
                    {requiredFields.includes(field) && (
                      <Ionicons name="checkmark" size={16} color="white" />
                    )}
                  </View>
                  <Text className="text-gray-800">
                    {FORM_FIELD_LABELS[field]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Botón de envío */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isSubmitting || !foundStudent}
          className={`py-4 rounded-xl flex-row items-center justify-center mt-4 ${
            isSubmitting || !foundStudent ? 'bg-blue-300' : 'bg-blue-500'
          }`}
        >
          {isSubmitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="send" size={20} color="white" />
              <Text className="text-white font-semibold text-lg ml-2">
                Enviar invitación
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Espacio extra al final */}
        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}

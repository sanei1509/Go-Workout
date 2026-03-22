import { useEffect, useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  getInvitationById,
  acceptInvitation,
  rejectInvitation,
  Invitation,
} from '@/lib/services/invitationService';

type ActionResult = 'accepted' | 'rejected' | null;

export default function InvitationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<ActionResult>(null);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    const loadInvitation = async () => {
      if (!id) return;

      setIsLoading(true);
      const { invitation: data, error: err } = await getInvitationById(id);

      if (err) {
        setError(err.message);
      } else {
        setInvitation(data);
      }
      setIsLoading(false);
    };

    loadInvitation();
  }, [id]);

  const handleAccept = () => {
    // Si hay términos y no fueron aceptados, mostrar modal primero
    if (invitation?.terms_text && !termsAccepted) {
      setShowTermsModal(true);
      return;
    }

    confirmAccept();
  };

  const confirmAccept = () => {
    Alert.alert(
      'Aceptar invitación',
      `¿Querés aceptar la invitación de ${invitation?.trainer?.full_name || 'este entrenador'}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aceptar',
          onPress: async () => {
            if (!id) return;

            setIsProcessing(true);
            const { success, error: err } = await acceptInvitation(id);
            setIsProcessing(false);

            if (err || !success) {
              Alert.alert('Error', err?.message || 'No se pudo aceptar la invitación');
            } else {
              setActionResult('accepted');
            }
          },
        },
      ]
    );
  };

  const handleAcceptTerms = () => {
    setTermsAccepted(true);
    setShowTermsModal(false);
    confirmAccept();
  };

  const handleReject = () => {
    Alert.alert(
      'Rechazar invitación',
      '¿Estás seguro de que querés rechazar esta invitación?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Rechazar',
          style: 'destructive',
          onPress: async () => {
            if (!id) return;

            setIsProcessing(true);
            const { success, error: err } = await rejectInvitation(id);
            setIsProcessing(false);

            if (err || !success) {
              Alert.alert('Error', err?.message || 'No se pudo rechazar la invitación');
            } else {
              setActionResult('rejected');
            }
          },
        },
      ]
    );
  };

  const handleGoBack = () => {
    router.back();
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !invitation) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-red-500 text-center">{error || 'Invitación no encontrada'}</Text>
          <TouchableOpacity
            onPress={handleGoBack}
            className="mt-4 bg-blue-500 px-6 py-3 rounded-lg"
          >
            <Text className="text-white font-semibold">Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Mostrar resultado de la acción
  if (actionResult) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center px-6">
          <View
            className={`w-20 h-20 rounded-full items-center justify-center mb-6 ${
              actionResult === 'accepted' ? 'bg-green-100' : 'bg-gray-100'
            }`}
          >
            <Ionicons
              name={actionResult === 'accepted' ? 'checkmark-circle' : 'close-circle'}
              size={48}
              color={actionResult === 'accepted' ? '#16A34A' : '#6B7280'}
            />
          </View>

          <Text className="text-2xl font-bold text-gray-900 text-center mb-2">
            {actionResult === 'accepted' ? '¡Invitación aceptada!' : 'Invitación rechazada'}
          </Text>

          <Text className="text-gray-500 text-center mb-8">
            {actionResult === 'accepted'
              ? `Ahora sos alumno de ${invitation.trainer?.full_name || 'este entrenador'}`
              : 'La invitación ha sido rechazada'}
          </Text>

          <TouchableOpacity
            onPress={handleGoBack}
            className="bg-blue-500 px-8 py-4 rounded-xl"
          >
            <Text className="text-white font-semibold text-lg">Volver a invitaciones</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const trainerName = invitation.trainer?.full_name || 'Entrenador';

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Modal de Términos y Condiciones */}
      <Modal
        visible={showTermsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTermsModal(false)}
      >
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
            <Text className="text-lg font-semibold text-gray-900">
              Términos y Condiciones
            </Text>
            <TouchableOpacity
              onPress={() => setShowTermsModal(false)}
              className="p-2"
            >
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 px-4 py-4">
            <Text className="text-gray-700 leading-6">
              {invitation.terms_text}
            </Text>
          </ScrollView>

          <View className="px-4 py-4 border-t border-gray-100">
            <TouchableOpacity
              onPress={handleAcceptTerms}
              className="bg-green-500 py-4 rounded-xl flex-row items-center justify-center"
            >
              <Ionicons name="checkmark-circle" size={24} color="white" />
              <Text className="text-white font-semibold text-lg ml-2">
                Acepto los términos
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowTermsModal(false)}
              className="py-4 mt-2"
            >
              <Text className="text-gray-500 text-center font-medium">Cancelar</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Header */}
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-gray-100">
        <TouchableOpacity
          onPress={handleGoBack}
          className="p-2 -ml-2"
        >
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900 ml-2">
          Detalle de invitación
        </Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        {/* Entrenador */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <Text className="text-gray-500 text-sm mb-2">Entrenador</Text>
          <View className="flex-row items-center">
            <View className="w-12 h-12 bg-blue-100 rounded-full items-center justify-center mr-3">
              <Text className="text-blue-600 font-bold text-xl">
                {trainerName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text className="text-gray-900 font-semibold text-lg">{trainerName}</Text>
          </View>
        </View>

        {/* Detalles del plan */}
        <View className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <Text className="text-gray-500 text-sm mb-3">Detalles del plan</Text>

          <View className="space-y-3">
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-purple-100 rounded-lg items-center justify-center mr-3">
                <Ionicons name="barbell" size={20} color="#9333EA" />
              </View>
              <View>
                <Text className="text-gray-500 text-sm">Disciplina</Text>
                <Text className="text-gray-900 font-medium">{invitation.discipline}</Text>
              </View>
            </View>

            <View className="flex-row items-center mt-3">
              <View className="w-10 h-10 bg-green-100 rounded-lg items-center justify-center mr-3">
                <Ionicons name="document-text" size={20} color="#16A34A" />
              </View>
              <View>
                <Text className="text-gray-500 text-sm">Tipo de plan</Text>
                <Text className="text-gray-900 font-medium">{invitation.plan_type}</Text>
              </View>
            </View>

            <View className="flex-row items-center mt-3">
              <View className="w-10 h-10 bg-orange-100 rounded-lg items-center justify-center mr-3">
                <Ionicons name="calendar" size={20} color="#EA580C" />
              </View>
              <View>
                <Text className="text-gray-500 text-sm">Frecuencia</Text>
                <Text className="text-gray-900 font-medium">{invitation.frequency}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Términos y Condiciones */}
        {invitation.terms_text && (
          <TouchableOpacity
            onPress={() => setShowTermsModal(true)}
            className="bg-white rounded-xl p-4 mb-4 shadow-sm flex-row items-center justify-between"
          >
            <View className="flex-row items-center">
              <View className="w-10 h-10 bg-blue-100 rounded-lg items-center justify-center mr-3">
                <Ionicons name="document" size={20} color="#3B82F6" />
              </View>
              <View>
                <Text className="text-blue-600 font-medium">Ver Términos y Condiciones</Text>
                {termsAccepted && (
                  <Text className="text-green-600 text-sm">Aceptados</Text>
                )}
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#3B82F6" />
          </TouchableOpacity>
        )}

        {/* Aviso de formulario obligatorio */}
        {invitation.has_required_form && (
          <View className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
            <View className="flex-row items-start">
              <Ionicons name="information-circle" size={24} color="#D97706" />
              <View className="ml-3 flex-1">
                <Text className="text-amber-800 font-semibold">Formulario requerido</Text>
                <Text className="text-amber-700 mt-1">
                  Al aceptar esta invitación, deberás completar un formulario con información adicional.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Botones de acción */}
        <View className="mt-4 space-y-3">
          <TouchableOpacity
            onPress={handleAccept}
            disabled={isProcessing}
            className={`py-4 rounded-xl flex-row items-center justify-center ${
              isProcessing ? 'bg-green-300' : 'bg-green-500'
            }`}
          >
            {isProcessing ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={24} color="white" />
                <Text className="text-white font-semibold text-lg ml-2">Aceptar invitación</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleReject}
            disabled={isProcessing}
            className={`py-4 rounded-xl flex-row items-center justify-center mt-3 ${
              isProcessing ? 'bg-gray-200' : 'bg-gray-100'
            }`}
          >
            <Ionicons name="close-circle" size={24} color="#6B7280" />
            <Text className="text-gray-600 font-semibold text-lg ml-2">Rechazar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

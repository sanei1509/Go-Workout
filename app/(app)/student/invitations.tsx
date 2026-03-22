import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { getStudentPendingInvitations, Invitation } from '@/lib/services/invitationService';

function InvitationCard({ invitation, onPress }: { invitation: Invitation; onPress: () => void }) {
  const trainerName = invitation.trainer?.full_name || 'Entrenador';

  return (
    <TouchableOpacity
      onPress={onPress}
      className="bg-white rounded-xl p-4 mb-3 border border-gray-100 shadow-sm"
      activeOpacity={0.7}
    >
      {/* Entrenador */}
      <View className="flex-row items-center mb-3">
        <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mr-3">
          <Text className="text-blue-600 font-bold text-lg">
            {trainerName.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View>
          <Text className="text-gray-900 font-semibold">{trainerName}</Text>
          <Text className="text-gray-500 text-sm">Entrenador</Text>
        </View>
      </View>

      {/* Detalles */}
      <View className="bg-gray-50 rounded-lg p-3">
        <View className="flex-row justify-between mb-2">
          <Text className="text-gray-500">Disciplina</Text>
          <Text className="text-gray-900 font-medium">{invitation.discipline}</Text>
        </View>
        <View className="flex-row justify-between mb-2">
          <Text className="text-gray-500">Tipo de plan</Text>
          <Text className="text-gray-900 font-medium">{invitation.plan_type}</Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-gray-500">Frecuencia</Text>
          <Text className="text-gray-900 font-medium">{invitation.frequency}</Text>
        </View>
      </View>

      {/* Indicador de ver más */}
      <View className="flex-row items-center justify-end mt-3">
        <Text className="text-blue-500 text-sm mr-1">Ver detalle</Text>
        <Ionicons name="chevron-forward" size={16} color="#3B82F6" />
      </View>
    </TouchableOpacity>
  );
}

function EmptyState() {
  return (
    <View className="flex-1 items-center justify-center px-6">
      <View className="bg-gray-50 p-8 rounded-2xl items-center">
        <Text className="text-6xl mb-4">📭</Text>
        <Text className="text-xl font-bold text-gray-900 text-center">
          No tenés invitaciones pendientes
        </Text>
        <Text className="text-gray-500 text-center mt-2">
          Cuando un entrenador te invite, aparecerá acá
        </Text>
      </View>
    </View>
  );
}

export default function InvitationsScreen() {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInvitations = useCallback(async () => {
    if (!user?.id) return;

    const { invitations: data, error: err } = await getStudentPendingInvitations(user.id);

    if (err) {
      setError(err.message);
    } else {
      setInvitations(data);
      setError(null);
    }
  }, [user?.id]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      await loadInvitations();
      setIsLoading(false);
    };
    fetchData();
  }, [loadInvitations]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadInvitations();
    setIsRefreshing(false);
  }, [loadInvitations]);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-1">
        {/* Header */}
        <View className="px-6 pt-6 pb-4 bg-white border-b border-gray-100">
          <Text className="text-2xl font-bold text-gray-900">Invitaciones</Text>
          <Text className="text-gray-500 mt-1">
            {invitations.length > 0
              ? `Tenés ${invitations.length} invitación${invitations.length > 1 ? 'es' : ''} pendiente${invitations.length > 1 ? 's' : ''}`
              : 'Revisá las invitaciones de entrenadores'}
          </Text>
        </View>

        {/* Error */}
        {error && (
          <View className="mx-6 mt-4 bg-red-50 p-4 rounded-lg">
            <Text className="text-red-600">{error}</Text>
          </View>
        )}

        {/* Lista o estado vacío */}
        {invitations.length === 0 ? (
          <EmptyState />
        ) : (
          <FlatList
            data={invitations}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <InvitationCard
                invitation={item}
                onPress={() => router.push(`/(app)/student/invitation/${item.id}`)}
              />
            )}
            contentContainerStyle={{ padding: 16 }}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={onRefresh}
                tintColor="#3B82F6"
              />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import {
  getTrainerInvitations,
  Invitation,
  InvitationStatus,
} from '@/lib/services/invitationService';

type FilterOption = 'ALL' | InvitationStatus;

export default function TrainerInvitationsScreen() {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterOption>('ALL');

  const loadInvitations = useCallback(async () => {
    if (!user?.id) return;

    const statusFilter = filter === 'ALL' ? undefined : filter;
    const { invitations: data } = await getTrainerInvitations(user.id, statusFilter);
    setInvitations(data);
  }, [user?.id, filter]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      await loadInvitations();
      setIsLoading(false);
    };
    fetchData();
  }, [loadInvitations]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadInvitations();
    setIsRefreshing(false);
  };

  const handleCreateInvitation = () => {
    router.push('/trainer/create-invitation');
  };

  const getStatusColor = (status: InvitationStatus) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-700';
      case 'ACCEPTED':
        return 'bg-green-100 text-green-700';
      case 'REJECTED':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: InvitationStatus) => {
    switch (status) {
      case 'PENDING':
        return 'Pendiente';
      case 'ACCEPTED':
        return 'Aceptada';
      case 'REJECTED':
        return 'Rechazada';
      default:
        return status;
    }
  };

  const FilterButton = ({
    label,
    value,
    current,
    onPress,
  }: {
    label: string;
    value: FilterOption;
    current: FilterOption;
    onPress: (value: FilterOption) => void;
  }) => (
    <TouchableOpacity
      onPress={() => onPress(value)}
      className={`px-4 py-2 rounded-full mr-2 ${
        current === value ? 'bg-blue-500' : 'bg-gray-100'
      }`}
    >
      <Text
        className={`font-medium ${
          current === value ? 'text-white' : 'text-gray-600'
        }`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="px-4 py-4 bg-white border-b border-gray-100">
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-2xl font-bold text-gray-900">Invitaciones</Text>
          <TouchableOpacity
            onPress={handleCreateInvitation}
            className="bg-blue-500 px-4 py-2 rounded-lg flex-row items-center"
          >
            <Ionicons name="add" size={20} color="white" />
            <Text className="text-white font-medium ml-1">Nueva</Text>
          </TouchableOpacity>
        </View>

        {/* Filtros */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <FilterButton
            label="Todas"
            value="ALL"
            current={filter}
            onPress={setFilter}
          />
          <FilterButton
            label="Pendientes"
            value="PENDING"
            current={filter}
            onPress={setFilter}
          />
          <FilterButton
            label="Aceptadas"
            value="ACCEPTED"
            current={filter}
            onPress={setFilter}
          />
          <FilterButton
            label="Rechazadas"
            value="REJECTED"
            current={filter}
            onPress={setFilter}
          />
        </ScrollView>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : invitations.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <View className="bg-gray-100 p-6 rounded-full mb-4">
            <Ionicons name="mail-outline" size={48} color="#9CA3AF" />
          </View>
          <Text className="text-gray-500 text-center text-lg">
            No hay invitaciones {filter !== 'ALL' ? 'con este filtro' : ''}
          </Text>
          <TouchableOpacity
            onPress={handleCreateInvitation}
            className="mt-4 bg-blue-500 px-6 py-3 rounded-lg"
          >
            <Text className="text-white font-semibold">Crear invitación</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
          }
        >
          {invitations.map((invitation) => (
            <View
              key={invitation.id}
              className="bg-white rounded-xl p-4 mb-3 shadow-sm"
            >
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <View className="w-10 h-10 bg-purple-100 rounded-full items-center justify-center mr-3">
                    <Text className="text-purple-600 font-bold">
                      {invitation.student?.full_name?.charAt(0).toUpperCase() ||
                        '?'}
                    </Text>
                  </View>
                  <View>
                    <Text className="text-gray-900 font-semibold">
                      {invitation.student?.full_name || 'Alumno'}
                    </Text>
                    <Text className="text-gray-500 text-sm">
                      {invitation.discipline}
                    </Text>
                  </View>
                </View>
                <View
                  className={`px-3 py-1 rounded-full ${getStatusColor(
                    invitation.status
                  )}`}
                >
                  <Text className="font-medium text-sm">
                    {getStatusLabel(invitation.status)}
                  </Text>
                </View>
              </View>

              <View className="flex-row flex-wrap">
                <View className="flex-row items-center mr-4 mb-2">
                  <Ionicons name="document-text" size={16} color="#6B7280" />
                  <Text className="text-gray-500 text-sm ml-1">
                    {invitation.plan_type}
                  </Text>
                </View>
                <View className="flex-row items-center mr-4 mb-2">
                  <Ionicons name="calendar" size={16} color="#6B7280" />
                  <Text className="text-gray-500 text-sm ml-1">
                    {invitation.frequency}
                  </Text>
                </View>
              </View>

              <Text className="text-gray-400 text-xs mt-2">
                {new Date(invitation.created_at).toLocaleDateString('es-AR', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

import { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/contexts/AuthContext';
import { getWeeklyStats, WeeklyStats } from '@/lib/services/todayService';
import { getUserSessions } from '@/lib/services/workoutService';
import { updateProfile, uploadAvatar } from '@/lib/services/profileService';

export default function ProfileScreen() {
  const { profile, user, signOut, refreshProfile } = useAuth();
  const [stats, setStats] = useState<WeeklyStats | null>(null);
  const [totalSessions, setTotalSessions] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  // Edición de nombre
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);

  // Upload de foto
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [user?.id])
  );

  const loadStats = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    const [statsResult, sessionsResult] = await Promise.all([
      getWeeklyStats(user.id),
      getUserSessions(user.id, 100),
    ]);
    setStats(statsResult.stats);
    setTotalSessions(sessionsResult.sessions.length);
    setIsLoading(false);
  };

  const handleEditName = () => {
    setNameInput(profile?.full_name ?? '');
    setIsEditingName(true);
  };

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed || !user?.id) return;
    setIsSavingName(true);
    const { error } = await updateProfile(user.id, { full_name: trimmed });
    if (error) {
      Alert.alert('Error', 'No se pudo guardar el nombre');
    } else {
      await refreshProfile();
      setIsEditingName(false);
    }
    setIsSavingName(false);
  };

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería para cambiar la foto.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const mimeType = asset.mimeType ?? 'image/jpeg';

    setIsUploadingPhoto(true);
    const { url, error: uploadError } = await uploadAvatar(user!.id, asset.uri, mimeType);

    if (uploadError || !url) {
      Alert.alert('Error', uploadError?.message ?? 'No se pudo subir la imagen');
      setIsUploadingPhoto(false);
      return;
    }

    const { error: updateError } = await updateProfile(user!.id, { avatar_url: url });
    if (updateError) {
      Alert.alert('Error', 'No se pudo guardar la foto');
    } else {
      await refreshProfile();
    }
    setIsUploadingPhoto(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro que querés salir?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Salir',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/login');
          },
        },
      ]
    );
  };

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Usuario';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-gray-900">Perfil</Text>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        {/* Avatar + nombre */}
        <View className="bg-white rounded-2xl p-6 mb-4 shadow-sm items-center">
          {/* Foto de perfil */}
          <TouchableOpacity
            onPress={handlePickPhoto}
            disabled={isUploadingPhoto}
            className="relative mb-4"
          >
            {profile?.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                className="w-24 h-24 rounded-full"
              />
            ) : (
              <View className="w-24 h-24 bg-blue-500 rounded-full items-center justify-center">
                <Text className="text-white font-bold text-4xl">{initial}</Text>
              </View>
            )}
            <View className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full border border-gray-200 items-center justify-center shadow-sm">
              {isUploadingPhoto ? (
                <ActivityIndicator size="small" color="#3B82F6" />
              ) : (
                <Ionicons name="camera" size={16} color="#3B82F6" />
              )}
            </View>
          </TouchableOpacity>

          {/* Nombre editable */}
          {isEditingName ? (
            <View className="w-full">
              <TextInput
                value={nameInput}
                onChangeText={setNameInput}
                className="border border-blue-300 rounded-xl px-4 py-3 text-gray-900 text-center text-lg font-semibold bg-blue-50 mb-3"
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleSaveName}
              />
              <View className="flex-row justify-center gap-3">
                <TouchableOpacity
                  onPress={() => setIsEditingName(false)}
                  className="px-5 py-2 rounded-xl border border-gray-300"
                >
                  <Text className="text-gray-600 font-medium">Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSaveName}
                  disabled={isSavingName || !nameInput.trim()}
                  className="px-5 py-2 rounded-xl bg-blue-500"
                >
                  {isSavingName ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text className="text-white font-medium">Guardar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity onPress={handleEditName} className="flex-row items-center">
              <Text className="text-gray-900 font-bold text-xl mr-2">{displayName}</Text>
              <Ionicons name="pencil-outline" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          )}

          <Text className="text-gray-500 text-sm mt-1">{user?.email}</Text>
        </View>

        {/* Stats */}
        {isLoading ? (
          <View className="py-4 items-center">
            <ActivityIndicator size="small" color="#3B82F6" />
          </View>
        ) : (
          <View className="flex-row mb-4">
            <View className="flex-1 bg-white rounded-xl p-4 mr-2 shadow-sm items-center">
              <Text className="text-gray-900 font-bold text-2xl">{totalSessions}</Text>
              <Text className="text-gray-500 text-xs mt-1">Sesiones totales</Text>
            </View>
            <View className="flex-1 bg-white rounded-xl p-4 mx-1 shadow-sm items-center">
              <Text className="text-gray-900 font-bold text-2xl">
                {stats?.workoutsCompleted ?? 0}
              </Text>
              <Text className="text-gray-500 text-xs mt-1">Esta semana</Text>
            </View>
            <View className="flex-1 bg-white rounded-xl p-4 ml-2 shadow-sm items-center">
              <Text className="text-gray-900 font-bold text-2xl">
                {stats?.streak ?? 0}
              </Text>
              <Text className="text-gray-500 text-xs mt-1">Racha actual</Text>
            </View>
          </View>
        )}

        {/* Opciones */}
        <View className="bg-white rounded-xl shadow-sm overflow-hidden mb-4">
          <TouchableOpacity
            onPress={() => router.push('/student/notifications' as any)}
            className="flex-row items-center px-4 py-4 border-b border-gray-100"
          >
            <View className="w-9 h-9 bg-blue-100 rounded-lg items-center justify-center mr-3">
              <Ionicons name="notifications-outline" size={20} color="#3B82F6" />
            </View>
            <Text className="text-gray-900 flex-1">Recordatorios</Text>
            <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/student/history' as any)}
            className="flex-row items-center px-4 py-4"
          >
            <View className="w-9 h-9 bg-green-100 rounded-lg items-center justify-center mr-3">
              <Ionicons name="time-outline" size={20} color="#16A34A" />
            </View>
            <Text className="text-gray-900 flex-1">Historial de entrenamientos</Text>
            <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity
          onPress={handleLogout}
          className="bg-white rounded-xl px-4 py-4 shadow-sm flex-row items-center"
        >
          <View className="w-9 h-9 bg-red-100 rounded-lg items-center justify-center mr-3">
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          </View>
          <Text className="text-red-500 font-medium flex-1">Cerrar sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

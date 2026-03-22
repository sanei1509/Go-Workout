import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActiveTrainer, getStudentActiveTrainers } from '@/lib/services/trainerService';
import { useAuth } from './AuthContext';

const STORAGE_KEY = 'training_context';

export type TrainingMode = 'personal' | 'trainer';

export interface TrainingContextType {
  mode: TrainingMode;
  selectedTrainer: ActiveTrainer | null;
  trainers: ActiveTrainer[];
  isLoading: boolean;
  hasTrainers: boolean;
  selectPersonalPlan: () => void;
  selectTrainer: (trainer: ActiveTrainer) => void;
  refreshTrainers: () => Promise<void>;
}

const TrainingContext = createContext<TrainingContextType | undefined>(undefined);

export function TrainingProvider({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  const [mode, setMode] = useState<TrainingMode>('personal');
  const [selectedTrainer, setSelectedTrainer] = useState<ActiveTrainer | null>(null);
  const [trainers, setTrainers] = useState<ActiveTrainer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Cargar entrenadores cuando el usuario está autenticado y es estudiante
  useEffect(() => {
    if (user && profile?.role === 'STUDENT') {
      loadTrainersAndContext();
    } else {
      setIsLoading(false);
    }
  }, [user, profile]);

  const loadTrainersAndContext = async () => {
    if (!user) return;

    setIsLoading(true);

    // Cargar entrenadores
    const { trainers: activeTrainers } = await getStudentActiveTrainers(user.id);
    setTrainers(activeTrainers);

    // Cargar contexto guardado
    try {
      const savedContext = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedContext) {
        const parsed = JSON.parse(savedContext);

        if (parsed.mode === 'trainer' && parsed.trainerId) {
          // Verificar que el entrenador sigue activo
          const trainer = activeTrainers.find(t => t.id === parsed.trainerId);
          if (trainer) {
            setMode('trainer');
            setSelectedTrainer(trainer);
          } else {
            // El entrenador ya no está activo, volver a plan personal
            setMode('personal');
            setSelectedTrainer(null);
          }
        } else {
          setMode('personal');
          setSelectedTrainer(null);
        }
      }
    } catch (e) {
      console.log('Error loading training context:', e);
    }

    setIsLoading(false);
  };

  const saveContext = async (newMode: TrainingMode, trainerId: string | null) => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ mode: newMode, trainerId })
      );
    } catch (e) {
      console.log('Error saving training context:', e);
    }
  };

  const selectPersonalPlan = () => {
    setMode('personal');
    setSelectedTrainer(null);
    saveContext('personal', null);
  };

  const selectTrainer = (trainer: ActiveTrainer) => {
    setMode('trainer');
    setSelectedTrainer(trainer);
    saveContext('trainer', trainer.id);
  };

  const refreshTrainers = async () => {
    if (!user) return;
    const { trainers: activeTrainers } = await getStudentActiveTrainers(user.id);
    setTrainers(activeTrainers);

    // Si el entrenador seleccionado ya no está activo, volver a plan personal
    if (selectedTrainer && !activeTrainers.find(t => t.id === selectedTrainer.id)) {
      selectPersonalPlan();
    }
  };

  return (
    <TrainingContext.Provider
      value={{
        mode,
        selectedTrainer,
        trainers,
        isLoading,
        hasTrainers: trainers.length > 0,
        selectPersonalPlan,
        selectTrainer,
        refreshTrainers,
      }}
    >
      {children}
    </TrainingContext.Provider>
  );
}

export function useTraining() {
  const context = useContext(TrainingContext);
  if (context === undefined) {
    throw new Error('useTraining must be used within a TrainingProvider');
  }
  return context;
}

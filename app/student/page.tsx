'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

type Routine = {
  routineName: string;
  goal: string;
  level: string;
  weeks: number;
  daysPerWeek: number;
  sessionMinutes: number;
  days: Day[];
};

type Day = {
  dayName: string;
  blocks: Block[];
};

type Block = {
  blockName: string;
  items: ExerciseItem[];
};

type ExerciseItem = {
  exerciseName: string;
  sets?: number;
  reps?: number | string;
  restSeconds?: number;
  rpeTarget?: number;
  tempo?: string;
  notes?: string;
  alternatives?: string[];
};

type Assignment = {
  id: string;
  routine: Routine;
  trainer: {
    name: string | null;
    email: string;
  };
  createdAt: string;
};

type WorkoutLog = {
  id: string;
  dayName: string;
  completedAt: string;
  rpe?: number;
  soreness?: number;
  comment?: string;
};

function StudentPageContent() {
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId');

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [logData, setLogData] = useState({ rpe: 7, soreness: 5, comment: '' });
  const [logging, setLogging] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!userId) return;

    loadData();
  }, [userId]);

  const loadData = () => {
    setLoading(true);
    fetch(`/api/student/routine?studentId=${userId}`)
      .then((res) => res.json())
      .then((data) => {
        setAssignment(data.assignment);
        setWorkoutLogs(data.workoutLogs);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error loading routine:', error);
        setLoading(false);
      });
  };

  const handleLogWorkout = async (dayName: string) => {
    if (!assignment) return;

    setLogging(true);
    setMessage('');

    try {
      const response = await fetch('/api/workouts/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: userId,
          workoutInput: {
            assignmentId: assignment.id,
            dayName,
            rpe: logData.rpe,
            soreness: logData.soreness,
            comment: logData.comment || undefined,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error registrando entrenamiento');
      }

      setMessage('Entrenamiento registrado exitosamente');
      setSelectedDay(null);
      setLogData({ rpe: 7, soreness: 5, comment: '' });
      loadData();
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLogging(false);
    }
  };

  const getDayCompletions = (dayName: string) => {
    return workoutLogs.filter((log) => log.dayName === dayName);
  };

  const getLastCompletion = (dayName: string) => {
    const completions = getDayCompletions(dayName);
    return completions.length > 0 ? completions[0] : null;
  };

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-600">
          Error: No se especificó el ID del usuario
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">Cargando rutina...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-800 flex items-center gap-2 mb-4"
          >
            ← Volver al inicio
          </Link>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Panel de Alumno
          </h1>
          <p className="text-gray-600">Visualiza y registra tus entrenamientos</p>
        </div>

        {!assignment ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-6xl mb-4">🏋️</div>
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">
              No tienes rutina asignada
            </h2>
            <p className="text-gray-600">
              Tu entrenador aún no te ha asignado una rutina de entrenamiento.
            </p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-3xl font-bold text-gray-800 mb-2">
                    {assignment.routine.routineName}
                  </h2>
                  <div className="flex gap-4 text-sm text-gray-600">
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                      {assignment.routine.goal}
                    </span>
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full">
                      {assignment.routine.level}
                    </span>
                    <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full">
                      {assignment.routine.daysPerWeek}x/semana
                    </span>
                    <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full">
                      {assignment.routine.sessionMinutes} min
                    </span>
                  </div>
                </div>
                <div className="text-right text-sm text-gray-600">
                  <div>Entrenador: {assignment.trainer.name}</div>
                  <div>{assignment.trainer.email}</div>
                </div>
              </div>
            </div>

            {message && (
              <div
                className={`mb-4 p-4 rounded-lg ${
                  message.startsWith('Error')
                    ? 'bg-red-100 text-red-800'
                    : 'bg-green-100 text-green-800'
                }`}
              >
                {message}
              </div>
            )}

            <div className="space-y-6">
              {assignment.routine.days.map((day) => {
                const completions = getDayCompletions(day.dayName);
                const lastCompletion = getLastCompletion(day.dayName);
                const isExpanded = selectedDay === day.dayName;

                return (
                  <div key={day.dayName} className="bg-white rounded-lg shadow">
                    <div
                      className="p-6 cursor-pointer hover:bg-gray-50"
                      onClick={() =>
                        setSelectedDay(isExpanded ? null : day.dayName)
                      }
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-2xl font-semibold text-gray-800">
                            {day.dayName}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {day.blocks.length} bloque(s) de entrenamiento
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-sm font-semibold text-green-600">
                              {completions.length} completados
                            </div>
                            {lastCompletion && (
                              <div className="text-xs text-gray-500">
                                Último:{' '}
                                {new Date(
                                  lastCompletion.completedAt
                                ).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                          <div className="text-2xl text-gray-400">
                            {isExpanded ? '▼' : '▶'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-gray-200 p-6">
                        {day.blocks.map((block, blockIdx) => (
                          <div key={blockIdx} className="mb-6 last:mb-0">
                            <h4 className="text-lg font-semibold text-gray-700 mb-3">
                              {block.blockName}
                            </h4>
                            <div className="space-y-2">
                              {block.items.map((item, itemIdx) => (
                                <div
                                  key={itemIdx}
                                  className="bg-gray-50 p-4 rounded-lg"
                                >
                                  <div className="font-semibold text-gray-800">
                                    {item.exerciseName}
                                  </div>
                                  <div className="text-sm text-gray-600 mt-1 flex flex-wrap gap-3">
                                    {item.sets && <span>Sets: {item.sets}</span>}
                                    {item.reps && <span>Reps: {item.reps}</span>}
                                    {item.restSeconds !== undefined && (
                                      <span>Descanso: {item.restSeconds}s</span>
                                    )}
                                    {item.rpeTarget && (
                                      <span>RPE: {item.rpeTarget}</span>
                                    )}
                                    {item.tempo && <span>Tempo: {item.tempo}</span>}
                                  </div>
                                  {item.notes && (
                                    <div className="text-sm text-gray-600 mt-2 italic">
                                      {item.notes}
                                    </div>
                                  )}
                                  {item.alternatives &&
                                    item.alternatives.length > 0 && (
                                      <div className="text-xs text-gray-500 mt-2">
                                        Alternativas:{' '}
                                        {item.alternatives.join(', ')}
                                      </div>
                                    )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}

                        <div className="mt-6 pt-6 border-t border-gray-200">
                          <h4 className="text-lg font-semibold text-gray-700 mb-3">
                            Registrar entrenamiento
                          </h4>
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                RPE (1-10)
                              </label>
                              <input
                                type="number"
                                value={logData.rpe}
                                onChange={(e) =>
                                  setLogData({
                                    ...logData,
                                    rpe: parseInt(e.target.value),
                                  })
                                }
                                min="1"
                                max="10"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Dolor muscular (1-10)
                              </label>
                              <input
                                type="number"
                                value={logData.soreness}
                                onChange={(e) =>
                                  setLogData({
                                    ...logData,
                                    soreness: parseInt(e.target.value),
                                  })
                                }
                                min="1"
                                max="10"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                              />
                            </div>
                          </div>
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Comentarios (opcional)
                            </label>
                            <textarea
                              value={logData.comment}
                              onChange={(e) =>
                                setLogData({ ...logData, comment: e.target.value })
                              }
                              rows={3}
                              placeholder="¿Cómo te sentiste?"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                          <button
                            onClick={() => handleLogWorkout(day.dayName)}
                            disabled={logging}
                            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition-colors"
                          >
                            {logging ? 'Registrando...' : 'Marcar como completado'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function StudentPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-xl text-gray-600">Cargando...</div>
        </div>
      }
    >
      <StudentPageContent />
    </Suspense>
  );
}

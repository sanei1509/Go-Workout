'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

type Student = {
  id: string;
  email: string;
  name: string | null;
};

type GenerateFormData = {
  goal: string;
  level: string;
  weeks: number;
  daysPerWeek: number;
  sessionMinutes: number;
  equipment: string;
  injuries: string;
  preferences: string;
};

function TrainerPageContent() {
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId');

  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState('');

  const [formData, setFormData] = useState<GenerateFormData>({
    goal: 'HYPERTROPHY',
    level: 'INTERMEDIATE',
    weeks: 4,
    daysPerWeek: 4,
    sessionMinutes: 60,
    equipment: '',
    injuries: '',
    preferences: '',
  });

  useEffect(() => {
    if (!userId) return;

    setLoading(true);
    fetch(`/api/trainer/students?trainerId=${userId}`)
      .then((res) => res.json())
      .then((data) => {
        setStudents(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error loading students:', error);
        setLoading(false);
      });
  }, [userId]);

  const handleGenerateRoutine = async () => {
    if (!userId) return;

    setGenerating(true);
    setMessage('');

    try {
      const equipment = formData.equipment
        ? formData.equipment.split(',').map((e) => e.trim())
        : undefined;
      const injuries = formData.injuries
        ? formData.injuries.split(',').map((i) => i.trim())
        : undefined;

      const response = await fetch('/api/routines/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trainerId: userId,
          generateInput: {
            goal: formData.goal,
            level: formData.level,
            weeks: formData.weeks,
            daysPerWeek: formData.daysPerWeek,
            sessionMinutes: formData.sessionMinutes,
            equipment,
            injuries,
            preferences: formData.preferences || undefined,
          },
          assignInput:
            selectedStudents.length > 0
              ? { studentIds: selectedStudents }
              : undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error generando rutina');
      }

      const result = await response.json();
      setMessage(
        `Rutina "${result.routine.routineName}" generada y asignada a ${result.assignments.length} alumno(s)`
      );
      setSelectedStudents([]);
    } catch (error: any) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const toggleStudent = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
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
            Panel de Entrenador
          </h1>
          <p className="text-gray-600">Genera y asigna rutinas a tus alumnos</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Generar Rutina con IA
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Objetivo
                </label>
                <select
                  value={formData.goal}
                  onChange={(e) =>
                    setFormData({ ...formData, goal: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="STRENGTH">Fuerza</option>
                  <option value="HYPERTROPHY">Hipertrofia</option>
                  <option value="ENDURANCE">Resistencia</option>
                  <option value="WEIGHT_LOSS">Pérdida de peso</option>
                  <option value="GENERAL_FITNESS">Fitness general</option>
                  <option value="SPORT_SPECIFIC">Deporte específico</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nivel
                </label>
                <select
                  value={formData.level}
                  onChange={(e) =>
                    setFormData({ ...formData, level: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="BEGINNER">Principiante</option>
                  <option value="INTERMEDIATE">Intermedio</option>
                  <option value="ADVANCED">Avanzado</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Semanas
                  </label>
                  <input
                    type="number"
                    value={formData.weeks}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        weeks: parseInt(e.target.value),
                      })
                    }
                    min="1"
                    max="16"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Días/semana
                  </label>
                  <input
                    type="number"
                    value={formData.daysPerWeek}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        daysPerWeek: parseInt(e.target.value),
                      })
                    }
                    min="1"
                    max="7"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duración sesión (minutos)
                </label>
                <input
                  type="number"
                  value={formData.sessionMinutes}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sessionMinutes: parseInt(e.target.value),
                    })
                  }
                  min="20"
                  max="180"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Equipamiento disponible (separado por comas)
                </label>
                <input
                  type="text"
                  value={formData.equipment}
                  onChange={(e) =>
                    setFormData({ ...formData, equipment: e.target.value })
                  }
                  placeholder="Ej: Barras, mancuernas, máquinas"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lesiones/Limitaciones (separado por comas)
                </label>
                <input
                  type="text"
                  value={formData.injuries}
                  onChange={(e) =>
                    setFormData({ ...formData, injuries: e.target.value })
                  }
                  placeholder="Ej: Dolor de rodilla, hombro"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preferencias adicionales
                </label>
                <textarea
                  value={formData.preferences}
                  onChange={(e) =>
                    setFormData({ ...formData, preferences: e.target.value })
                  }
                  rows={3}
                  placeholder="Ej: Enfoque en ejercicios compuestos"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <button
                onClick={handleGenerateRoutine}
                disabled={generating}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                {generating ? 'Generando...' : 'Generar Rutina'}
              </button>

              {message && (
                <div
                  className={`p-3 rounded-lg ${
                    message.startsWith('Error')
                      ? 'bg-red-100 text-red-800'
                      : 'bg-green-100 text-green-800'
                  }`}
                >
                  {message}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Mis Alumnos
            </h2>

            {loading ? (
              <p className="text-gray-600">Cargando alumnos...</p>
            ) : students.length === 0 ? (
              <p className="text-gray-600">No tienes alumnos asignados</p>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-4">
                  Selecciona los alumnos a quienes asignar la rutina generada:
                </p>
                <div className="space-y-2">
                  {students.map((student) => (
                    <div
                      key={student.id}
                      onClick={() => toggleStudent(student.id)}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedStudents.includes(student.id)
                          ? 'bg-blue-50 border-blue-500'
                          : 'bg-white border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student.id)}
                          onChange={() => {}}
                          className="w-5 h-5"
                        />
                        <div>
                          <div className="font-semibold text-gray-800">
                            {student.name || 'Sin nombre'}
                          </div>
                          <div className="text-sm text-gray-600">
                            {student.email}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {selectedStudents.length > 0 && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg text-blue-800 text-sm">
                    {selectedStudents.length} alumno(s) seleccionado(s)
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TrainerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-xl text-gray-600">Cargando...</div>
        </div>
      }
    >
      <TrainerPageContent />
    </Suspense>
  );
}

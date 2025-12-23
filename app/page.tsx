'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type User = {
  id: string;
  email: string;
  name: string | null;
  role: 'TRAINER' | 'STUDENT';
};

export default function HomePage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/users')
      .then((res) => res.json())
      .then((data) => {
        setUsers(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error loading users:', error);
        setUsers([]);
        setLoading(false);
      });
  }, []);

  const trainers = users.filter((u) => u.role === 'TRAINER');
  const students = users.filter((u) => u.role === 'STUDENT');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">Go Workout</h1>
          <p className="text-xl text-gray-600">
            Selecciona un usuario para ingresar
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-blue-600 mb-4 flex items-center gap-2">
              <span>👨‍🏫</span>
              Entrenadores
            </h2>
            <div className="space-y-3">
              {trainers.map((trainer) => (
                <Link
                  key={trainer.id}
                  href={`/trainer?userId=${trainer.id}`}
                  className="block p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200"
                >
                  <div className="font-semibold text-gray-800">
                    {trainer.name || 'Sin nombre'}
                  </div>
                  <div className="text-sm text-gray-600">{trainer.email}</div>
                </Link>
              ))}
              {trainers.length === 0 && (
                <p className="text-gray-500 text-center py-4">
                  No hay entrenadores disponibles
                </p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-green-600 mb-4 flex items-center gap-2">
              <span>🎯</span>
              Alumnos
            </h2>
            <div className="space-y-3">
              {students.map((student) => (
                <Link
                  key={student.id}
                  href={`/student?userId=${student.id}`}
                  className="block p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors border border-green-200"
                >
                  <div className="font-semibold text-gray-800">
                    {student.name || 'Sin nombre'}
                  </div>
                  <div className="text-sm text-gray-600">{student.email}</div>
                </Link>
              ))}
              {students.length === 0 && (
                <p className="text-gray-500 text-center py-4">
                  No hay alumnos disponibles
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 text-center text-gray-600 text-sm">
          <p>POC - Proof of Concept</p>
          <p className="mt-1">Arquitectura limpia con Next.js + Prisma + OpenAI</p>
        </div>
      </div>
    </div>
  );
}

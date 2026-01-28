'use client';

import { useEffect, useState } from 'react';

interface Trainer {
  id: string;
  name: string | null;
  email: string;
}

interface Invitation {
  id: string;
  trainerId: string;
  discipline: string;
  planType: string;
  frequency: number;
  message: string | null;
  createdAt: string;
  trainer: Trainer;
}

interface PendingInvitationsProps {
  studentId: string;
}

export function PendingInvitations({ studentId }: PendingInvitationsProps) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInvitations() {
      try {
        const response = await fetch(
          `/api/student/invitations/pending?studentId=${studentId}`
        );

        if (!response.ok) {
          throw new Error('Error al cargar invitaciones');
        }

        const data = await response.json();
        setInvitations(data.invitations);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchInvitations();
  }, [studentId]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Invitaciones Pendientes
        </h2>
        <div className="animate-pulse space-y-3">
          <div className="h-20 bg-gray-200 rounded-lg"></div>
          <div className="h-20 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Invitaciones Pendientes
        </h2>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">
        Invitaciones Pendientes
      </h2>

      {invitations.length === 0 ? (
        <p className="text-gray-500 text-center py-8">
          No tenés invitaciones pendientes
        </p>
      ) : (
        <div className="space-y-4">
          {invitations.map((invitation) => (
            <div
              key={invitation.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-1">
                  <p className="font-semibold text-gray-900">
                    {invitation.trainer.name || invitation.trainer.email}
                  </p>
                  <div className="flex flex-wrap gap-2 text-sm">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                      {invitation.discipline}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-green-100 text-green-800">
                      {invitation.planType}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800">
                      {invitation.frequency}x/semana
                    </span>
                  </div>
                  {invitation.message && (
                    <p className="text-sm text-gray-600 mt-2">
                      {invitation.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

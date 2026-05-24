// Orquesta la conversación con el agente y la confirmación de propuestas.
//
// Flujo:
//   1. El alumno envía un mensaje -> se agrega al historial -> se manda al backend.
//   2. El backend responde con texto + propuestas (rutinas/planes a confirmar).
//   3. El alumno confirma una propuesta -> se ejecuta contra los servicios (Supabase).
//
// El backend es stateless (igual que la Messages API): se le manda todo el historial
// en cada turno. Acá guardamos ese historial en estado local.

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getUserPlans } from '@/lib/services/planService';
import { getRoutinesByPlan } from '@/lib/services/routineService';
import { getAgentBackend } from './backend';
import { executePlanProposal, executeRoutineProposal } from './tools';
import type {
  AgentActivePlan,
  AgentProposal,
  AgentUserContext,
  ChatMessage,
  PlanProposal,
  ProposalStatus,
  RoutineProposal,
} from './types';

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function getTodayContext(): AgentUserContext['today'] {
  const d = new Date();
  const jsDay = d.getDay(); // 0=Dom
  return {
    dayNumber: jsDay === 0 ? 7 : jsDay,
    dayName: DAY_NAMES[jsDay],
    date: d.toISOString().split('T')[0],
  };
}

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const GREETING: ChatMessage = {
  id: 'greeting',
  role: 'assistant',
  text: '¡Hola! Soy tu entrenador de GO Workout. Puedo responder dudas, guiarte y armarte planes o rutinas. ¿Qué querés entrenar hoy?',
  createdAt: new Date().toISOString(),
};

export function useAgentChat() {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Estado de confirmación por proposalId.
  const [proposalStatus, setProposalStatus] = useState<Record<string, ProposalStatus>>({});

  // Contexto del alumno (planes activos) que se manda al backend.
  const [context, setContext] = useState<AgentUserContext | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    const buildContext = async () => {
      const { plans } = await getUserPlans(user.id);
      if (cancelled) return;

      const activePlans: AgentActivePlan[] = await Promise.all(
        plans.map(async (plan) => {
          const { routines } = await getRoutinesByPlan(plan.id);
          return {
            id: plan.id,
            name: plan.name,
            discipline: plan.discipline,
            training_days: plan.training_days ?? [],
            routines: routines.map((r) => ({
              id: r.id,
              name: r.name,
              day_number: r.day_number,
            })),
          };
        })
      );

      if (cancelled) return;
      setContext({
        userId: user.id,
        displayName: profile?.full_name ?? undefined,
        today: getTodayContext(),
        activePlans,
      });
    };

    buildContext();
    return () => { cancelled = true; };
  }, [user?.id, profile?.full_name]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isSending || !context) return;
      setError(null);

      const userMsg: ChatMessage = {
        id: uid(),
        role: 'user',
        text: trimmed,
        createdAt: new Date().toISOString(),
      };
      const history = [...messages, userMsg];
      setMessages(history);
      setIsSending(true);

      try {
        const res = await getAgentBackend().send({ messages: history, context });
        const assistantMsg: ChatMessage = {
          id: uid(),
          role: 'assistant',
          text: res.text,
          proposals: res.proposals,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
        // Marcar las propuestas nuevas como pendientes.
        if (res.proposals.length > 0) {
          setProposalStatus((prev) => {
            const next = { ...prev };
            for (const p of res.proposals) next[p.proposalId] = 'pending';
            return next;
          });
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al contactar al entrenador');
      } finally {
        setIsSending(false);
      }
    },
    [messages, isSending, context]
  );

  // Confirma una propuesta: la escribe en Supabase vía los servicios.
  const confirmProposal = useCallback(
    async (proposal: AgentProposal): Promise<{ ok: boolean; routeId?: string }> => {
      if (!user?.id) return { ok: false };
      setProposalStatus((prev) => ({ ...prev, [proposal.proposalId]: 'creating' }));

      try {
        if (proposal.kind === 'plan') {
          const { planId, error } = await executePlanProposal(user.id, proposal as PlanProposal);
          if (error || !planId) throw error ?? new Error('No se pudo crear el plan');
          setProposalStatus((prev) => ({ ...prev, [proposal.proposalId]: 'created' }));
          // refrescar contexto con el nuevo plan
          setContext((prev) =>
            prev
              ? {
                  ...prev,
                  activePlans: [
                    {
                      id: planId,
                      name: proposal.data.name,
                      discipline: proposal.data.discipline,
                      training_days: proposal.data.training_days ?? [],
                      routines: [],
                    },
                    ...prev.activePlans,
                  ],
                }
              : prev
          );
          return { ok: true, routeId: planId };
        }

        // rutina: resolver el plan destino (el de la propuesta o el activo)
        const routine = proposal as RoutineProposal;
        const resolvedPlanId = routine.planId ?? context?.activePlans[0]?.id;
        if (!resolvedPlanId) {
          throw new Error('Primero necesitás un plan activo para crear la rutina.');
        }
        const { routineId, error } = await executeRoutineProposal(routine, resolvedPlanId);
        if (error || !routineId) throw error ?? new Error('No se pudo crear la rutina');
        setProposalStatus((prev) => ({ ...prev, [proposal.proposalId]: 'created' }));
        return { ok: true, routeId: routineId };
      } catch (e) {
        setProposalStatus((prev) => ({ ...prev, [proposal.proposalId]: 'error' }));
        setError(e instanceof Error ? e.message : 'Error al crear');
        return { ok: false };
      }
    },
    [user?.id, context]
  );

  return {
    messages,
    isSending,
    error,
    proposalStatus,
    canSend: Boolean(context),
    sendMessage,
    confirmProposal,
  };
}

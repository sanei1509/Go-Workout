// Variante del chat del agente para el ENTRENADOR: el contexto describe al
// alumno seleccionado (formulario + planes asignados) y las propuestas
// confirmadas se crean con user_id = alumno y trainer_id = entrenador.
//
// Misma orquestación stateless que useAgentChat; separado a propósito para no
// acoplar el flujo estable del alumno (patrón del repo).

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getPlansAssignedByTrainer } from '@/lib/services/planService';
import { getRoutinesByPlan } from '@/lib/services/routineService';
import { getStudentForm, TrainerStudent } from '@/lib/services/trainerService';
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
  const jsDay = d.getDay();
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
  text: 'Elegí un alumno arriba y armamos su programación juntos: planes, rutinas, progresiones. ¿Por dónde arrancamos?',
  createdAt: new Date().toISOString(),
};

export function useTrainerAgentChat(selectedStudent: TrainerStudent | null) {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proposalStatus, setProposalStatus] = useState<Record<string, ProposalStatus>>({});
  const [context, setContext] = useState<AgentUserContext | null>(null);

  useEffect(() => {
    if (!user?.id || !selectedStudent) {
      setContext(null);
      return;
    }
    let cancelled = false;

    const buildContext = async () => {
      const [{ plans }, { form }] = await Promise.all([
        getPlansAssignedByTrainer(user.id, selectedStudent.student_id),
        getStudentForm(selectedStudent.invitation_id),
      ]);
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

      const facts: string[] = [`disciplina: ${selectedStudent.discipline}`];
      if (form?.age) facts.push(`${form.age} años`);
      if (form?.weight) facts.push(`${form.weight} kg`);
      if (form?.height) facts.push(`${form.height} cm`);
      if (form?.experience) facts.push(`experiencia: ${form.experience}`);
      if (form?.goals) facts.push(`objetivos: ${form.goals}`);
      if (form?.injuries) facts.push(`lesiones a cuidar: ${form.injuries}`);
      if (form?.diseases) facts.push(`condiciones de salud: ${form.diseases}`);

      setContext({
        userId: selectedStudent.student_id,
        displayName: profile?.full_name ?? undefined,
        today: getTodayContext(),
        activePlans,
        role: 'trainer',
        student: {
          name: selectedStudent.full_name,
          facts: facts.join(', '),
        },
      });
    };

    buildContext();
    return () => { cancelled = true; };
  }, [user?.id, profile?.full_name, selectedStudent]);

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
        if (res.proposals.length > 0) {
          setProposalStatus((prev) => {
            const next = { ...prev };
            for (const p of res.proposals) next[p.proposalId] = 'pending';
            return next;
          });
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al contactar al asistente');
      } finally {
        setIsSending(false);
      }
    },
    [messages, isSending, context]
  );

  // Confirma una propuesta: se crea para el ALUMNO con trainer_id del entrenador.
  const confirmProposal = useCallback(
    async (proposal: AgentProposal): Promise<{ ok: boolean; routeId?: string }> => {
      if (!user?.id || !selectedStudent) return { ok: false };
      setProposalStatus((prev) => ({ ...prev, [proposal.proposalId]: 'creating' }));

      try {
        if (proposal.kind === 'plan') {
          const withTrainer: PlanProposal = {
            ...proposal,
            data: { ...proposal.data, trainer_id: user.id },
          };
          const { planId, error } = await executePlanProposal(
            selectedStudent.student_id,
            withTrainer
          );
          if (error || !planId) throw error ?? new Error('No se pudo crear el plan');
          setProposalStatus((prev) => ({ ...prev, [proposal.proposalId]: 'created' }));
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

        const routine = proposal as RoutineProposal;
        const resolvedPlanId = routine.planId ?? context?.activePlans[0]?.id;
        if (!resolvedPlanId) {
          throw new Error('Primero asignale un plan al alumno (o pedime que lo proponga).');
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
    [user?.id, selectedStudent, context]
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

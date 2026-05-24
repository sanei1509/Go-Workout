// Contrato del agente entrenador. La app habla SIEMPRE con un AgentBackend;
// nunca con Anthropic directo. El backend (Edge Function) guarda la ANTHROPIC_API_KEY,
// el system prompt y las tool definitions, y corre el loop de tool use con Claude.
// El cliente solo: envía el historial, ejecuta/propone tools, y muestra resultados.

import type { CreatePlanData } from '@/lib/services/planService';
import type { BlockType, ExerciseType } from '@/lib/services/routineService';

// ─── Mensajes del chat ─────────────────────────────────────────────────────

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  // Propuestas que el agente adjuntó a este turno (rutinas/planes a confirmar).
  proposals?: AgentProposal[];
  createdAt: string;
}

// ─── Propuestas (lo que el agente quiere crear, pendiente de confirmación) ───

export type AgentProposal = PlanProposal | RoutineProposal;

export interface PlanProposal {
  kind: 'plan';
  // id local para trackear el estado de confirmación en la UI
  proposalId: string;
  data: CreatePlanData;
}

export interface ProposedExercise {
  name: string;
  exercise_type: ExerciseType;
  sets: number;
  value: number;
  rest_seconds: number;
  notes?: string;
}

export interface ProposedBlock {
  block_type: BlockType;
  exercises: ProposedExercise[];
}

export interface RoutineProposal {
  kind: 'routine';
  proposalId: string;
  // Sobre qué plan se crea la rutina. Si el agente no lo sabe, el cliente
  // lo resuelve al confirmar (plan activo del alumno).
  planId?: string;
  name: string;
  day_number: number;
  notes?: string;
  blocks: ProposedBlock[];
}

// ─── Estado de confirmación de una propuesta ─────────────────────────────────

export type ProposalStatus = 'pending' | 'creating' | 'created' | 'error';

// ─── El backend que abstrae al proveedor (Claude vía Edge Function, o mock) ──

export interface AgentRequest {
  // Historial completo de la conversación (el backend es stateless, igual que
  // la Messages API: se manda todo el historial en cada turno).
  messages: ChatMessage[];
  // Contexto del alumno que el backend inyecta en el prompt (no secreto).
  context: AgentUserContext;
}

export interface AgentUserContext {
  userId: string;
  displayName?: string;
  // Planes activos del alumno, para que el agente sepa sobre qué construir.
  activePlans: { id: string; name: string; discipline: string }[];
}

export interface AgentResponse {
  text: string;
  proposals: AgentProposal[];
}

export interface AgentBackend {
  send(request: AgentRequest): Promise<AgentResponse>;
}

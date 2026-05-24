// Implementaciones del AgentBackend.
//
//  - MockAgentBackend: responde local, sin red ni API key. Sirve para construir y
//    probar toda la UI/flujo del chat antes de tener el backend. Simula que el
//    "modelo" propone un plan o una rutina según palabras clave del mensaje.
//
//  - HttpAgentBackend: el backend real. Hace POST a una Edge Function de Supabase
//    (o cualquier endpoint) que guarda la ANTHROPIC_API_KEY, corre el loop de tool
//    use con Claude (claude-opus-4-7, thinking adaptativo) y devuelve {text, proposals}.
//    Ver docs/agent-edge-function.md para el código del servidor.
//
// Para cambiar de mock a real, solo se reemplaza qué backend devuelve getAgentBackend().

import { supabase } from '@/lib/supabase';
import type {
  AgentBackend,
  AgentRequest,
  AgentResponse,
  AgentProposal,
} from './types';

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Mock ────────────────────────────────────────────────────────────────────

export class MockAgentBackend implements AgentBackend {
  async send(request: AgentRequest): Promise<AgentResponse> {
    // Latencia simulada para ver el indicador de "escribiendo".
    await new Promise((r) => setTimeout(r, 700));

    const last = [...request.messages].reverse().find((m) => m.role === 'user');
    const text = (last?.text ?? '').toLowerCase();
    const proposals: AgentProposal[] = [];

    if (/\bplan\b|programa|empezar|arranc/.test(text)) {
      proposals.push({
        kind: 'plan',
        proposalId: uid(),
        data: { name: 'Hipertrofia 4 días', discipline: 'Musculación', weekly_frequency: 4 },
      });
      return {
        text: 'Te dejo propuesto un plan de Musculación de 4 días por semana. Si te sirve, tocá "Crear plan" y lo armo. ¿Querés que ajuste la frecuencia o la disciplina?',
        proposals,
      };
    }

    if (/rutina|pierna|pecho|espalda|entren/.test(text)) {
      const firstPlan = request.context.activePlans[0];
      proposals.push({
        kind: 'routine',
        proposalId: uid(),
        planId: firstPlan?.id,
        name: 'Pierna - Fuerza',
        day_number: 1,
        blocks: [
          {
            block_type: 'warmup',
            exercises: [
              { name: 'Bicicleta', exercise_type: 'time', sets: 1, value: 300, rest_seconds: 0 },
            ],
          },
          {
            block_type: 'main',
            exercises: [
              { name: 'Sentadilla', exercise_type: 'reps', sets: 4, value: 6, rest_seconds: 150 },
              { name: 'Peso muerto rumano', exercise_type: 'reps', sets: 3, value: 8, rest_seconds: 120 },
            ],
          },
          {
            block_type: 'accessory',
            exercises: [
              { name: 'Prensa', exercise_type: 'reps', sets: 3, value: 12, rest_seconds: 90 },
              { name: 'Gemelos de pie', exercise_type: 'reps', sets: 4, value: 15, rest_seconds: 60 },
            ],
          },
        ],
      });
      return {
        text: 'Armé una rutina de pierna enfocada en fuerza. Revisala abajo y confirmá si te gusta. ¿Querés que sume un bloque de movilidad al final?',
        proposals,
      };
    }

    return {
      text: '¡Dale! Contame qué buscás: ¿armamos un plan nuevo, una rutina puntual, o tenés una duda de entrenamiento? Decime también tu nivel y cuántos días por semana podés entrenar.',
      proposals,
    };
  }
}

// ─── Edge Function de Supabase ─────────────────────────────────────────────

// Llama a la función `coach` vía supabase.functions.invoke, que adjunta el token
// de sesión del alumno y resuelve la URL automáticamente. La ANTHROPIC_API_KEY
// vive como secreto del proyecto Supabase, nunca en el cliente.
export class SupabaseFunctionBackend implements AgentBackend {
  constructor(private readonly functionName = 'coach') {}

  async send(request: AgentRequest): Promise<AgentResponse> {
    const { data, error } = await supabase.functions.invoke<AgentResponse & { error?: string }>(
      this.functionName,
      { body: request }
    );
    if (error) throw new Error(error.message || 'No se pudo contactar al entrenador');
    if (data?.error) throw new Error(data.error);
    if (!data) throw new Error('Respuesta vacía del entrenador');
    return { text: data.text, proposals: data.proposals ?? [] };
  }
}

// ─── HTTP directo (server local de desarrollo) ─────────────────────────────

// Pega a un endpoint HTTP plano (la Edge Function corriendo localmente con Deno).
// Útil para probar el agente real sin desplegar a Supabase. En emulador Android,
// el host de la Mac es 10.0.2.2.
export class HttpAgentBackend implements AgentBackend {
  constructor(private readonly endpoint: string) {}

  async send(request: AgentRequest): Promise<AgentResponse> {
    const res = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!res.ok) throw new Error(`Agente: error ${res.status}`);
    const data = (await res.json()) as AgentResponse & { error?: string };
    if (data.error) throw new Error(data.error);
    return { text: data.text, proposals: data.proposals ?? [] };
  }
}

// ─── Selección del backend activo ─────────────────────────────────────────────

// Controlado por env (EXPO_PUBLIC_AGENT_MODE):
//   'http'     -> server local (EXPO_PUBLIC_AGENT_ENDPOINT)
//   'supabase' -> Edge Function desplegada
//   (otro)     -> mock (desarrollo de UI sin gastar tokens)
let cached: AgentBackend | null = null;

export function getAgentBackend(): AgentBackend {
  if (!cached) {
    const mode = process.env.EXPO_PUBLIC_AGENT_MODE;
    if (mode === 'http') {
      const url = process.env.EXPO_PUBLIC_AGENT_ENDPOINT || 'http://10.0.2.2:8000';
      cached = new HttpAgentBackend(url);
    } else if (mode === 'supabase') {
      cached = new SupabaseFunctionBackend();
    } else {
      cached = new MockAgentBackend();
    }
  }
  return cached;
}

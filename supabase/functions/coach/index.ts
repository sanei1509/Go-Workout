// Edge Function del agente entrenador — usa Google Gemini (free tier permanente).
//
// Guarda la GEMINI_API_KEY como secreto del proyecto y llama a la REST API de Gemini.
// La app (cliente) NUNCA ve la key: solo hace POST acá con { messages, context } y
// recibe { text, proposals } — el mismo contrato de lib/agent/types.ts.
//
// El proveedor está abstraído: si más adelante querés volver a Claude, solo se
// reescribe esta función; el cliente/tools/UI no cambian.
//
// Deploy:
//   supabase secrets set GEMINI_API_KEY=...     (de Google AI Studio, free tier)
//   supabase functions deploy coach

const GEMINI_MODEL = "gemini-2.5-flash"; // free tier: ~10 RPM, 500 RPD, function calling
const GEMINI_URL =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// ─── Tipos del request (espejo de lib/agent/types.ts) ───────────────────────

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}
interface AgentPlanRoutine {
  id: string;
  name: string;
  day_number: number;
}
interface AgentActivePlan {
  id: string;
  name: string;
  discipline: string;
  training_days: number[];
  routines: AgentPlanRoutine[];
}
interface AgentUserContext {
  userId: string;
  displayName?: string;
  today: { dayNumber: number; dayName: string; date: string };
  activePlans: AgentActivePlan[];
}
interface AgentRequest {
  messages: ChatMessage[];
  context: AgentUserContext;
}

// ─── System prompt (espejo de lib/agent/prompt.ts) ───────────────────────────

const COACH_SYSTEM_PROMPT = `Sos el entrenador personal de GO Workout, una app de entrenamiento. Hablás en español rioplatense, con voz cercana, motivadora y profesional. Tu rol es conversar con el alumno, guiarlo, responder sus dudas sobre entrenamiento, y ayudarlo a armar planes y rutinas.

PRINCIPIOS:
- Sé concreto y directo. Evitá respuestas largas cuando una corta alcanza.
- Hacé preguntas cuando falte información clave (nivel, objetivo, días disponibles, lesiones) antes de proponer una rutina o plan. No inventes datos del alumno.
- Adaptá las recomendaciones al nivel y objetivo de la persona. Sé prudente con cargas y volumen.
- Si el alumno menciona dolor o lesión, recomendá precaución y, si es serio, consultar a un profesional de la salud.

USO DE HERRAMIENTAS:
- Tenés dos herramientas: propose_plan (proponer un plan de entrenamiento) y propose_routine (proponer una rutina con bloques y ejercicios).
- Usalas SOLO cuando tengas información suficiente para una propuesta concreta y útil. Si no, primero preguntá.
- Cuando proponés algo, el alumno verá una tarjeta y decidirá si lo crea. NO afirmes que ya creaste nada: decí que se lo dejás propuesto para que confirme.
- Para rutinas, organizá los ejercicios en bloques con sentido: calentamiento (warmup) primero, después el bloque principal (main), accesorios (accessory), y al final cardio o movilidad si corresponde.
- Usá descansos realistas: 60-120s para hipertrofia, 120-180s para fuerza, 30-60s para resistencia/circuitos.

Respondé siempre en español.`;

const WEEKDAY_NAMES = ["", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];

function buildUserContextBlock(ctx: AgentUserContext): string {
  const name = ctx.displayName ? `El alumno se llama ${ctx.displayName}.` : "";
  const todayStr = `Hoy es ${ctx.today.dayName} (día ${ctx.today.dayNumber}, ${ctx.today.date}).`;

  if (ctx.activePlans.length === 0) {
    return `[Contexto del alumno] ${name} ${todayStr} El alumno no tiene planes activos. Si quiere una rutina, conviene proponer primero un plan.`;
  }

  const plansDesc = ctx.activePlans.map((plan) => {
    const trainingDayNames = (plan.training_days ?? [])
      .sort((a, b) => a - b)
      .map((d) => WEEKDAY_NAMES[d] ?? `día ${d}`)
      .join(", ");

    const routinesDesc = (plan.routines ?? [])
      .sort((a, b) => a.day_number - b.day_number)
      .map((r) => `    • ${WEEKDAY_NAMES[r.day_number] ?? `día ${r.day_number}`}: "${r.name}"`)
      .join("\n");

    const todayDay = ctx.today.dayNumber;
    const todayRoutine = plan.routines?.find((r) => r.day_number === todayDay);
    const isTrainingDay = plan.training_days?.includes(todayDay);

    // Próximo día de entrenamiento (diferente a hoy)
    let nextInfo = "";
    for (let i = 1; i <= 7; i++) {
      const checkDay = ((todayDay - 1 + i) % 7) + 1;
      if (plan.training_days?.includes(checkDay) && checkDay !== todayDay) {
        const nextRoutine = plan.routines?.find((r) => r.day_number === checkDay);
        nextInfo = `Próximo entrenamiento: ${WEEKDAY_NAMES[checkDay]}${nextRoutine ? ` → "${nextRoutine.name}"` : " (sin rutina asignada aún)"}`;
        break;
      }
    }

    const todayStatus = isTrainingDay
      ? (todayRoutine
          ? `HOY toca entrenar → rutina: "${todayRoutine.name}"`
          : "HOY es día de entrenamiento pero aún no tiene rutina asignada.")
      : "Hoy es día de descanso para este plan.";

    return `Plan "${plan.name}" (${plan.discipline}, id=${plan.id}):
  - Días de entrenamiento: ${trainingDayNames || "no definidos"}
  - Rutinas:\n${routinesDesc || "    (sin rutinas cargadas aún)"}
  - ${todayStatus}
  - ${nextInfo}`;
  }).join("\n\n");

  return `[Contexto del alumno] ${name} ${todayStr}\n\n${plansDesc}`;
}

// ─── Tool/function declarations (formato Gemini) ─────────────────────────────

const BLOCK_TYPES = ["warmup", "main", "accessory", "cardio", "mobility"];
const EXERCISE_TYPES = ["reps", "time", "distance"];

const FUNCTION_DECLARATIONS = [
  {
    name: "propose_plan",
    description:
      "Propone un nuevo plan de entrenamiento para el alumno. Un plan agrupa rutinas por disciplina y frecuencia semanal. Usá esta tool cuando el alumno quiera empezar un programa nuevo. El plan se mostrará al alumno para que confirme antes de crearse.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: 'Nombre del plan, ej. "Hipertrofia 4 días"' },
        discipline: { type: "string", description: "Disciplina: Musculación, Crossfit, Calistenia, etc." },
        weekly_frequency: { type: "integer", description: "Días por semana (1-7)" },
        training_days: {
          type: "array",
          description: "Días de la semana (1=lunes ... 7=domingo). Opcional.",
          items: { type: "integer" },
        },
      },
      required: ["name", "discipline", "weekly_frequency"],
    },
  },
  {
    name: "propose_routine",
    description:
      "Propone una rutina (un día de entrenamiento) con bloques y ejercicios. Organizá los ejercicios en bloques por tipo. La rutina se mostrará al alumno para confirmar antes de crearse.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: 'Nombre de la rutina, ej. "Pierna - Fuerza"' },
        day_number: { type: "integer", description: "Número de día dentro del plan (1, 2, 3...)." },
        notes: { type: "string", description: "Notas generales. Opcional." },
        blocks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              block_type: { type: "string", enum: BLOCK_TYPES },
              exercises: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    exercise_type: { type: "string", enum: EXERCISE_TYPES },
                    sets: { type: "integer" },
                    value: { type: "integer", description: "Reps, segundos o metros según exercise_type" },
                    rest_seconds: { type: "integer" },
                    notes: { type: "string" },
                  },
                  required: ["name", "exercise_type", "sets", "value", "rest_seconds"],
                },
              },
            },
            required: ["block_type", "exercises"],
          },
        },
      },
      required: ["name", "day_number", "blocks"],
    },
  },
];

// ─── Handler ─────────────────────────────────────────────────────────────────

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const { messages, context }: AgentRequest = await req.json();
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("Falta GEMINI_API_KEY en el servidor");

    // Mapear historial al formato Gemini: el contexto del alumno como primer turno
    // de usuario, y "assistant" -> "model".
    const contents = [
      { role: "user", parts: [{ text: buildUserContextBlock(context) }] },
      ...messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.text }],
      })),
    ];

    const body = {
      systemInstruction: { parts: [{ text: COACH_SYSTEM_PROMPT }] },
      contents,
      tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }],
    };

    const res = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Gemini ${res.status}: ${detail.slice(0, 200)}`);
    }

    const data = await res.json();
    const parts = data?.candidates?.[0]?.content?.parts ?? [];

    let text = "";
    // deno-lint-ignore no-explicit-any
    const proposals: any[] = [];
    let i = 0;

    for (const part of parts) {
      if (part.text) {
        text += part.text;
      } else if (part.functionCall) {
        const args = part.functionCall.args ?? {};
        const proposalId = part.functionCall.id ?? `gemini-${Date.now()}-${i++}`;
        if (part.functionCall.name === "propose_plan") {
          proposals.push({ kind: "plan", proposalId, data: args });
        } else if (part.functionCall.name === "propose_routine") {
          proposals.push({
            kind: "routine",
            proposalId,
            planId: context.activePlans[0]?.id,
            ...args,
          });
        }
      }
    }

    // Si el modelo solo llamó a una función sin texto, damos un mensaje por defecto.
    if (!text && proposals.length > 0) {
      text = proposals[0].kind === "plan"
        ? "Te dejé un plan propuesto abajo. Revisalo y confirmá si te sirve."
        : "Te armé una rutina abajo. Revisala y confirmá si te gusta.";
    }

    return new Response(JSON.stringify({ text, proposals }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error del agente";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});

# Backend del agente entrenador (Supabase Edge Function + Gemini)

El cliente (app Expo) **nunca** habla con el proveedor de IA directo: la API key viviría
en la app y cualquiera podría extraerla del APK. En su lugar, la app hace `POST` a esta
Edge Function, que guarda la key como secreto del proyecto y llama a la IA.

**Proveedor: Google Gemini** (`gemini-2.5-flash`), elegido por tener **free tier
permanente** (sin tarjeta, ~10 req/min, 500 req/día, con function calling) — ideal para
un MVP. El proveedor está abstraído detrás de `AgentBackend`, así que migrar a Claude u
otro solo implica reescribir esta función; el cliente/tools/UI no cambian.

Estado: la app usa `MockAgentBackend` por defecto. Para activar Gemini real, seguí los
pasos de abajo y poné `EXPO_PUBLIC_USE_AGENT_BACKEND=true`.

## 1. Crear la API key de Gemini (gratis)

1. Andá a https://aistudio.google.com/apikey (Google AI Studio) con tu cuenta Google.
2. "Create API key" → copiala. **No requiere tarjeta de crédito.**
3. Guardala como secreto de Supabase (NO en el `.env` del cliente):
   ```sh
   supabase secrets set GEMINI_API_KEY=...
   ```

## 2. Instalar el Supabase CLI

```sh
brew install supabase/tap/supabase   # ya tenés Deno instalado
supabase login
supabase link --project-ref oydiorqnrwvfzldnayvq
```

## 3. La función

Ya está escrita en `supabase/functions/coach/index.ts`. Contrato: recibe
`{ messages, context }` (ver `lib/agent/types.ts`), devuelve `{ text, proposals }`.
Llama a la REST API de Gemini con `systemInstruction` + `contents` + `tools`
(functionDeclarations). El system prompt y las tools se mantienen en sincronía con
`lib/agent/prompt.ts` y `lib/agent/tools.ts`.

## 4. Deploy

```sh
supabase functions deploy coach
```

La URL queda `https://oydiorqnrwvfzldnayvq.functions.supabase.co/coach`, pero el cliente
la invoca con `supabase.functions.invoke('coach')` (adjunta token + URL solo).

## 5. Activar en la app

En el `.env` del cliente:
```
EXPO_PUBLIC_USE_AGENT_BACKEND=true
```
Reiniciar Expo. El cliente (`lib/agent/backend.ts`) ya usa `SupabaseFunctionBackend`
cuando ese flag está en `true`.

## Notas

- Las tools solo *proponen* (la creación la confirma el cliente), así que una sola
  llamada a Gemini alcanza — no hace falta el ciclo de function results.
- Free tier de Gemini: ~500 req/día. Para un MVP de bajo tráfico sobra; si escalás,
  Google pide habilitar billing (igual es barato).
- Para volver a Claude: reescribir solo esta función usando el SDK de Anthropic
  (`claude-opus-4-7` o `claude-haiku-4-5`), guardando `ANTHROPIC_API_KEY` como secreto.

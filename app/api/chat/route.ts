import { createGroq } from '@ai-sdk/groq'
import { streamText, type CoreMessage } from 'ai'
import { SYSTEM_PROMPT } from '@/lib/prompt'

/*
 * Node runtime, deliberately — not edge.
 *
 * Next.js INLINES `process.env.*` at build time for the edge runtime. If the
 * variable is missing when the bundle is compiled, or a redeploy reuses a
 * cached build, the value is baked in as `undefined` and setting it in the
 * dashboard afterwards changes nothing no matter how often you redeploy.
 *
 * The node runtime reads the environment per request, so adding the variable
 * and redeploying always takes effect. Groq is fast enough that the extra cold
 * start costs far less than an environment variable that silently never lands.
 */
export const runtime = 'nodejs'
export const maxDuration = 30
// The key must never be captured at build time or baked into a cached response.
export const dynamic = 'force-dynamic'

/** Cap history so a long session can't grow the request without bound. */
const MAX_MESSAGES = 24

/** Non-secret diagnostics: enough to tell the failure modes apart, no values. */
function keyDiagnosis() {
  const raw = process.env.GROQ_API_KEY
  if (raw === undefined) return 'the variable is not defined at all'
  if (raw.trim() === '') return 'the variable is defined but empty'
  if (raw.trim() !== raw) return 'the value has leading or trailing whitespace — re-paste it'
  if (!raw.startsWith('gsk_')) return `the value does not look like a Groq key (starts with "${raw.slice(0, 4)}")`
  return null
}

export async function POST(req: Request) {
  const problem = keyDiagnosis()
  if (problem) {
    // The fix differs by environment, and pointing at the wrong one sends people
    // hunting through local files for a variable that has to be set on the host.
    const where =
      process.env.NODE_ENV === 'production'
        ? 'Add GROQ_API_KEY under Settings → Environment Variables (tick Production), then redeploy with "Use existing build cache" turned OFF.'
        : 'Add GROQ_API_KEY to .env.local and restart the dev server.'
    return new Response(JSON.stringify({ error: `${where} Right now ${problem}.` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let messages: CoreMessage[]
  try {
    const body = await req.json()
    messages = Array.isArray(body?.messages) ? body.messages : []
  } catch {
    return new Response(JSON.stringify({ error: 'Malformed request body.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (messages.length === 0) {
    return new Response(JSON.stringify({ error: 'No messages provided.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Built per request so the key is read from the live environment, never
  // captured once at module load.
  const groq = createGroq({ apiKey: process.env.GROQ_API_KEY!.trim() })

  /*
   * Groq retired `llama-3.3-70b-versatile`; it no longer appears in
   * GET /openai/v1/models, so every request 404'd. gpt-oss-120b is the
   * strongest chat model still served, and the only one of the survivors that
   * keeps its chain of thought out of `content` — qwen3.6-27b streams a raw
   * `<think>` block into the message body, which would render verbatim in the
   * chat and break marker parsing.
   *
   * `reasoningFormat: 'hidden'` drops the thinking from the response entirely.
   * It is still *generated*, and those tokens count against maxTokens — hence
   * the larger budget below for the same ~900-token visible reply.
   */
  const result = streamText({
    model: groq('openai/gpt-oss-120b'),
    providerOptions: { groq: { reasoningFormat: 'hidden' } },
    system: SYSTEM_PROMPT,
    messages: messages.slice(-MAX_MESSAGES),
    temperature: 0.7,
    maxTokens: 1400,
  })

  /*
   * streamText fails INSIDE the stream, not by throwing — a try/catch around
   * it never fires. By default those failures reach the client as the opaque
   * string "An error occurred.", which is undebuggable in production.
   *
   * Log the real reason server-side and pass a usable summary to the client.
   */
  return result.toDataStreamResponse({
    getErrorMessage: (error) => {
      const detail = error instanceof Error ? error.message : String(error)
      console.error('[api/chat] stream failed:', detail)
      if (/api key|unauthor|401|invalid_api_key/i.test(detail)) {
        return 'Groq rejected the API key. If it was rotated, update GROQ_API_KEY and redeploy.'
      }
      if (/rate limit|429/i.test(detail)) {
        return 'Groq is rate limiting right now. Give it a moment and try again.'
      }
      if (/model|decommission|not found|404/i.test(detail)) {
        return 'The configured Groq model is unavailable. Check the model id in app/api/chat/route.ts.'
      }
      return `Something went wrong talking to Groq: ${detail}`
    },
  })
}

import { createGroq } from '@ai-sdk/groq'
import { streamText, type CoreMessage } from 'ai'
import { buildSystemPrompt } from '@/lib/prompt'
import { getPortfolio } from '@/lib/portfolio'

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
/** Longest visitor message, longest earlier AI reply, and the most text one request may carry. */
const MAX_MESSAGE_CHARS = 2000
const MAX_REPLY_CHARS = 8000
const MAX_TOTAL_CHARS = 48000
/** Raw body cap, checked before parsing. */
const MAX_BODY_BYTES = 64 * 1024

/*
 * Per-visitor rate limit: 20 requests in 10 minutes per IP. It lives in this
 * instance's memory, so it slows a script hitting one warm instance but is not
 * a hard global cap. A Vercel Firewall rate-limit rule on /api/chat is the
 * stronger layer.
 */
const RATE_LIMIT = 20
const RATE_WINDOW_MS = 10 * 60 * 1000
const hits = new Map<string, number[]>()

function rateLimited(ip: string) {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS)
  if (recent.length >= RATE_LIMIT) {
    hits.set(ip, recent)
    return true
  }
  recent.push(now)
  hits.set(ip, recent)
  if (hits.size > 5000) {
    for (const [key, times] of hits) if (times.every((t) => now - t >= RATE_WINDOW_MS)) hits.delete(key)
  }
  return false
}

function json(body: unknown, status: number, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...extra } })
}

/** Keeps only user and assistant turns with plain text, so no system or tool messages get through. */
function cleanMessages(input: unknown): CoreMessage[] | null {
  if (!Array.isArray(input)) return null
  const out: CoreMessage[] = []
  let total = 0
  for (const m of input.slice(-MAX_MESSAGES)) {
    const role = m?.role
    const content = m?.content
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string') return null
    if (content.length > (role === 'user' ? MAX_MESSAGE_CHARS : MAX_REPLY_CHARS)) return null
    total += content.length
    out.push({ role, content })
  }
  if (total > MAX_TOTAL_CHARS) return null
  return out
}

/** Non-secret diagnostics: enough to tell the failure modes apart, no values. */
function keyDiagnosis() {
  const raw = process.env.GROQ_API_KEY
  if (raw === undefined) return 'the variable is not defined at all'
  if (raw.trim() === '') return 'the variable is defined but empty'
  if (raw.trim() !== raw) return 'the value has leading or trailing whitespace — re-paste it'
  if (!raw.startsWith('gsk_')) return 'the value does not look like a Groq key'
  return null
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (rateLimited(ip)) {
    return json({ error: 'Too many messages in a short time. Try again in a few minutes.' }, 429, { 'Retry-After': '600' })
  }

  const problem = keyDiagnosis()
  if (problem) {
    // Details go to the server log only; visitors get a generic message.
    console.error(`[api/chat] GROQ_API_KEY problem: ${problem}`)
    const where =
      process.env.NODE_ENV === 'production'
        ? 'The chat is not available right now.'
        : `Add GROQ_API_KEY to .env.local and restart the dev server. Right now ${problem}.`
    return json({ error: where }, 500)
  }

  const raw = await req.text()
  if (raw.length > MAX_BODY_BYTES) return json({ error: 'That message is too long.' }, 413)

  let messages: CoreMessage[] | null
  try {
    messages = cleanMessages(JSON.parse(raw)?.messages)
  } catch {
    return json({ error: 'Malformed request body.' }, 400)
  }

  if (messages === null) return json({ error: `Messages must be text of ${MAX_MESSAGE_CHARS} characters or less.` }, 400)
  if (messages.length === 0) return json({ error: 'No messages provided.' }, 400)

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
  // Live project list from www.jessiecalm.com, cached an hour by Next's data cache.
  const portfolio = await getPortfolio()

  const result = streamText({
    model: groq('openai/gpt-oss-120b'),
    providerOptions: { groq: { reasoningFormat: 'hidden' } },
    system: buildSystemPrompt(portfolio),
    messages,
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
      if (/rate limit|429/i.test(detail)) {
        return 'The chat is busy right now. Give it a moment and try again.'
      }
      return 'Something went wrong. Please try again in a moment.'
    },
  })
}

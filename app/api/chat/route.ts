import { createGroq } from '@ai-sdk/groq'
import { streamText, type CoreMessage } from 'ai'
import { SYSTEM_PROMPT } from '@/lib/prompt'

// Edge runtime keeps time-to-first-token low, which is the whole point here.
export const runtime = 'edge'
export const maxDuration = 30

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })

/** Cap history so a long session can't grow the request without bound. */
const MAX_MESSAGES = 24

export async function POST(req: Request) {
  if (!process.env.GROQ_API_KEY) {
    // The fix differs by environment, and pointing at the wrong one sends people
    // hunting through local files for a variable that has to be set on the host.
    const hint =
      process.env.NODE_ENV === 'production'
        ? 'GROQ_API_KEY is not set on this deployment. Add it under Settings → Environment Variables, then redeploy — existing deployments do not pick up new variables on their own.'
        : 'GROQ_API_KEY is not set. Add it to .env.local and restart the dev server.'
    return new Response(JSON.stringify({ error: hint }), {
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

  const result = streamText({
    model: groq('llama-3.3-70b-versatile'),
    system: SYSTEM_PROMPT,
    messages: messages.slice(-MAX_MESSAGES),
    temperature: 0.7,
    maxTokens: 900,
  })

  return result.toDataStreamResponse()
}

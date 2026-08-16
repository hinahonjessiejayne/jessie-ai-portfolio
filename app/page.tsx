'use client'

import { useEffect, useRef } from 'react'
import { useChat } from 'ai/react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUp, RotateCcw, Square } from 'lucide-react'
import Avatar from '@/components/Avatar'
import HoneycombField from '@/components/HoneycombField'
import MessageList, { TypingIndicator } from '@/components/MessageList'
import PointerFX from '@/components/PointerFX'
import SuggestionChips from '@/components/SuggestionChips'
import ThemeToggle from '@/components/ThemeToggle'

/**
 * Head-turn frames, ordered left-profile → front → right-profile. The Avatar
 * maps cursor position across this strip, so order matters.
 * Regenerate with scripts/make-turn-frames.py.
 */
const TURN_FRAMES = Array.from({ length: 11 }, (_, i) => `/avatar/turn-${String(i).padStart(2, '0')}.png`)

/**
 * Pull the human-readable reason out of a failed request.
 *
 * The route replies with `{ error: "..." }`, but useChat surfaces that as a raw
 * JSON string on `error.message`. Parsing it back keeps the server's
 * environment-specific advice instead of flattening every failure into one
 * generic line.
 */
function serverError(error: Error): string {
  try {
    const parsed = JSON.parse(error.message)
    if (typeof parsed?.error === 'string') return parsed.error
  } catch {
    /* Not JSON — a network drop or an abort. Fall through to the raw message. */
  }
  return error.message || 'Something went wrong. Try again in a moment.'
}

export default function Page() {
  const avatarRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const { messages, input, handleInputChange, handleSubmit, isLoading, error, stop, setMessages, append } =
    useChat({ api: '/api/chat' })

  const started = messages.length > 0
  const last = messages[messages.length - 1]
  // "thinking" is the gap before the first token; "replying" once text arrives.
  const state = !isLoading ? 'idle' : last?.role === 'assistant' && last.content ? 'replying' : 'thinking'

  // Follow the stream, but only from near the bottom so it can't yank the view
  // away from someone who has scrolled up to re-read an earlier answer.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 160
    if (nearBottom) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages])

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-bg">
      <div className="absolute inset-0">
        <HoneycombField state={state} originRef={avatarRef} />
      </div>
      {/* Gold bloom, deliberately off-centre so the composition isn't symmetrical. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-[62%] h-[46rem] w-[46rem] -translate-x-1/2 rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, rgb(var(--gold) / 0.12) 0%, transparent 68%)' }}
      />
      <PointerFX />

      <header className="relative z-20 mx-auto flex max-w-shell items-center justify-between px-4 py-5 sm:px-8">
        <div className="flex items-center gap-2.5">
          <span className="h-2 w-2 rounded-full bg-gold" />
          <span className="font-display text-lg italic text-heading">Jessie</span>
        </div>
        <div className="flex items-center gap-2">
          {started && (
            <button
              type="button"
              onClick={() => setMessages([])}
              className="glass-panel flex items-center gap-1.5 rounded-full px-3 py-2 text-[13px] text-muted transition-colors hover:text-gold"
            >
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
              New chat
            </button>
          )}
          <ThemeToggle />
        </div>
      </header>

      <div className="relative z-20 mx-auto flex min-h-[calc(100dvh-5.5rem)] max-w-3xl flex-col px-4 pb-6 sm:px-6">
        <AnimatePresence mode="wait">
          {!started ? (
            <motion.section
              key="landing"
              exit={{ opacity: 0, y: -24, transition: { duration: 0.3 } }}
              className="flex flex-1 flex-col items-center justify-center gap-6 text-center"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 100, damping: 20 }}
              >
                <Avatar ref={avatarRef} state={state} frames={TURN_FRAMES} />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 100, damping: 20 }}
                className="space-y-2.5"
              >
                <h1 className="font-display text-4xl italic leading-[1.05] text-heading md:text-6xl">
                  Hey, I&apos;m <span className="text-gold">Jessie</span> 👋
                </h1>
                <p className="mx-auto max-w-[46ch] text-[15px] leading-relaxed text-muted md:text-base">
                  AI Automation Specialist — Tagaytay, Cavite, PH. This is my AI avatar. Ask it
                  anything and it answers for me.
                </p>
              </motion.div>

              <SuggestionChips onPick={(q) => append({ role: 'user', content: q })} disabled={isLoading} />
            </motion.section>
          ) : (
            <motion.section
              key="chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-1 flex-col"
            >
              <div className="mb-4 flex items-center gap-3 pt-1">
                <Avatar ref={avatarRef} state={state} frames={TURN_FRAMES} size={48} />
                <div className="text-left">
                  <p className="font-display text-base italic text-heading">Jessie&apos;s avatar</p>
                  <p className="font-mono text-[11px] text-muted">
                    {state === 'thinking' ? 'thinking…' : state === 'replying' ? 'typing…' : 'online'}
                  </p>
                </div>
              </div>

              <div ref={scrollRef} className="thin-scroll flex-1 overflow-y-auto pb-4 pr-1">
                <MessageList messages={messages} />
                {state === 'thinking' && (
                  <div className="mt-5">
                    <TypingIndicator />
                  </div>
                )}
                {error && (
                  <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                    <p>That didn&apos;t go through.</p>
                    {/* Surface what the server actually said. The route explains the
                        fix per environment, and a hardcoded string here would
                        override it with advice that may point at the wrong place. */}
                    <p className="mt-1 text-red-300/80">{serverError(error)}</p>
                  </div>
                )}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Composer — tight padding per brief, so it never floats away from the content. */}
        <form onSubmit={handleSubmit} className="relative z-20 pt-2">
          <div className="glass-panel flex items-end gap-2 rounded-2xl p-2 transition-colors focus-within:border-gold/40">
            <textarea
              value={input}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>)
                }
              }}
              rows={1}
              placeholder="Ask about my projects, skills, or how I can automate your business…"
              aria-label="Ask Jessie's AI avatar a question"
              className="max-h-36 flex-1 resize-none bg-transparent px-3 py-2 text-[15px] text-body outline-none placeholder:text-muted"
            />
            {isLoading ? (
              <button
                type="button"
                onClick={stop}
                aria-label="Stop generating"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line text-muted transition-transform active:scale-95"
              >
                <Square className="h-4 w-4" strokeWidth={2} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                aria-label="Send message"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold text-bg transition-transform active:scale-95 disabled:opacity-35"
              >
                <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
              </button>
            )}
          </div>
          <p className="mt-2 text-center font-mono text-[10.5px] text-muted">
            AI avatar — it can occasionally get things wrong. Book a call for anything binding.
          </p>
        </form>
      </div>
    </main>
  )
}

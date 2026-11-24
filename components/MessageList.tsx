'use client'

import { memo } from 'react'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Message } from 'ai'
import ProjectCards from './ProjectCards'
import type { Platform } from '@/lib/projects'
import BookingCard from './BookingCard'

/**
 * Renders the conversation.
 *
 * Rich content is driven by markers the model emits ([[PROJECTS]], [[N8N]],
 * [[ZAPIER]], [[GHL]], [[APPS]], [[BOOKING]]).
 * Splitting on them lets a single streamed reply interleave prose and real
 * components, and a half-streamed marker simply renders as text for a frame or
 * two before resolving — no flicker, no parsing failure.
 *
 * Bubble sides follow the brief: user left and plain, avatar right and lit.
 * (Note that most chat UIs put the user on the right; flip the two `justify-`
 * classes below if you'd rather match that convention.)
 */

const MARKER = /\[\[(PROJECTS|BOOKING|N8N|ZAPIER|GHL|APPS)\]\]/g

/** [[N8N]] and [[ZAPIER]] both mean "automation": the first one renders both tabs as one list. */
const AUTOMATION: readonly Platform[] = ['N8N', 'Zapier']

function renderWithMarkers(content: string) {
  const parts = content.split(MARKER)
  let automationShown = false
  return parts.map((part, i) => {
    if (part === 'PROJECTS') return <ProjectCards key={`p-${i}`} />
    if (part === 'N8N' || part === 'ZAPIER') {
      if (automationShown) return null
      automationShown = true
      return <ProjectCards key={`n-${i}`} platforms={AUTOMATION} />
    }
    if (part === 'GHL') return <ProjectCards key={`g-${i}`} platforms={['GHL']} />
    if (part === 'APPS') return <ProjectCards key={`a-${i}`} platforms={['Apps & AI']} />
    if (part === 'BOOKING') return <BookingCard key={`b-${i}`} />
    if (!part.trim()) return null
    return (
      <div key={`t-${i}`} className="reply-prose">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{part.trim()}</ReactMarkdown>
      </div>
    )
  })
}

function MessageList({ messages }: { messages: Message[] }) {
  return (
    <div className="space-y-5">
      {messages.map((m) => {
        const isUser = m.role === 'user'
        return (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
            className={`flex ${isUser ? 'justify-start' : 'justify-end'}`}
          >
            <div className={`max-w-[min(100%,44rem)] ${isUser ? '' : 'w-full'}`}>
              <p className={`eyebrow mb-1.5 ${isUser ? '' : 'text-right'}`}>{isUser ? 'You' : 'Jessie'}</p>

              {isUser ? (
                <div className="rounded-2xl rounded-tl-sm border border-line bg-surface px-4 py-2.5 text-[15px] text-body">
                  {m.content}
                </div>
              ) : (
                <div className="rounded-2xl rounded-tr-sm border border-gold/25 bg-card px-4 py-3 text-body shadow-goldring">
                  {renderWithMarkers(m.content)}
                </div>
              )}
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

export default memo(MessageList)

/** Three-dot typing indicator, shown while waiting for the first token. */
export const TypingIndicator = memo(function TypingIndicator() {
  return (
    <div className="flex justify-end">
      <div className="max-w-[44rem]">
        <p className="eyebrow mb-1.5 text-right">Jessie</p>
        <div className="inline-flex items-center gap-1.5 rounded-2xl rounded-tr-sm border border-gold/25 bg-card px-4 py-3.5">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-gold"
              animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
              transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.16, ease: 'easeInOut' }}
            />
          ))}
        </div>
      </div>
    </div>
  )
})

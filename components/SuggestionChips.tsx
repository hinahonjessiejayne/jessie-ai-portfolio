'use client'

import { memo } from 'react'
import { motion } from 'framer-motion'
import { Briefcase, Sparkles, Wrench, Handshake } from 'lucide-react'

export const SUGGESTIONS = [
  { label: 'Show me your best projects', icon: Briefcase },
  { label: 'What tools do you use?', icon: Wrench },
  { label: 'How can we collaborate?', icon: Handshake },
  { label: 'Tell me a fun fact', icon: Sparkles },
] as const

/**
 * Entry-point chips. Staggered in so they arrive as a sequence rather than
 * appearing all at once, which is what makes the landing feel composed.
 */
function SuggestionChips({ onPick, disabled }: { onPick: (q: string) => void; disabled?: boolean }) {
  return (
    <motion.ul
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } } }}
      className="flex flex-wrap justify-center gap-2"
    >
      {SUGGESTIONS.map(({ label, icon: Icon }) => (
        <motion.li
          key={label}
          variants={{
            hidden: { opacity: 0, y: 12 },
            show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 20 } },
          }}
        >
          <button
            type="button"
            onClick={() => onPick(label)}
            disabled={disabled}
            className="glass-panel group flex items-center gap-2 rounded-full px-4 py-2 text-[13px] text-body transition-all hover:border-gold/40 hover:text-gold active:translate-y-px disabled:opacity-50"
          >
            <Icon className="h-3.5 w-3.5 text-gold" strokeWidth={1.5} />
            {label}
          </button>
        </motion.li>
      ))}
    </motion.ul>
  )
}

export default memo(SuggestionChips)

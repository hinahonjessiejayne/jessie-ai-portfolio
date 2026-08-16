'use client'

import { memo } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { FEATURED, workflowsFor, type Platform, type Project } from '@/lib/projects'

/**
 * Project cards rendered inline in the chat stream.
 *
 * Stacked vertically rather than as a three-across row: inside a chat column a
 * horizontal trio would crush each card to an unreadable width, and the equal
 * three-card feature row is exactly the templated pattern to avoid.
 *
 * Two densities. The featured view is media-left / content-right with full
 * blurbs. The platform view lists every workflow for one tool in a compact row,
 * because a dozen full-size cards would bury the conversation.
 */

function FeaturedCard({ p, i }: { p: Project; i: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.09, type: 'spring', stiffness: 100, damping: 20 }}
      className="group grid grid-cols-1 overflow-hidden rounded-2xl border border-line bg-card shadow-lift sm:grid-cols-[164px_1fr]"
    >
      <div className="relative h-36 overflow-hidden bg-surface sm:h-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={p.image}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent sm:bg-gradient-to-r"
        />
      </div>

      <div className="p-4">
        <p className="eyebrow">{p.platform}</p>
        <h3 className="mt-1 font-display text-lg italic leading-tight text-heading">{p.title}</h3>
        <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{p.blurb}</p>

        <ul className="mt-3 flex flex-wrap gap-1.5">
          {p.metrics.map((m) => (
            <li
              key={m}
              className="rounded-full border border-gold/25 bg-gold/10 px-2.5 py-1 font-mono text-[11px] text-gold"
            >
              {m}
            </li>
          ))}
        </ul>

        {p.href && (
          <a
            href={p.href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-gold transition-transform active:translate-y-px"
          >
            View live
            <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} />
          </a>
        )}
      </div>
    </motion.article>
  )
}

function CompactRow({ p, i }: { p: Project; i: number }) {
  return (
    <motion.li
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: i * 0.05, type: 'spring', stiffness: 110, damping: 20 }}
      className="group flex gap-3 rounded-xl border border-line bg-card p-2.5 transition-colors hover:border-gold/35"
    >
      <div className="h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-surface">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={p.image}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
        />
      </div>

      <div className="min-w-0 flex-1">
        <h4 className="text-[14px] font-semibold leading-snug text-heading">
          {p.href ? (
            <a href={p.href} target="_blank" rel="noopener noreferrer" className="hover:text-gold">
              {p.title}
              <ArrowUpRight className="ml-0.5 inline h-3 w-3" strokeWidth={2} />
            </a>
          ) : (
            p.title
          )}
        </h4>
        <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-relaxed text-muted">{p.blurb}</p>
        <ul className="mt-1.5 flex flex-wrap gap-1">
          {p.metrics.map((m) => (
            <li key={m} className="rounded-full bg-gold/10 px-2 py-0.5 font-mono text-[10.5px] text-gold">
              {m}
            </li>
          ))}
        </ul>
      </div>
    </motion.li>
  )
}

function ProjectCards({ platform }: { platform?: Platform }) {
  if (!platform) {
    return (
      <div className="mt-3 space-y-3">
        {FEATURED.map((p, i) => (
          <FeaturedCard key={p.id} p={p} i={i} />
        ))}
      </div>
    )
  }

  const list = workflowsFor(platform)
  if (list.length === 0) return null

  return (
    <div className="mt-3">
      <p className="eyebrow mb-2">
        {platform} — {list.length} workflow{list.length === 1 ? '' : 's'}
      </p>
      <ul className="space-y-2">
        {list.map((p, i) => (
          <CompactRow key={p.id} p={p} i={i} />
        ))}
      </ul>
    </div>
  )
}

export default memo(ProjectCards)

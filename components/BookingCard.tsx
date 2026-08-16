'use client'

import { memo, useState } from 'react'
import { Calendar, Mail } from 'lucide-react'

const BOOKING_SRC = 'https://links.jcalms.com/widget/booking/FfG3AYYLM6qsnedkwqSb'
const EMAIL = 'jessiejaynehinahon@yahoo.com'

/**
 * The GHL booking widget, rendered inline when [[BOOKING]] appears in a reply.
 *
 * Loaded behind a click rather than eagerly: the GHL embed pulls a third-party
 * script and would otherwise cost every visitor a network round trip on a page
 * where most people never book. The email is always available as the fast path.
 */
function BookingCard() {
  const [open, setOpen] = useState(false)

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-line bg-card shadow-lift">
      <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gold/12 text-gold">
          <Calendar className="h-5 w-5" strokeWidth={1.5} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="eyebrow">Free strategy call</p>
          <p className="text-sm text-muted">Pick a slot that suits you — no charge, no pitch deck.</p>
        </div>
        {!open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-bg transition-transform active:scale-[0.98]"
          >
            Open calendar
          </button>
        )}
      </div>

      {open && (
        <iframe
          src={BOOKING_SRC}
          title="Book a strategy call with Jessie"
          allow="payment"
          scrolling="no"
          className="h-[620px] w-full border-0"
        />
      )}

      <a
        href={`mailto:${EMAIL}`}
        className="flex items-center gap-2 px-4 py-3 text-[13px] text-muted transition-colors hover:text-gold"
      >
        <Mail className="h-4 w-4" strokeWidth={1.5} />
        Prefer email? {EMAIL}
      </a>
    </div>
  )
}

export default memo(BookingCard)

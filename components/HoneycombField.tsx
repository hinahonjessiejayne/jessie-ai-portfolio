'use client'

import { useEffect, useRef } from 'react'

export type FieldState = 'idle' | 'thinking' | 'replying'

/**
 * The signature element.
 *
 * The hex lattice and falloff maths are ported from ghl-portfolio.html so the
 * cursor behaviour matches the existing site exactly (R=25, MAXD=350, squared
 * falloff, offset odd rows). What is new here: the field also responds to the
 * conversation. While the avatar thinks, a gold ring pulses outward from its
 * centre; while a reply streams, the whole lattice lifts its floor brightness.
 *
 * All animation lives on the canvas and in refs — nothing here triggers a React
 * render, so the 60fps loop never touches the component tree.
 */
export default function HoneycombField({
  state = 'idle',
  originRef,
}: {
  state?: FieldState
  /** Element the pulse radiates from — normally the avatar. */
  originRef?: React.RefObject<HTMLElement>
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef<FieldState>(state)
  const originElRef = useRef<HTMLElement | null>(null)

  // Mirror props into refs so the RAF loop reads fresh values without resubscribing.
  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    originElRef.current = originRef?.current ?? null
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Lattice geometry — identical to the original site.
    const R = 25
    const MAXD = 350
    const BASE = 0.04
    const PEAK = 0.6
    const hSpace = Math.sqrt(3) * R
    const vSpace = 2 * R * 0.75

    let mx = -1000
    let my = -1000
    let raf = 0
    let t = 0
    let dpr = 1

    // Read the gold straight from the CSS variable so the theme toggle carries.
    let gold = '212, 175, 55'
    const readGold = () => {
      const v = getComputedStyle(document.documentElement).getPropertyValue('--gold').trim()
      if (v) gold = v.split(/\s+/).join(', ')
    }
    readGold()

    const sizeCanvas = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(canvas.offsetWidth * dpr)
      canvas.height = Math.floor(canvas.offsetHeight * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    sizeCanvas()

    const onResize = () => {
      sizeCanvas()
      readGold()
    }
    const onMove = (e: MouseEvent) => {
      const r = canvas.getBoundingClientRect()
      mx = e.clientX - r.left
      my = e.clientY - r.top
    }
    // Touch devices have no hover; drift the focus to the origin instead.
    const onLeave = () => {
      mx = -1000
      my = -1000
    }

    window.addEventListener('resize', onResize)
    window.addEventListener('mousemove', onMove, { passive: true })
    document.addEventListener('mouseleave', onLeave)

    const themeObserver = new MutationObserver(readGold)
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

    const hex = (cx: number, cy: number, k: number, boost: number) => {
      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const a = Math.PI / 6 + (Math.PI / 3) * i
        const x = cx + R * Math.cos(a)
        const y = cy + R * Math.sin(a)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.closePath()
      const alpha = Math.min(BASE + (PEAK - BASE) * k + boost, 0.85)
      ctx.strokeStyle = `rgba(${gold}, ${alpha})`
      ctx.lineWidth = 1
      ctx.stroke()
      if (k > 0.05 || boost > 0.02) {
        ctx.fillStyle = `rgba(${gold}, ${k * 0.15 + boost * 0.5})`
        ctx.fill()
      }
    }

    const draw = () => {
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      ctx.clearRect(0, 0, w, h)

      const mode = stateRef.current
      t += mode === 'idle' ? 0.006 : 0.02

      // Pulse origin: the avatar if we have one, else the centre of the field.
      let ox = w / 2
      let oy = h / 2
      const originEl = originElRef.current
      if (originEl) {
        const orect = originEl.getBoundingClientRect()
        const crect = canvas.getBoundingClientRect()
        ox = orect.left + orect.width / 2 - crect.left
        oy = orect.top + orect.height / 2 - crect.top
      }

      // Expanding ring while thinking; a raised floor while a reply streams.
      const ringR = mode === 'thinking' ? ((t * 90) % 620) : 0
      const floor = mode === 'replying' ? 0.05 : 0

      const cols = Math.ceil(w / hSpace) + 2
      const rows = Math.ceil(h / vSpace) + 2

      for (let r = -1; r < rows; r++) {
        for (let c = -1; c < cols; c++) {
          let x = c * hSpace
          const y = r * vSpace
          if (r % 2 !== 0) x += hSpace / 2

          const dx = x - mx
          const dy = y - my
          const dist = Math.sqrt(dx * dx + dy * dy)
          const k = dist < MAXD ? Math.pow(1 - dist / MAXD, 2) : 0

          let boost = floor
          if (ringR > 0) {
            const od = Math.sqrt((x - ox) ** 2 + (y - oy) ** 2)
            const band = Math.abs(od - ringR)
            // Narrow bright band that fades as the ring travels outward.
            if (band < 46) boost += (1 - band / 46) * 0.32 * (1 - ringR / 620)
          }

          hex(x, y, k, boost)
        }
      }

      raf = requestAnimationFrame(draw)
    }

    if (reduced) {
      // Draw one static frame: the lattice still reads, nothing moves.
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      const cols = Math.ceil(w / hSpace) + 2
      const rows = Math.ceil(h / vSpace) + 2
      for (let r = -1; r < rows; r++) {
        for (let c = -1; c < cols; c++) {
          let x = c * hSpace
          const y = r * vSpace
          if (r % 2 !== 0) x += hSpace / 2
          hex(x, y, 0, 0)
        }
      }
    } else {
      raf = requestAnimationFrame(draw)
    }

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseleave', onLeave)
      themeObserver.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  )
}

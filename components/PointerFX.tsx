'use client'

import { useEffect, useRef } from 'react'

/**
 * Iridescent pointer light + click splash.
 *
 * The gradient is gold-biased rather than a full spectrum — a literal rainbow
 * fights the brand accent and reads as a sticker on top of the design. This
 * leans gold into amber, with cool violet and cyan only at the outer stops, so
 * it looks like light refracting through the honeycomb rather than a colour wheel.
 *
 * Position is lerped and written straight to style properties inside a RAF loop.
 * No React state is involved, so pointer movement never re-renders the tree.
 * Fades out after INACTIVITY_MS of stillness, per brief.
 */

const INACTIVITY_MS = 1400
const LERP = 0.12

export default function PointerFX() {
  const glowRef = useRef<HTMLDivElement>(null)
  const layerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    // Coarse pointers (touch) have no hover; the effect would never show.
    if (window.matchMedia('(pointer: coarse)').matches) return

    const glow = glowRef.current
    const layer = layerRef.current
    if (!glow || !layer) return

    let tx = window.innerWidth / 2
    let ty = window.innerHeight / 2
    let x = tx
    let y = ty
    let lastMove = 0
    let raf = 0

    const onMove = (e: MouseEvent) => {
      tx = e.clientX
      ty = e.clientY
      lastMove = performance.now()
    }

    const onClick = (e: MouseEvent) => {
      const splash = document.createElement('span')
      splash.className = 'pfx-splash'
      splash.style.left = `${e.clientX}px`
      splash.style.top = `${e.clientY}px`
      layer.appendChild(splash)
      // Self-removing so clicks never accumulate DOM nodes.
      splash.addEventListener('animationend', () => splash.remove(), { once: true })
    }

    const tick = (now: number) => {
      x += (tx - x) * LERP
      y += (ty - y) * LERP

      const idle = now - lastMove > INACTIVITY_MS
      glow.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`
      glow.style.opacity = idle ? '0' : '1'

      raf = requestAnimationFrame(tick)
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    window.addEventListener('click', onClick)
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('click', onClick)
    }
  }, [])

  // Styles live in globals.css under the .pfx-* namespace — keeping them there
  // rather than in styled-jsx keeps all CSS in one organised place.
  return (
    <div ref={layerRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-30 overflow-hidden">
      <div ref={glowRef} className="pfx-glow" />
    </div>
  )
}

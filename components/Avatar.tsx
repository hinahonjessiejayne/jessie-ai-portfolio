'use client'

import { forwardRef, memo, useEffect, useState } from 'react'
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion'

export type AvatarState = 'idle' | 'thinking' | 'replying'

/**
 * The animated Memoji avatar. It tracks the cursor in one of two modes.
 *
 * FRAME MODE — pass `frames` (an array of webp paths, ordered left-profile →
 * front → right-profile). The cursor's horizontal angle picks the matching
 * frame, so the head genuinely turns. This needs real rendered angles; see
 * scripts/extract-frames.sh for producing them from a rotation video.
 *
 * TILT MODE (default) — with a single image, the head is tilted in 3D toward
 * the cursor using perspective transforms. No extra assets, and because it is a
 * real 3D rotation rather than a swap between drawings it stays smooth at any
 * angle. This is what runs until frames exist.
 *
 * Motion values are used throughout rather than state: the cursor drives the
 * transform outside React's render cycle, so pointer movement never re-renders.
 */

const MAX_TILT = 16 // degrees; beyond this a flat image starts to look sheared

const Avatar = forwardRef<HTMLDivElement, {
  state?: AvatarState
  src?: string
  /** Ordered rotation frames. When supplied, overrides tilt mode. */
  frames?: string[]
  videoSrc?: string
  size?: number
}>(function Avatar(
  { state = 'idle', src = '/avatar/turn-center.png', frames, videoSrc, size = 168 },
  ref,
) {
  const reduced = useReducedMotion()
  const [frameIndex, setFrameIndex] = useState(() =>
    frames && frames.length ? Math.floor(frames.length / 2) : 0,
  )
  // Falls back to the photo portrait until the Memoji file is saved, then to
  // initials if neither loads — so the avatar is never an empty box.
  const [fallback, setFallback] = useState<0 | 1 | 2>(0)
  const hasFrames = Boolean(frames && frames.length > 1 && fallback === 0)

  // Normalised cursor offset from the viewport centre, -1 … 1.
  const px = useMotionValue(0)
  const py = useMotionValue(0)
  const sx = useSpring(px, { stiffness: 120, damping: 18, mass: 0.4 })
  const sy = useSpring(py, { stiffness: 120, damping: 18, mass: 0.4 })

  /*
   * Yaw is owned by whichever mode is active — never both.
   *
   * In frame mode the frames already turn the head, so layering a full CSS
   * rotateY on top would double the rotation and shear the face. Instead the
   * transform carries only the RESIDUAL: the fraction of a step between the
   * frame being shown and the true cursor angle. That is what turns 11 discrete
   * frames into continuous motion — the frame gives the pose, the residual
   * smooths the gap.
   */
  const stepDeg = frames && frames.length > 1 ? 60 / (frames.length - 1) : 0
  const residual = useTransform(sx, (v) => {
    if (!hasFrames) return 0
    const exact = ((v + 1) / 2) * (frames!.length - 1)
    return (exact - Math.round(exact)) * stepDeg
  })
  const fullTilt = useTransform(sx, [-1, 1], [-MAX_TILT, MAX_TILT])
  const rotateY = hasFrames ? residual : fullTilt

  const rotateX = useTransform(sy, [-1, 1], [MAX_TILT * 0.55, -MAX_TILT * 0.55])
  // Slight counter-parallax makes the turn read as volume rather than a slide.
  const shiftX = useTransform(sx, [-1, 1], [-7, 7])

  useEffect(() => {
    if (reduced) return

    const onMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1
      const ny = (e.clientY / window.innerHeight) * 2 - 1
      px.set(Math.max(-1, Math.min(1, nx)))
      py.set(Math.max(-1, Math.min(1, ny)))
    }

    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [px, py, reduced])

  // Frame selection rides the SPRING, not the raw pointer, so the head keeps
  // turning through the spring's settle instead of snapping ahead of it.
  useEffect(() => {
    if (!hasFrames || reduced) return
    const n = frames!.length
    return sx.on('change', (v) => {
      const i = Math.round(((v + 1) / 2) * (n - 1))
      setFrameIndex(Math.max(0, Math.min(n - 1, i)))
    })
  }, [frames, hasFrames, reduced, sx])

  // Warm the rest of the strip after mount rather than in markup: the centre
  // frame is all first paint needs, and eagerly fetching all 11 would put ~1MB
  // on the critical path for an animation nobody has triggered yet.
  useEffect(() => {
    if (!hasFrames) return
    const id = window.setTimeout(() => {
      frames!.forEach((f) => {
        const img = new Image()
        img.decoding = 'async'
        img.src = f
      })
    }, 600)
    return () => window.clearTimeout(id)
  }, [frames, hasFrames])

  // Occasional head tilt on an uneven cadence, so it never feels metronomic.
  const [idleTilt, setIdleTilt] = useState(0)
  useEffect(() => {
    if (reduced) return
    let timer: ReturnType<typeof setTimeout>
    const schedule = () => {
      timer = setTimeout(() => {
        setIdleTilt((prev) => (prev === 0 ? (Math.random() > 0.5 ? 2 : -2) : 0))
        schedule()
      }, 2600 + Math.random() * 3200)
    }
    schedule()
    return () => clearTimeout(timer)
  }, [reduced])

  const spring = { type: 'spring' as const, stiffness: 100, damping: 20 }

  const PHOTO_FALLBACK = 'https://lh3.googleusercontent.com/d/18EafyH0BU_s_OWzlVp303Y3E3lgKScnQ'
  const baseSrc = frames && frames.length > 0 ? frames[frameIndex] : src
  const currentSrc = fallback === 0 ? baseSrc : PHOTO_FALLBACK

  /*
   * Volumetric lighting.
   *
   * This is what separates "a picture that rotates" from "a head with volume".
   * Two gradient layers are masked by the CURRENT FRAME's own alpha, so they
   * paint on the Memoji's exact silhouette rather than a box around it: a warm
   * key light on the side facing the cursor, and a cool occlusion wash on the
   * far side. As the cursor crosses, the terminator sweeps across the face and
   * the form reads as solid.
   */
  const lightX = useTransform(sx, [-1, 1], [12, 88]) // % across the face
  const lightY = useTransform(sy, [-1, 1], [8, 82])
  const shadeX = useTransform(sx, [-1, 1], [90, 10])

  // Hooks must run unconditionally, so the gradients are built here rather than
  // inline in the JSX where they sit behind `fallback === 0` guards.
  const shadeBg = useTransform(
    shadeX,
    (v) =>
      `radial-gradient(circle at ${v}% 55%, rgba(28,32,48,0.5) 0%, rgba(28,32,48,0.22) 34%, transparent 62%)`,
  )
  const keyBg = useTransform([lightX, lightY], ([x, y]: number[]) =>
    `radial-gradient(circle at ${x}% ${y}%, rgba(255,238,200,0.95) 0%, rgba(255,226,160,0.42) 30%, transparent 58%)`,
  )
  const rimBg = useTransform(
    lightX,
    (v) => `radial-gradient(ellipse 46% 66% at ${v}% 50%, transparent 52%, rgb(var(--gold) / 0.5) 88%)`,
  )
  const maskStyle =
    fallback === 0
      ? {
          maskImage: `url(${currentSrc})`,
          WebkitMaskImage: `url(${currentSrc})`,
          maskSize: '100% 100%',
          WebkitMaskSize: '100% 100%',
          maskRepeat: 'no-repeat',
          WebkitMaskRepeat: 'no-repeat',
        }
      : undefined

  // Depth: the head leans toward the pointer instead of only pivoting in place.
  const pushZ = useTransform(sx, (v) => Math.abs(v) * -14)

  return (
    <div
      ref={ref}
      className="relative grid place-items-center"
      style={{ width: size, height: size, perspective: 620 }}
    >
      {/* Aura — brightens with conversation state. */}
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 rounded-full blur-2xl"
        style={{ background: 'radial-gradient(circle, rgb(var(--gold) / 0.55) 0%, transparent 70%)' }}
        animate={{
          opacity: state === 'idle' ? 0.32 : state === 'thinking' ? 0.6 : 0.78,
          scale: state === 'replying' ? 1.16 : 1,
        }}
        transition={spring}
      />

      {/* Contact shadow, behind the head — a floating head casting nothing
          reads as a sticker pasted on the page. Breathes with the idle loop. */}
      {fallback === 0 && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute rounded-[50%] blur-md"
          style={{
            bottom: size * 0.02,
            width: size * 0.5,
            height: size * 0.07,
            background: 'rgb(0 0 0 / 0.5)',
          }}
          animate={reduced ? {} : { scaleX: [1, 0.9, 1], opacity: [0.5, 0.36, 0.5] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* Orbit ring — rotates continuously, tightening while thinking. */}
      <motion.div
        aria-hidden="true"
        className="absolute rounded-full border border-dashed"
        style={{ inset: -14, borderColor: 'rgb(var(--gold) / 0.35)' }}
        animate={reduced ? {} : { rotate: 360, scale: state === 'thinking' ? 0.95 : 1 }}
        transition={{
          rotate: { duration: state === 'thinking' ? 8 : 26, repeat: Infinity, ease: 'linear' },
          scale: spring,
        }}
      />

      {/* Portrait — 3D tilt tracks the cursor; breathing runs underneath it. */}
      <motion.div
        className="relative grid place-items-center rounded-full"
        style={{
          width: size,
          height: size,
          rotateX: reduced ? 0 : rotateX,
          rotateY: reduced ? 0 : rotateY,
          z: reduced ? 0 : pushZ,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* The Memoji has a transparent backdrop, so it floats rather than sitting
            in a cropped disc — no border, no clipping, just a grounding shadow. */}
        <motion.div
          className="relative h-full w-full"
          style={{ x: reduced ? 0 : shiftX }}
          animate={reduced ? {} : { rotate: idleTilt, y: [0, -5, 0], scale: [1, 1.015, 1] }}
          transition={{
            rotate: spring,
            y: { duration: 5.5, repeat: Infinity, ease: 'easeInOut' },
            scale: { duration: 5.5, repeat: Infinity, ease: 'easeInOut' },
          }}
        >
          {videoSrc && state === 'replying' ? (
            <video src={videoSrc} autoPlay muted loop playsInline className="h-full w-full object-cover" />
          ) : fallback < 2 ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentSrc}
                alt="Jessie's avatar"
                className={
                  fallback === 0
                    ? 'h-full w-full object-contain drop-shadow-[0_12px_16px_rgba(0,0,0,0.55)]'
                    : 'h-full w-full rounded-full border-2 border-gold/65 object-cover'
                }
                onError={() => setFallback((f) => (f === 0 ? 1 : 2))}
                referrerPolicy="no-referrer"
                draggable={false}
              />

              {/* Occlusion wash on the side away from the cursor. Sits under the
                  key light so the terminator between them lands on the form. */}
              {fallback === 0 && !reduced && (
                <motion.div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 mix-blend-multiply"
                  style={{ ...maskStyle, background: shadeBg }}
                />
              )}

              {/* Warm key light tracking the cursor. */}
              {fallback === 0 && !reduced && (
                <motion.div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 mix-blend-soft-light"
                  style={{ ...maskStyle, background: keyBg }}
                />
              )}

              {/* Gold rim on the leading edge — catches the brand light and
                  reads as a specular highlight rolling around the silhouette. */}
              {fallback === 0 && !reduced && (
                <motion.div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 mix-blend-screen"
                  style={{ ...maskStyle, opacity: 0.55, background: rimBg }}
                />
              )}
            </>
          ) : (
            <div className="grid h-full w-full place-items-center bg-surface font-display text-4xl italic text-gold">
              JH
            </div>
          )}

          {/* Sheen sweep on reply — only in framed mode. Over a cut-out Memoji a
              sweeping bar would cross the transparent gaps and read as a glitch;
              the aura and orbit ring carry the "replying" state there instead. */}
          {state === 'replying' && !reduced && fallback !== 0 && (
            <motion.div
              aria-hidden="true"
              className="absolute inset-0 overflow-hidden rounded-full"
              style={{
                background:
                  'linear-gradient(105deg, transparent 30%, rgb(var(--gold) / 0.3) 50%, transparent 70%)',
              }}
              initial={{ x: '-120%' }}
              animate={{ x: '120%' }}
              transition={{ duration: 1.1, repeat: Infinity, repeatDelay: 1.3, ease: 'easeInOut' }}
            />
          )}
        </motion.div>
      </motion.div>

      {/* Status dot — only in framed mode, where the circle gives it an edge to
          sit on. Floating beside a cut-out head it reads as a stray artefact. */}
      {fallback !== 0 && (
        <motion.span
          aria-hidden="true"
          className="absolute bottom-1 right-1 h-4 w-4 rounded-full border-2"
          style={{ borderColor: 'rgb(var(--bg))', background: 'rgb(var(--gold))' }}
          animate={reduced ? {} : { scale: state === 'thinking' ? [1, 1.35, 1] : 1 }}
          transition={{ duration: 1, repeat: state === 'thinking' ? Infinity : 0, ease: 'easeInOut' }}
        />
      )}
    </div>
  )
})

export default memo(Avatar)

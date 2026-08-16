'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

/**
 * Light/dark toggle. The initial class is applied by the inline script in
 * layout.tsx before paint; this component only mirrors and updates it.
 */
export default function ThemeToggle() {
  const [light, setLight] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setLight(document.documentElement.classList.contains('light'))
    setReady(true)
  }, [])

  const toggle = () => {
    const next = !light
    setLight(next)
    document.documentElement.classList.toggle('light', next)
    try {
      localStorage.setItem('jh-theme', next ? 'light' : 'dark')
    } catch {
      /* Private browsing blocks writes — the toggle still works for this session. */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={light ? 'Switch to dark theme' : 'Switch to light theme'}
      className="glass-panel grid h-10 w-10 place-items-center rounded-full text-gold transition-transform hover:scale-105 active:scale-95"
    >
      {/* Render nothing until mounted, so the icon can't contradict the theme. */}
      {ready && (light ? <Moon className="h-4 w-4" strokeWidth={1.5} /> : <Sun className="h-4 w-4" strokeWidth={1.5} />)}
    </button>
  )
}

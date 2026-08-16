import type { Metadata, Viewport } from 'next'
import { Fira_Code, Outfit, Playfair_Display } from 'next/font/google'
import './globals.css'

/*
 * Self-hosted at build time rather than linked from the Google CDN: no
 * render-blocking third-party request, no flash of unstyled text, and the
 * font files ship from the same origin as everything else.
 *
 * Each exposes a CSS variable that globals.css maps onto --font-*.
 */
/*
 * Outfit rather than Geist: Geist is not in Next 14's Google Fonts set, and
 * Outfit is the next name on the approved list in front-end-skill.md. Inter
 * remains deliberately unused.
 */
const outfit = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-outfit',
  display: 'swap',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['700'],
  style: ['normal', 'italic'],
  variable: '--font-playfair',
  display: 'swap',
})

const firaCode = Fira_Code({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-fira',
  display: 'swap',
})

export const metadata: Metadata = {
  title: "Jessie Hinahon — Ask my AI",
  description:
    'An AI avatar that answers anything about Jessie Hinahon: AI Automation Specialist and Technical VA in Tagaytay, Cavite. Ask about projects, tools, experience, or how to automate your business.',
  openGraph: {
    title: "Jessie Hinahon — Ask my AI",
    description: 'Ask my AI avatar anything about my automation work.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#050505' },
    { media: '(prefers-color-scheme: light)', color: '#FAFAFA' },
  ],
}

/**
 * Applies the stored theme before first paint. Without this the page renders
 * dark and then snaps to light for light-mode users — a visible flash.
 */
const THEME_INIT = `(function(){try{var t=localStorage.getItem('jh-theme');if(t==='light'){document.documentElement.classList.add('light')}}catch(e){}})()`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${playfair.variable} ${firaCode.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body>{children}</body>
    </html>
  )
}

'use client'

/**
 * Client-side access to the live portfolio for the inline cards.
 *
 * Reads `/api/portfolio`, which proxies www.jessiecalm.com/portfolio.json with
 * server caching, so the browser never needs CORS and every card render shares
 * one in-flight request per page load.
 */

import { useEffect, useState } from 'react'
import { parsePortfolio, type Portfolio } from './portfolio'

export type { Category as Platform, Project, Portfolio } from './portfolio'
export { byCategory, featuredOf, CATEGORY_LABELS } from './portfolio'

let inflight: Promise<Portfolio | null> | null = null

function load(): Promise<Portfolio | null> {
  if (!inflight) {
    inflight = fetch('/api/portfolio')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => parsePortfolio(json))
      .catch(() => null)
      .then((result) => {
        // Let a failed load retry on the next mount instead of sticking to null.
        if (result === null) inflight = null
        return result
      })
  }
  return inflight
}

export type PortfolioState = { status: 'loading' } | { status: 'ready'; data: Portfolio } | { status: 'error' }

export function usePortfolio(): PortfolioState {
  const [state, setState] = useState<PortfolioState>({ status: 'loading' })
  useEffect(() => {
    let alive = true
    load().then((data) => {
      if (!alive) return
      setState(data ? { status: 'ready', data } : { status: 'error' })
    })
    return () => {
      alive = false
    }
  }, [])
  return state
}

import { getPortfolio, REVALIDATE_SECONDS } from '@/lib/portfolio'

/**
 * Same-origin copy of www.jessiecalm.com/portfolio.json for the cards.
 *
 * Node runtime so the upstream fetch goes through Next's data cache, and
 * force-dynamic so this handler is never prerendered at build time — a build
 * that runs while the upstream is unreachable would otherwise freeze a 503 as
 * the static response for an hour.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const portfolio = await getPortfolio()
  if (!portfolio) {
    return new Response(JSON.stringify({ error: 'The portfolio feed is unavailable right now.' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    })
  }
  return new Response(JSON.stringify(portfolio), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `public, max-age=300, s-maxage=${REVALIDATE_SECONDS}`,
    },
  })
}

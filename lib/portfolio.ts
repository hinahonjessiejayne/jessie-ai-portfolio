/**
 * The avatar's project knowledge, read live from the main portfolio.
 *
 * www.jessiecalm.com publishes `/portfolio.json` from the same file that
 * renders its Work section, so the two sites can never drift: a card added
 * there shows up here — in the cards and in what the avatar says — within an
 * hour, with no edit to this repo.
 *
 * Server-only. The client reaches the same data through `/api/portfolio`.
 */

export const SITE_URL = 'https://www.jessiecalm.com'
const PORTFOLIO_URL = `${SITE_URL}/portfolio.json`
/** How long a fetched copy is trusted before Next re-fetches it, in seconds. */
export const REVALIDATE_SECONDS = 3600

export const CATEGORIES = ['N8N', 'Zapier', 'GHL', 'Apps & AI'] as const
export type Category = (typeof CATEGORIES)[number]

export type Project = {
  id: string
  title: string
  category: Category
  description: string
  /** Absolute URL — the JSON carries site-relative paths, resolved on read. */
  imageUrl: string
  link?: string
  metrics?: string[]
  featured?: boolean
}

export type Portfolio = {
  site: string
  categories: Category[]
  projects: Project[]
}

const isCategory = (value: unknown): value is Category =>
  typeof value === 'string' && (CATEGORIES as readonly string[]).includes(value)

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((v) => typeof v === 'string')

function toProject(raw: unknown): Project | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>
  if (
    typeof r.id !== 'string' ||
    typeof r.title !== 'string' ||
    typeof r.description !== 'string' ||
    typeof r.imageUrl !== 'string' ||
    !isCategory(r.category)
  ) {
    return null
  }
  const project: Project = {
    id: r.id,
    title: r.title,
    category: r.category,
    description: r.description,
    imageUrl: r.imageUrl.startsWith('/') ? `${SITE_URL}${r.imageUrl}` : r.imageUrl,
  }
  if (typeof r.link === 'string') project.link = r.link
  if (isStringArray(r.metrics)) project.metrics = r.metrics
  if (r.featured === true) project.featured = true
  return project
}

/** Narrow whatever the network returned into a Portfolio, or null if it is not one. */
export function parsePortfolio(raw: unknown): Portfolio | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>
  if (!Array.isArray(r.projects)) return null
  const projects = r.projects.map(toProject).filter((p): p is Project => p !== null)
  if (projects.length === 0) return null
  const categories = Array.isArray(r.categories) ? r.categories.filter(isCategory) : [...CATEGORIES]
  return { site: typeof r.site === 'string' ? r.site : SITE_URL, categories, projects }
}

/**
 * Fetch the live portfolio. Cached by Next's data cache for REVALIDATE_SECONDS,
 * so a burst of chats costs one upstream request an hour. Null on any failure;
 * callers degrade to "browse the site" rather than inventing projects.
 */
export async function getPortfolio(): Promise<Portfolio | null> {
  try {
    const res = await fetch(PORTFOLIO_URL, { next: { revalidate: REVALIDATE_SECONDS } })
    if (!res.ok) return null
    return parsePortfolio(await res.json())
  } catch (error) {
    console.error('[portfolio] fetch failed:', error instanceof Error ? error.message : String(error))
    return null
  }
}

export const featuredOf = (p: Portfolio) => p.projects.filter((x) => x.featured)
export const byCategory = (p: Portfolio, category: Category) =>
  p.projects.filter((x) => x.category === category)

const GIST_MAX = 140

/**
 * First sentence of a description, cut at a word boundary past GIST_MAX
 * characters — enough for the model to answer from; the cards carry the rest.
 */
const gist = (text: string) => {
  const m = text.match(/^(.+?[.!?])(\s|$)/)
  const sentence = m ? m[1] : text
  if (sentence.length <= GIST_MAX) return sentence
  const cut = sentence.lastIndexOf(' ', GIST_MAX)
  return `${sentence.slice(0, cut > 60 ? cut : GIST_MAX).replace(/[,;:]$/, '')}…`
}

/**
 * The catalogue as compact prose for the system prompt: one line per project.
 * Kept short on purpose — the whole prompt is re-sent on every message and the
 * Groq key sits under a tokens-per-minute ceiling, so every card here costs
 * every chat. The cards render the full descriptions, metrics and links.
 */
export function catalogueForPrompt(p: Portfolio): string {
  const lines: string[] = []
  const featured = featuredOf(p)
  lines.push(`I have ${p.projects.length} pieces of work on the site, organised by tab.`)
  if (featured.length) {
    lines.push(`Headline builds (the [[PROJECTS]] cards): ${featured.map((x) => x.title).join('; ')}.`)
  }
  for (const category of p.categories) {
    const items = byCategory(p, category)
    if (!items.length) continue
    lines.push('', `**${category} (${items.length})**`)
    for (const x of items) lines.push(`- ${x.title} — ${gist(x.description)}${x.link ? ` (${x.link})` : ''}`)
  }
  return lines.join('\n')
}

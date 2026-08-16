/**
 * Every shipped workflow, mirroring the platform tabs on jessiecalm.com.
 *
 * `FEATURED` drives the three rich cards shown for a general "show me your
 * projects" question. `WORKFLOWS` is the full catalogue, surfaced grouped by
 * platform when someone asks about N8N, Zapier or GHL specifically.
 *
 * Client names are deliberately absent from titles and thumbnails, per brief.
 * Metrics stay concrete — rounded marketing numbers (100%, 99.9%) read as
 * invented and undercut everything around them.
 */

export type Platform = 'N8N' | 'Zapier' | 'GHL'

export type Project = {
  id: string
  title: string
  platform: Platform
  blurb: string
  metrics: string[]
  image: string
  href?: string
}

export const FEATURED: Project[] = [
  {
    id: 'n8n-2',
    title: 'AI Appointment Setter',
    platform: 'N8N',
    blurb:
      'An AI agent that books appointments over a live phone call — handling scheduling, reschedules and cancellations end to end, writing back to the calendar and confirming by SMS and email without anyone touching a keyboard.',
    metrics: ['27 hrs saved/week', 'Books, moves + cancels', 'Voice-driven', 'Zero manual entry'],
    image: 'https://i.imgur.com/2Ya0rdm.jpg',
  },
  {
    id: 'n8n-1',
    title: 'AI Social Media Content Creator',
    platform: 'N8N',
    blurb:
      'A scheduled workflow that pulls live weather data, has an LLM write copy worth reading around it, and publishes to connected pages on a set day and time — so the feed stays active without a standing content task.',
    metrics: ['Runs unattended', 'Live data → copy', 'Scheduled posting', '~6 hrs saved/week'],
    image: 'https://i.imgur.com/wVYYzW8.jpg',
  },
  {
    id: 'zap-3',
    title: 'Webhook: Lead Automation',
    platform: 'Zapier',
    blurb:
      'Webhook-triggered lead qualification: it reads the incoming lead, notifies the department that should own it, and sends a reply written by an LLM rather than a canned template — so a new lead is answered before anyone opens their inbox.',
    metrics: ['Webhook-triggered', 'LLM-written replies', 'Auto-routing', 'Answered in seconds'],
    image: 'https://i.imgur.com/Gdo5uWb.png',
  },
]

/** The full catalogue, in the order shown on the site's platform tabs. */
export const WORKFLOWS: Project[] = [
  // ---- N8N ----
  {
    id: 'n8n-1',
    title: 'AI Social Media Content Creator',
    platform: 'N8N',
    blurb:
      'Generates and posts weather updates to social platforms at a preferred time and day, using AI to craft engaging content from real-time data.',
    metrics: ['Scheduled', 'LLM copy', '~6 hrs/week saved'],
    image: 'https://i.imgur.com/wVYYzW8.jpg',
  },
  {
    id: 'n8n-2',
    title: 'AI Appointment Setter',
    platform: 'N8N',
    blurb:
      'An AI agent that books appointments via call, including scheduling, updating and cancellation of appointments.',
    metrics: ['Voice agent', 'Full lifecycle', '27 hrs/week saved'],
    image: 'https://i.imgur.com/2Ya0rdm.jpg',
  },

  // ---- Zapier ----
  {
    id: 'zap-1',
    title: 'AI Content Repurposing',
    platform: 'Zapier',
    blurb:
      'Generates unique content pieces and publishes them to LinkedIn, Facebook and other platforms, keeping a consistent and active online presence.',
    metrics: ['Multi-platform', 'Always-on'],
    image: 'https://i.imgur.com/1ZIxF49.jpg',
  },
  {
    id: 'zap-2',
    title: 'Asana CRM Automation',
    platform: 'Zapier',
    blurb:
      'Five key automations that improve workflow efficiency and keep communication with prospective leads consistent.',
    metrics: ['5 automations', 'CRM sync'],
    image: 'https://i.imgur.com/0eNqmpH.jpg',
  },
  {
    id: 'zap-3',
    title: 'Webhook: Lead Automation',
    platform: 'Zapier',
    blurb:
      'Automated lead qualification that notifies the right department and sends an LLM-written email in response.',
    metrics: ['Webhook-driven', 'LLM email', 'Auto-routing'],
    image: 'https://i.imgur.com/Gdo5uWb.png',
  },
  {
    id: 'zap-4',
    title: 'Email Notification: Daily',
    platform: 'Zapier',
    blurb: 'Scheduled daily reporting email.',
    metrics: ['Daily digest'],
    image: 'https://i.imgur.com/UGk29D4.png',
  },
  {
    id: 'zap-5',
    title: 'Email Notification: Weekly',
    platform: 'Zapier',
    blurb: 'Scheduled weekly reporting email.',
    metrics: ['Weekly digest'],
    image: 'https://i.imgur.com/FtTRf1H.png',
  },

  // ---- GHL ----
  {
    id: 'ghl-1',
    title: 'Client Notification: Lead Magnet Email',
    platform: 'GHL',
    blurb: 'Sends an email notification to the relevant department when a potential client comes in.',
    metrics: ['Instant alert', 'Dept routing'],
    image: 'https://i.imgur.com/DJLEaB6.png',
  },
  {
    id: 'ghl-2',
    title: 'Appointment Booking Reminder',
    platform: 'GHL',
    blurb: 'Email reminders the day before and one hour ahead of the appointment.',
    metrics: ['1 day + 1 hr', 'Fewer no-shows'],
    image: 'https://i.imgur.com/WPfmkH0.png',
  },
  {
    id: 'ghl-3',
    title: 'Facebook Auto Comment and Direct Message',
    platform: 'GHL',
    blurb:
      'Auto-responds to comments on a Facebook page, likes the comment, and follows up with a direct message.',
    metrics: ['Auto-reply', 'Likes + DMs'],
    image: 'https://i.imgur.com/7GYK1KK.png',
  },
  {
    id: 'ghl-4',
    title: 'Client Notification: Appointment & SMS Reminders',
    platform: 'GHL',
    blurb:
      'Email reminders a day before, an hour before and five minutes before the appointment, plus an SMS reminder.',
    metrics: ['1d / 1h / 5m', 'Email + SMS'],
    image: 'https://i.imgur.com/vyzerBH.png',
  },
  {
    id: 'ghl-5',
    title: 'Sample Webpage',
    platform: 'GHL',
    blurb: 'A built landing page example — an ice cream shop page.',
    metrics: ['Landing page'],
    image: 'https://i.imgur.com/Bteqfba.png',
    href: 'https://app.gohighlevel.com/v2/preview/uJnrBWhFYue2S1jXGNLa?notrack=true',
  },
]

export function workflowsFor(platform: Platform): Project[] {
  return WORKFLOWS.filter((w) => w.platform === platform)
}

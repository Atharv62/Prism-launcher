import type { Service } from '../shared/types'
import { getServices, patch } from './store'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'

function metaContent(html: string, key: string) {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    if (new RegExp(`(?:property|name)=["']${key}["']`, 'i').test(tag)) return tag.match(/content=["']([^"']+)["']/i)?.[1]
  }
}

/** Biggest icon the page declares; apple-touch icons win because they are far larger than favicons. */
function bestIcon(html: string) {
  let best: { href: string; score: number } | undefined
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    const rel = tag.match(/rel=["']([^"']+)["']/i)?.[1].toLowerCase() ?? ''
    const href = tag.match(/href=["']([^"']+)["']/i)?.[1]
    if (!href || !rel.includes('icon') || rel.includes('mask-icon')) continue
    const score = (rel.includes('apple-touch') ? 1000 : 0) + +(tag.match(/sizes=["'](\d+)x/i)?.[1] ?? 0)
    if (!best || score > best.score) best = { href, score }
  }
  return best?.href
}

async function fetchMeta(url: string): Promise<{ poster?: string; icon?: string }> {
  try {
    const r = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(8000) })
    const html = (await r.text()).slice(0, 300_000)
    const abs = (c?: string) => {
      if (!c || c.startsWith('data:')) return // inline icons would bloat services.json
      try {
        return new URL(c.replace(/&amp;/g, '&'), r.url).href
      } catch {}
    }
    return { poster: abs(metaContent(html, 'og:image') ?? metaContent(html, 'twitter:image')), icon: abs(bestIcon(html)) }
  } catch {
    return {}
  }
}

const busy = new Set<string>()

/** Fetch site-level posters and icons for services that lack one (background, best effort). */
export function refreshPosters() {
  for (const s of getServices()) {
    if ((s.poster && s.icon) || busy.has(s.id)) continue
    busy.add(s.id)
    fetchMeta(s.url)
      .then(({ poster, icon }) => {
        const p: Partial<Service> = {}
        if (!s.poster && poster) p.poster = poster
        if (!s.icon && icon) p.icon = icon
        if (p.poster || p.icon) patch(s.id, p)
      })
      .finally(() => busy.delete(s.id))
  }
}

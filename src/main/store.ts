import { app, session } from 'electron'
import { copyFileSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import defaults from '../shared/services.json'
import type { Draft, Service } from '../shared/types'

const file = () => join(app.getPath('userData'), 'services.json')
export const profileDir = (id: string) => join(app.getPath('userData'), 'profiles', id)

let list: Service[] | null = null
let listener: (l: Service[]) => void = () => {}
export const onChange = (cb: (l: Service[]) => void) => (listener = cb)

export function getServices(): Service[] {
  if (!list) {
    try {
      list = JSON.parse(readFileSync(file(), 'utf8'))
    } catch (e) {
      // keep an unreadable file instead of silently overwriting it with the defaults on the next save
      if ((e as NodeJS.ErrnoException).code !== 'ENOENT') try { copyFileSync(file(), `${file()}.bak`) } catch {}
      list = defaults as Service[]
    }
  }
  return list!
}
export const getService = (id: string) => getServices().find((s) => s.id === id)

function commit(next: Service[]) {
  list = next
  writeFileSync(file(), JSON.stringify(next, null, 2))
  listener(next)
}

export function patch(id: string, p: Partial<Service>) {
  commit(getServices().map((s) => (s.id === id ? { ...s, ...p } : s)))
}

export function remove(id: string) {
  commit(getServices().filter((s) => s.id !== id))
  session.fromPartition(`persist:${id}`).clearStorageData()
  try {
    rmSync(profileDir(id), { recursive: true, force: true })
  } catch {} // an open App window keeps its profile files locked on Windows
}

const web = (v: unknown) => (typeof v === 'string' && /^https?:\/\//.test(v) ? v : undefined)

/** Replace all services from an imported file. Returns an error string, or null. */
export function replaceAll(raw: unknown): string | null {
  if (!Array.isArray(raw)) return 'Not a services file'
  const seen = new Set<string>()
  // id becomes a folder name (profileDir), so only plain ids are accepted (generated ids contain dots, e.g. youtube.com-ab12)
  const ok = raw.filter((s) => typeof s?.id === 'string' && /^(?!\.)[\w.-]+$/.test(s.id) && !seen.has(s.id) && seen.add(s.id) && typeof s.name === 'string' && web(s.url) && URL.canParse(s.url))
  if (!ok.length) return 'No valid services found'
  commit(
    ok.map((s): Service => ({
      id: s.id,
      name: s.name,
      url: s.url,
      color: typeof s.color === 'string' && /^(#[\da-f]{3,8}|hsl\([\d. %]+\))$/i.test(s.color) ? s.color : hue(domainOf(s.url)),
      mode: s.mode === 'embed' ? 'embed' : 'app',
      adblock: s.adblock !== false,
      allow: Array.isArray(s.allow) ? s.allow.filter((a: unknown) => typeof a === 'string') : [],
      poster: web(s.poster),
      icon: web(s.icon),
      zoom: typeof s.zoom === 'number' ? s.zoom : undefined,
      last: web(s.last?.url) && URL.canParse(s.last.url) ? { url: s.last.url, title: String(s.last.title ?? ''), poster: web(s.last.poster), at: typeof s.last.at === 'number' ? s.last.at : undefined } : undefined
    }))
  )
  return null
}

export function move(id: string, d: 1 | -1) {
  const l = [...getServices()]
  const i = l.findIndex((s) => s.id === id)
  const j = i + d
  if (i < 0 || j < 0 || j >= l.length) return
  ;[l[i], l[j]] = [l[j], l[i]]
  commit(l)
}

const SLD = ['co', 'com', 'org', 'net', 'gov', 'ac']
/** Approximate registrable domain; accepts a host or a URL. */
export function domainOf(v: string) {
  let h = v.trim().toLowerCase()
  try {
    if (h.includes('/')) h = new URL(h).hostname
  } catch {
    return ''
  }
  const p = h.replace(/^www\./, '').split('.')
  const n = p.length > 2 && p.at(-1)!.length === 2 && SLD.includes(p.at(-2)!) ? 3 : 2
  return p.slice(-n).join('.')
}

const hue = (s: string) => `hsl(${[...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7)} 55% 38%)`

/** Returns an error string, or null on success. */
export function save(d: Draft): string | null {
  let u: URL
  try {
    const raw = d.url.trim()
    u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
    if (!u.hostname.includes('.')) throw 0
  } catch {
    return 'Enter a valid URL'
  }
  const host = u.hostname.replace(/^www\./, '')
  const prev = d.id ? getService(d.id) : undefined
  const same = prev?.url === u.href
  const poster = d.poster?.trim()
  const s: Service = {
    id: prev?.id ?? `${host}-${Date.now().toString(36)}`,
    name: d.name.trim() || host.split('.')[0].replace(/^./, (c) => c.toUpperCase()),
    url: u.href,
    color: prev?.color ?? hue(host),
    mode: d.mode,
    adblock: d.adblock,
    allow: [...new Set(d.allow.map(domainOf).filter(Boolean))],
    poster: poster && (same || poster !== prev?.poster) ? poster : undefined,
    icon: same ? prev?.icon : undefined,
    zoom: prev?.zoom,
    last: same ? prev?.last : undefined
  }
  commit(prev ? getServices().map((x) => (x.id === s.id ? s : x)) : [...getServices(), s])
  return null
}

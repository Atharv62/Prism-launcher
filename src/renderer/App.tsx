import { Minus, Play, Settings as Gear, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Service, Settings } from '../shared/types'
import { Editor } from './Editor'
import { Hero } from './Hero'
import { Landing } from './Landing'
import { SettingsPanel } from './Settings'
import { Shelf } from './Shelf'
import { AddTile, Tile } from './Tile'
import { Tour } from './Tour'
import { type Pos, useKeyNav } from './useKeyNav'

const pill = 'grid h-[2.6vw] w-[2.6vw] place-items-center rounded-full bg-white/15 backdrop-blur'
const fmt = () => new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

function useClock() {
  const [t, setT] = useState(fmt)
  useEffect(() => {
    const i = setInterval(() => setT(fmt()), 10_000)
    return () => clearInterval(i)
  }, [])
  return t
}

const subtitle = (s?: Service) =>
  !s
    ? 'Add any streaming site to your launcher'
    : s.mode === 'app'
      ? 'Opens in its own app window'
      : s.adblock
        ? 'Embedded · ads & redirects blocked'
        : 'Embedded'

export default function App() {
  const [services, setServices] = useState<Service[]>([])
  const [editor, setEditor] = useState<Service | 'new' | null>(null)
  const [settings, setSettings] = useState(false)
  const [cfg, setCfg] = useState<Settings | null>(null)
  const [wall, setWall] = useState<string | null>(null)
  const [tour, setTour] = useState(false)
  const [rest, setRest] = useState(true) // landing page until the user hovers a tile or presses a key
  const clock = useClock()

  useEffect(() => {
    window.api.list().then(setServices)
    window.api.settings().then((c) => {
      setCfg(c)
      setTour(!c.tourDone)
    })
    window.api.wallpaper().then((r) => setWall(r.url))
    const offs = [window.api.onServices(setServices), window.api.onEdit(setEditor)]
    return () => offs.forEach((f) => f())
  }, [])

  const modal = !!editor || settings || tour
  const idleMs = (cfg?.idleSeconds ?? 6) * 1000
  // back to the landing page after a quiet spell (not while a dialog is open)
  useEffect(() => {
    if (rest || modal || !idleMs) return
    let t = setTimeout(() => setRest(true), idleMs)
    const bump = () => {
      clearTimeout(t)
      t = setTimeout(() => setRest(true), idleMs)
    }
    const ev = ['mousemove', 'mousedown', 'keydown', 'wheel']
    ev.forEach((e) => window.addEventListener(e, bump))
    return () => {
      clearTimeout(t)
      ev.forEach((e) => window.removeEventListener(e, bump))
    }
  }, [rest, modal, idleMs])
  // any key wakes it; that first key is not acted on (navigation is disabled while resting)
  useEffect(() => {
    if (!rest) return
    const wake = () => setRest(false)
    window.addEventListener('keydown', wake)
    return () => window.removeEventListener('keydown', wake)
  }, [rest])

  const shelf = services.filter((s) => s.last).sort((a, b) => (b.last!.at ?? 0) - (a.last!.at ?? 0))
  const clearLast = (id: string) => void window.api.patch(id, { last: undefined })
  const select = ({ row, col }: Pos) => {
    if (row === 0) return void window.api.open(shelf[col].id, true)
    if (col === services.length) return setEditor('new')
    void window.api.open(services[col].id)
  }
  const move = (col: number, d: 1 | -1) => {
    const ok = col < services.length && col + d >= 0 && col + d < services.length
    if (ok) window.api.move(services[col].id, d)
    return ok
  }
  const { row, col, setPos } = useKeyNav([shelf.length, services.length + 1], select, move, !modal && !rest, (i) => clearLast(shelf[i].id))
  const focusAt = (p: Pos) => {
    setRest(false)
    setPos((c) => (c.row === p.row && c.col === p.col ? c : p))
  }
  const s = row === 0 ? shelf[col] : services[col]
  // recents show their own artwork; services show the site's, never the last-watched poster
  const poster = row === 0 ? (s?.last?.poster ?? s?.poster) : s?.poster
  const hero = poster ?? s?.icon ?? (s && `https://www.google.com/s2/favicons?sz=128&domain=${new URL(s.url).hostname}`)

  return (
    <main className="relative h-full overflow-clip bg-black text-white">
      <div className={`absolute inset-0 transition-opacity duration-700 ${rest ? 'pointer-events-none opacity-0' : ''}`}>
      <div className="absolute inset-0 transition-[background-color] duration-700" style={{ backgroundColor: s?.color ?? '#3f3f46' }} />
      <div className="absolute inset-0 bg-[radial-gradient(80%_70%_at_75%_15%,rgba(255,255,255,.28),transparent)]" />
      <Hero url={hero} poster={!!poster} />
      <div className="absolute inset-0 opacity-20 transition-[background-color] duration-700" style={{ backgroundColor: s?.color ?? '#3f3f46' }} />
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/40 to-black" />

      <div key={`${row}-${s?.id}`} className="absolute left-[4vw] top-[9vh]">
        <h1 className="rise text-[5vw] font-bold leading-none tracking-tight drop-shadow-lg">{s?.name ?? 'Add a service'}</h1>
        <p style={{ animationDelay: '60ms' }} className="rise mt-[1vw] max-w-[50vw] truncate text-[1.3vw] text-white/80">{row === 0 && s?.last ? s.last.title : subtitle(s)}</p>
        {s && (
          <div style={{ animationDelay: '120ms' }} className="rise mt-[1.5vw] flex gap-[1vw]">
            {s.last && (
              <button
                onClick={() => window.api.open(s.id, true)}
                className="flex max-w-[34vw] items-center gap-[0.5vw] rounded-full bg-white px-[1.6vw] py-[0.6vw] text-[1.1vw] font-medium text-black hover:bg-white/90"
              >
                <Play className="h-[1vw] w-[1vw] shrink-0" fill="currentColor" />
                <span className="truncate">Continue · {s.last.title}</span>
              </button>
            )}
            <button
              onClick={() => window.api.patch(s.id, { mode: s.mode === 'app' ? 'embed' : 'app' })}
              className="rounded-full bg-white/20 px-[1.6vw] py-[0.6vw] text-[1.1vw] backdrop-blur hover:bg-white/30"
            >
              Switch to {s.mode === 'app' ? 'Embedded' : 'App'}
            </button>
          </div>
        )}
      </div>
      </div>
      <Landing show={rest} name={cfg?.name ?? ''} wall={wall} latest={shelf[0]} clock={clock} />

      <div className="absolute right-[3vw] top-[4vh] flex items-center gap-[0.8vw]">
        <button onClick={() => setSettings(true)} title="Settings" className={`${pill} hover:bg-white/25`}>
          <Gear className="h-[1.3vw] w-[1.3vw]" strokeWidth={1.8} />
        </button>
        <div className={`rounded-full bg-white/15 px-[1.2vw] py-[0.5vw] text-[1.1vw] backdrop-blur transition-opacity duration-500 ${rest ? 'opacity-0' : ''}`}>{clock}</div>
        <button onClick={() => window.api.nav('minimize')} title="Minimize" className={`${pill} hover:bg-white/25`}>
          <Minus className="h-[1.3vw] w-[1.3vw]" strokeWidth={1.8} />
        </button>
        <button onClick={() => window.api.nav('close')} title="Close" className={`${pill} hover:bg-red-500/70`}>
          <X className="h-[1.3vw] w-[1.3vw]" strokeWidth={1.8} />
        </button>
      </div>

      {shelf.length > 0 && (
        <Shelf items={shelf} focus={!rest && row === 0 ? col : -1} onFocus={(i) => focusAt({ row: 0, col: i })} onOpen={(x) => window.api.open(x.id, true)} onRemove={(x) => clearLast(x.id)} />
      )}

      <div className="absolute inset-x-[2.5vw] bottom-[3vh] rounded-[2.2vw] bg-white/10 ring-1 ring-white/15 backdrop-blur-2xl">
        <div
          className="flex gap-[1.4vw] overflow-x-auto px-[1.4vw] pb-[3.4vw] pt-[1.6vw]"
          style={{ scrollPaddingInline: '3vw' }}
          onWheel={(e) => (e.currentTarget.scrollLeft += e.deltaY)}
        >
          {services.map((x, i) => (
            <Tile key={x.id} s={x} focused={!rest && row === 1 && col === i} onFocus={() => focusAt({ row: 1, col: i })} onClick={() => select({ row: 1, col: i })} />
          ))}
          <AddTile
            focused={!rest && row === 1 && col === services.length}
            onFocus={() => focusAt({ row: 1, col: services.length })}
            onClick={() => select({ row: 1, col: services.length })}
          />
        </div>
      </div>

      {editor && <Editor svc={editor === 'new' ? undefined : editor} onClose={() => setEditor(null)} />}
      {settings && (
        <SettingsPanel
          onClose={() => setSettings(false)}
          onChange={(p) => setCfg((c) => c && { ...c, ...p })}
          wall={wall}
          onWall={setWall}
          onTour={() => {
            setSettings(false)
            setTour(true)
          }}
        />
      )}
      {tour && (
        <Tour
          name={cfg?.name ?? ''}
          onDone={(name, dont) => {
            void window.api.setSettings({ name, tourDone: dont })
            setCfg((c) => c && { ...c, name: name.trim(), tourDone: dont })
            setTour(false)
          }}
        />
      )}
    </main>
  )
}

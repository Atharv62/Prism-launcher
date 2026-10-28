import { Play } from 'lucide-react'
import type { Service } from '../shared/types'

// Blob colours per time of day, keyed by the hour they start at. Plain CSS: no library, and nothing animates behind the frosted dock.
const SKY: [number, string[]][] = [
  [0, ['#1e1b4b', '#4c1d95', '#0f172a']], // night
  [5, ['#fb923c', '#ec4899', '#6366f1']], // dawn
  [8, ['#38bdf8', '#6366f1', '#22d3ee']], // day
  [17, ['#f97316', '#db2777', '#7c3aed']], // evening
  [21, ['#1e1b4b', '#4c1d95', '#0f172a']] // night
]

export const sky = (h: number) => {
  const [a, b, c] = SKY.filter(([from]) => h >= from).at(-1)![1]
  return `radial-gradient(60% 70% at 15% 20%, ${a}cc, transparent 70%), radial-gradient(55% 65% at 85% 25%, ${b}cc, transparent 70%), radial-gradient(80% 70% at 50% 105%, ${c}, transparent 75%), #0b0b14`
}

export const greet = (h: number) => (h < 5 || h >= 21 ? 'Good night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening')

export const ago = (at: number) => {
  const m = Math.max(0, Math.round((Date.now() - at) / 60000))
  return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`
}

type Props = { show: boolean; name: string; wall: string | null; latest?: Service; clock: string }

/** What the home screen shows at rest: greeting, time and one-click resume over a time-of-day gradient or the user's wallpaper. */
export function Landing({ show, name, wall, latest, clock }: Props) {
  const now = new Date()
  const h = now.getHours()
  return (
    <div className={`absolute inset-0 transition-opacity duration-700 ${show ? '' : 'pointer-events-none opacity-0'}`}>
      {wall ? <img src={wall} className="absolute inset-0 h-full w-full object-cover" /> : <div className="absolute inset-0" style={{ background: sky(h) }} />}
      <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/85" />
      <div className="absolute left-[4vw] top-[9vh]">
        <p className="text-[1.3vw] font-medium uppercase tracking-[0.2em] text-white/70">
          {now.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        <p className="mt-[0.5vw] text-[9vw] font-light leading-none tracking-tight drop-shadow-lg">{clock}</p>
        <h1 className="mt-[1vw] text-[2.6vw] font-semibold drop-shadow-lg">
          {greet(h)}
          {name && `, ${name}`}
        </h1>
        {latest?.last ? (
          <div className="mt-[1.5vw] flex items-center gap-[1vw]">
            <button
              onClick={() => window.api.open(latest.id, true)}
              className="flex max-w-[34vw] items-center gap-[0.5vw] rounded-full bg-white px-[1.6vw] py-[0.6vw] text-[1.1vw] font-medium text-black hover:bg-white/90"
            >
              <Play className="h-[1vw] w-[1vw] shrink-0" fill="currentColor" />
              <span className="truncate">Continue · {latest.last.title}</span>
            </button>
            <span className="text-[1vw] text-white/70">
              {latest.name}
              {latest.last.at ? ` · ${ago(latest.last.at)}` : ''}
            </span>
          </div>
        ) : (
          <p className="mt-[1.5vw] text-[1.2vw] text-white/70">Pick a service below to start watching</p>
        )}
      </div>
    </div>
  )
}

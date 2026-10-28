import { useEffect, useState } from 'react'
import type { Settings } from '../shared/types'

const MAP: Record<string, string> = { ' ': 'Space', Escape: 'Esc', ArrowUp: 'Up', ArrowDown: 'Down', ArrowLeft: 'Left', ArrowRight: 'Right' }

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between">
      {label}
      <button
        type="button"
        onClick={() => onChange(!on)}
        className={`h-7 w-12 rounded-full p-0.5 transition ${on ? 'bg-emerald-500' : 'bg-white/20'}`}
      >
        <span className={`block h-6 w-6 rounded-full bg-white transition ${on ? 'translate-x-5' : ''}`} />
      </button>
    </label>
  )
}

type Props = {
  onClose: () => void
  onChange: (p: Partial<Settings>) => void
  wall: string | null
  onWall: (url: string | null) => void
  onTour: () => void
}

const SIZES = [1, 1.25, 1.5, 1.75, 2]
const IDLE: [number, string][] = [[6, '6 seconds'], [15, '15 seconds'], [30, '30 seconds'], [0, 'Never']]

export function SettingsPanel({ onClose, onChange, wall, onWall, onTour }: Props) {
  const [s, setS] = useState<Settings | null>(null)
  const [msg, setMsg] = useState('')
  useEffect(() => void window.api.settings().then(setS), [])
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const apply = async (p: Partial<Settings>) => {
    const err = await window.api.setSettings(p)
    setMsg(err ?? '')
    if (!err) {
      setS((x) => x && { ...x, ...p })
      onChange(p)
    }
  }
  const pick = async (a: 'pick' | 'clear') => {
    const r = await window.api.wallpaper(a)
    setMsg(r.error ?? '')
    onWall(r.url)
  }
  const capture = (e: React.KeyboardEvent) => {
    e.preventDefault()
    if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return
    if (!e.ctrlKey && !e.altKey && !e.metaKey) return setMsg('Hotkey needs Ctrl, Alt or Win')
    const key = MAP[e.key] ?? (e.key.length === 1 ? e.key.toUpperCase() : e.key)
    apply({ hotkey: [e.ctrlKey && 'Ctrl', e.altKey && 'Alt', e.shiftKey && 'Shift', e.metaKey && 'Super', key].filter(Boolean).join('+') })
  }
  const imp = async () => setMsg((await window.api.importServices()) ?? '')

  const btn = 'rounded-xl bg-white/10 px-4 py-2 hover:bg-white/20'
  return (
    <div className="fixed inset-0 z-20 grid place-items-center bg-black/60 backdrop-blur-md" onMouseDown={onClose}>
      <div onMouseDown={(e) => e.stopPropagation()} className="w-[30rem] space-y-5 rounded-3xl bg-zinc-900 p-8 text-white shadow-2xl">
        <h2 className="text-2xl font-semibold">Settings</h2>
        {s && (
          <>
            <Switch label="Launch at login" on={s.openAtLogin} onChange={(v) => apply({ openAtLogin: v })} />
            <Switch label="Start fullscreen" on={s.fullscreen} onChange={(v) => apply({ fullscreen: v })} />
            <label className="flex items-center justify-between gap-4">
              <span>Your name</span>
              <input
                defaultValue={s.name}
                maxLength={40}
                placeholder="Optional"
                onBlur={(e) => apply({ name: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                className="w-44 rounded-xl bg-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-white/40"
              />
            </label>
            <label className="flex items-center justify-between gap-4">
              <span>Landing page after</span>
              <select value={s.idleSeconds} onChange={(e) => apply({ idleSeconds: +e.target.value })} className="w-44 rounded-xl bg-white/10 px-3 py-2 outline-none">
                {IDLE.map(([v, l]) => (
                  <option key={v} value={v} className="bg-zinc-800">
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center justify-between gap-4">
              <span>Watching top bar size</span>
              <select value={s.overlayScale} onChange={(e) => apply({ overlayScale: +e.target.value })} className="w-44 rounded-xl bg-white/10 px-3 py-2 outline-none">
                {SIZES.map((v) => (
                  <option key={v} value={v} className="bg-zinc-800">
                    {v * 100}%
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-center justify-between gap-4">
              <span>Landing wallpaper</span>
              <div className="flex gap-2">
                <button className={btn} onClick={() => pick('pick')}>
                  {wall ? 'Change' : 'Choose'}
                </button>
                {wall && (
                  <button className={btn} onClick={() => pick('clear')}>
                    Remove
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>Summon hotkey</span>
              <div className="flex gap-2">
                <input readOnly value={s.hotkey || 'None'} onKeyDown={capture} title="Click and press a combination" className="w-44 rounded-xl bg-white/10 px-3 py-2 text-center outline-none focus:ring-2 focus:ring-white/40" />
                <button className={btn} onClick={() => apply({ hotkey: '' })}>
                  Clear
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button className={btn} onClick={onTour}>
                Show tour
              </button>
              <button className={btn} onClick={() => window.api.exportServices()}>
                Export services
              </button>
              <button className={btn} onClick={imp}>
                Import services
              </button>
            </div>
          </>
        )}
        {msg && <p className="text-sm text-amber-300">{msg}</p>}
        <div className="flex justify-end">
          <button onClick={onClose} className="rounded-xl bg-white px-5 py-2 font-medium text-black">
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

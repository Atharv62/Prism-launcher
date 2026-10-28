import { useEffect, useState } from 'react'
import { PRESETS } from '../shared/presets'
import type { Service } from '../shared/types'

const field = 'w-full rounded-xl bg-white/10 px-4 py-3 outline-none focus:ring-2 focus:ring-white/40'

export function Editor({ svc, onClose }: { svc?: Service; onClose: () => void }) {
  const [f, setF] = useState({
    url: svc?.url ?? '',
    name: svc?.name ?? '',
    mode: svc?.mode ?? 'embed',
    adblock: svc?.adblock ?? true,
    allow: svc?.allow.join(', ') ?? '',
    poster: svc?.poster ?? ''
  })
  const [err, setErr] = useState('')
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }))

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const r = await window.api.save({ id: svc?.id, ...f, allow: f.allow.split(/[\s,]+/).filter(Boolean) })
    if (r) setErr(r)
    else onClose()
  }

  return (
    <div className="fixed inset-0 grid place-items-center bg-black/60 backdrop-blur-md" onMouseDown={onClose}>
      <form
        onSubmit={submit}
        onMouseDown={(e) => e.stopPropagation()}
        className="w-[30rem] space-y-4 rounded-3xl bg-zinc-900 p-8 text-white shadow-2xl"
      >
        <h2 className="text-2xl font-semibold">{svc ? 'Edit service' : 'Add service'}</h2>
        {!svc && (
          <div className="flex max-h-28 flex-wrap gap-2 overflow-y-auto">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => setF((x) => ({ ...x, url: p.url, name: p.name, mode: p.mode }))}
                className="rounded-full bg-white/10 px-3 py-1 text-sm hover:bg-white/20"
              >
                {p.name}
              </button>
            ))}
          </div>
        )}
        <input autoFocus className={field} placeholder="Website URL" value={f.url} onChange={(e) => set('url', e.target.value)} />
        <input className={field} placeholder="Name (optional)" value={f.name} onChange={(e) => set('name', e.target.value)} />
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-white/10 p-1">
          {(['embed', 'app'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => set('mode', m)}
              className={`rounded-lg py-2 ${f.mode === m ? 'bg-white text-black' : ''}`}
            >
              {m === 'app' ? 'Open as App' : 'Embedded'}
            </button>
          ))}
        </div>
        {f.mode === 'embed' && (
          <>
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={f.adblock} onChange={(e) => set('adblock', e.target.checked)} />
              Block ads, popups &amp; redirects
            </label>
            <input
              className={field}
              placeholder="Allowed redirect domains (comma separated)"
              value={f.allow}
              onChange={(e) => set('allow', e.target.value)}
            />
          </>
        )}
        <input className={field} placeholder="Poster image URL (optional, auto-detected)" value={f.poster} onChange={(e) => set('poster', e.target.value)} />
        {err && <p className="text-sm text-red-400">{err}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="rounded-xl px-5 py-2 hover:bg-white/10">
            Cancel
          </button>
          <button className="rounded-xl bg-white px-5 py-2 font-medium text-black">Save</button>
        </div>
      </form>
    </div>
  )
}

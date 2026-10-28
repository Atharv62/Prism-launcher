import { useEffect, useState } from 'react'

const Tip = ({ className, children }: { className: string; children: React.ReactNode }) => (
  <div className={`absolute max-w-[22vw] rounded-2xl bg-white/20 px-[1vw] py-[0.6vw] text-[1vw] leading-snug ${className}`}>{children}</div>
)

/** First-run welcome: asks for a name and labels where everything is. Positions use the same vw/vh units as the home layout. */
export function Tour({ name, onDone }: { name: string; onDone: (name: string, dontShow: boolean) => void }) {
  const [n, setN] = useState(name)
  const [dont, setDont] = useState(true)
  const done = () => onDone(n, dont)
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && done()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  })

  return (
    <div className="fixed inset-0 z-30 bg-black/70 text-white">
      <Tip className="right-[3vw] top-[10vh] text-right">
        ↑ Settings, minimise and close
        <br />
        Your name, wallpaper, hotkey and backup live in Settings
      </Tip>
      <Tip className="left-[4vw] top-[10vh]">Hover or use the arrow keys to preview a service. Enter opens it, 1 to 9 jump straight to one.</Tip>
      <Tip className="bottom-[calc(3vh+25.5vw)] left-[4vw]">Continue Watching shows what you last watched. Use ✕ or Delete to remove an item.</Tip>
      <Tip className="bottom-[calc(3vh+13.4vw)] left-[4vw]">↓ Your services. Right-click a tile for options, Ctrl + ← / → reorders.</Tip>
      <Tip className="bottom-[calc(3vh+13.4vw)] right-[3vw] text-right">+ adds any site ↓</Tip>

      <div className="absolute left-1/2 top-[22vh] w-[30rem] -translate-x-1/2 space-y-4 rounded-3xl bg-zinc-900 p-8 shadow-2xl">
        <h2 className="text-2xl font-semibold">Welcome to Prism</h2>
        <label className="block space-y-2 text-sm text-white/70">
          What should we call you?
          <input
            autoFocus
            value={n}
            maxLength={40}
            placeholder="Your name (optional)"
            onChange={(e) => setN(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && done()}
            className="w-full rounded-xl bg-white/10 px-3 py-2 text-base text-white outline-none focus:ring-2 focus:ring-white/40"
          />
        </label>
        <p className="text-sm text-white/70">While watching: move the mouse to the top edge for controls, Alt + Home comes back here, Esc leaves fullscreen.</p>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={dont} onChange={(e) => setDont(e.target.checked)} />
          Don't show this again
        </label>
        <div className="flex justify-end">
          <button onClick={done} className="rounded-xl bg-white px-5 py-2 font-medium text-black">
            Let's go
          </button>
        </div>
      </div>
    </div>
  )
}

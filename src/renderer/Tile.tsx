import { useEffect, useRef, useState } from 'react'
import type { Service } from '../shared/types'

type Common = { focused: boolean; onFocus: () => void; onClick: () => void }

const POINTER_VARS = ['--px', '--py', '--mx', '--my']

function Base({ focused, onFocus, onClick, bg, label, children, onContextMenu }: Common & {
  bg: string
  label: string
  children: React.ReactNode
  onContextMenu?: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (focused) ref.current?.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' })
  }, [focused])
  // Pointer position drives tilt and shine through CSS variables (no re-render per mouse move).
  const move = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    el.style.setProperty('--px', String(x - 0.5))
    el.style.setProperty('--py', String(y - 0.5))
    el.style.setProperty('--mx', `${x * 100}%`)
    el.style.setProperty('--my', `${y * 100}%`)
  }
  const reset = (e: React.MouseEvent<HTMLDivElement>) => POINTER_VARS.forEach((k) => e.currentTarget.style.removeProperty(k))
  return (
    <div
      ref={ref}
      role="button"
      onMouseEnter={onFocus}
      onMouseMove={(e) => {
        onFocus()
        move(e)
      }}
      onMouseLeave={reset}
      onClick={onClick}
      onContextMenu={onContextMenu}
      style={{
        background: bg,
        transform: focused ? 'perspective(700px) rotateY(calc(var(--px, 0) * 14deg)) rotateX(calc(var(--py, 0) * -14deg)) scale(1.1)' : undefined
      }}
      className={`spring relative grid aspect-[5/3] w-[11vw] shrink-0 cursor-pointer place-items-center rounded-[1.1vw] transition-[transform,box-shadow] duration-[250ms] ${
        focused
          ? 'z-10 shadow-[0_1.5vw_3vw_rgba(0,0,0,.6),inset_0_0_0_1px_rgba(255,255,255,.25)]'
          : 'shadow-[inset_0_0_0_1px_rgba(255,255,255,.1)]'
      }`}
    >
      <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-gradient-to-b from-white/25 to-transparent" />
      <div
        className={`pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300 ${focused ? 'opacity-100' : 'opacity-0'}`}
        style={{ background: 'radial-gradient(circle at var(--mx, 50%) var(--my, 20%), rgba(255,255,255,.35), transparent 60%)' }}
      />
      <div className="relative grid place-items-center">{children}</div>
      <span
        className={`absolute -bottom-[2.4vw] whitespace-nowrap text-[1.1vw] font-medium transition-opacity ${
          focused ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {label}
      </span>
    </div>
  )
}

export function Tile({ s, ...p }: Common & { s: Service }) {
  // dark brand-tinted tile so icons that share the brand colour (Netflix, YouTube) still stand out
  // the site's own icon first, then the favicon service, then a letter
  const srcs = [s.icon, `https://www.google.com/s2/favicons?sz=128&domain=${new URL(s.url).hostname}`].filter(Boolean) as string[]
  const [i, setI] = useState(0)
  useEffect(() => setI(0), [s.icon])
  return (
    <Base {...p} bg={`linear-gradient(160deg, color-mix(in srgb, ${s.color} 55%, #18181b), color-mix(in srgb, ${s.color} 25%, #000))`} label={s.name} onContextMenu={() => window.api.menu(s.id)}>
      {i >= srcs.length ? (
        <span className="text-[3vw] font-bold">{s.name[0]}</span>
      ) : (
        <img
          key={srcs[i]}
          className="h-[4.4vw] w-[4.4vw] rounded-[1vw] object-contain shadow-[0_0.4vw_1vw_rgba(0,0,0,.35)]"
          src={srcs[i]}
          referrerPolicy="no-referrer"
          onError={() => setI(i + 1)}
        />
      )}
    </Base>
  )
}

export const AddTile = (p: Common) => (
  <Base {...p} bg="rgb(255 255 255 / 0.14)" label="Add service">
    <span className="text-[3vw] font-light">+</span>
  </Base>
)

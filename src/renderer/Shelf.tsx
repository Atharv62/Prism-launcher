import { X } from 'lucide-react'
import type { Service } from '../shared/types'

type Props = { items: Service[]; focus: number; onFocus: (i: number) => void; onOpen: (s: Service) => void; onRemove: (s: Service) => void }

export function Shelf({ items, focus, onFocus, onOpen, onRemove }: Props) {
  return (
    <div className="absolute inset-x-[2.5vw] bottom-[calc(3vh+12.6vw)]">
      <p className="px-[1.4vw] text-[1.1vw] font-semibold text-white/70">Continue Watching</p>
      <div className="flex gap-[1.2vw] overflow-x-auto px-[1.4vw] py-[0.8vw]" style={{ scrollPaddingInline: '3vw' }} onWheel={(e) => (e.currentTarget.scrollLeft += e.deltaY)}>
        {items.map((s, i) => {
          const poster = s.last?.poster ?? s.poster
          const focused = focus === i
          return (
            <div
              key={s.id}
              role="button"
              onMouseEnter={() => onFocus(i)}
              onMouseMove={() => onFocus(i)}
              onClick={() => onOpen(s)}
              ref={(el) => void (focused && el?.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' }))}
              style={{ background: s.color }}
              className={`relative aspect-video w-[16vw] shrink-0 cursor-pointer overflow-hidden rounded-[0.9vw] spring transition duration-[250ms] ${
                focused ? 'scale-105 shadow-[0_1.2vw_2.4vw_rgba(0,0,0,.6),inset_0_0_0_1px_rgba(255,255,255,.25)]' : 'opacity-80'
              }`}
            >
              {poster && <img src={poster} referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
              <button
                title="Remove from Continue Watching"
                onClick={(e) => {
                  e.stopPropagation()
                  onRemove(s)
                }}
                className={`absolute right-[0.5vw] top-[0.5vw] grid h-[1.8vw] w-[1.8vw] place-items-center rounded-full bg-black/55 transition-opacity hover:bg-black/80 ${focused ? 'opacity-100' : 'opacity-0'}`}
              >
                <X className="h-[1vw] w-[1vw]" strokeWidth={2} />
              </button>
              <div className="absolute inset-x-[0.8vw] bottom-[0.6vw]">
                <div className="line-clamp-2 text-[1vw] font-medium leading-tight">{s.last?.title}</div>
                <div className="text-[0.8vw] text-white/60">{s.name}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

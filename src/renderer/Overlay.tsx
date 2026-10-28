import {
  AlertTriangle, ChevronLeft, ChevronRight, ExternalLink, Globe, Home, Maximize, Minimize2, Minus, MoreHorizontal, Pin,
  PictureInPicture2, RotateCw, ShieldCheck, ShieldOff, Volume2, VolumeX, X, ZoomIn, ZoomOut, type LucideIcon
} from 'lucide-react'
import { useEffect, useState } from 'react'
import type { NavAction, OverlayState } from '../shared/types'

type BtnProps = { icon: LucideIcon; tip: string; onClick: () => void; active?: boolean; disabled?: boolean; badge?: number }

function Btn({ icon: Icon, tip, onClick, active, disabled, badge }: BtnProps) {
  return (
    <button
      title={tip}
      disabled={disabled}
      onClick={onClick}
      className={`relative grid h-9 w-9 shrink-0 place-items-center rounded-xl transition hover:bg-white/15 disabled:opacity-30 disabled:hover:bg-transparent ${
        active ? 'bg-white/20 text-white' : 'text-white/75'
      }`}
    >
      <Icon size={18} strokeWidth={1.8} />
      {!!badge && (
        <span className="absolute -right-0.5 -top-0.5 rounded-full bg-emerald-500 px-1 text-[9px] font-semibold leading-4 text-white">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  )
}

const Sep = () => <span className="mx-1 h-5 w-px shrink-0 bg-white/15" />

export default function Overlay() {
  const [s, setS] = useState<OverlayState | null>(null)
  const [iconOk, setIconOk] = useState(true)
  useEffect(() => window.api.onOverlay(setS), [])
  useEffect(() => setIconOk(true), [s?.icon])
  const go = (a: NavAction) => () => window.api.nav(a)
  const open = !!s?.open
  const z = s?.scale ?? 1

  return (
    <div className="h-full w-full" onMouseEnter={() => window.api.hover(true)} onMouseLeave={() => window.api.hover(false)}>
      <div style={{ width: `${100 / z}%`, transform: `scale(${z})`, transformOrigin: 'top left' }}>
        {!open && <div className="mx-auto h-1 w-28 rounded-full bg-white/35" />}
        {s && (
          <div className={`transition duration-200 ${open ? 'translate-y-0 opacity-100' : '-translate-y-3 opacity-0'}`}>
            <div className="relative mt-2 overflow-hidden rounded-2xl bg-zinc-900/90 text-white shadow-2xl ring-1 ring-white/15">
              <div className="flex h-12 items-center gap-0.5 px-2">
                <Btn icon={Home} tip="Home (Alt+Home)" onClick={go('home')} />
                <Sep />
                <Btn icon={ChevronLeft} tip="Back (Alt+←)" onClick={go('back')} disabled={!s.canBack} />
                <Btn icon={ChevronRight} tip="Forward (Alt+→)" onClick={go('forward')} disabled={!s.canForward} />
                <Btn icon={RotateCw} tip="Reload (F5)" onClick={go('reload')} />
                <div className="mx-2 flex min-w-0 flex-1 items-center gap-2">
                  {s.icon && iconOk ? (
                    <img src={s.icon} className="h-5 w-5 shrink-0 rounded" onError={() => setIconOk(false)} />
                  ) : (
                    <Globe size={18} className="shrink-0 text-white/50" />
                  )}
                  <div className="min-w-0 leading-tight">
                    <div className="truncate text-xs font-medium">{s.title}</div>
                    <div className="truncate text-[10px] text-white/50">{s.host}</div>
                  </div>
                </div>
                <Btn
                  icon={s.adblock ? ShieldCheck : ShieldOff}
                  tip={`Ad & redirect blocking: ${s.adblock ? 'on' : 'off'} (reloads)`}
                  active={s.adblock}
                  badge={s.adblock ? s.blocked : 0}
                  onClick={() => window.api.patch(s.id, { adblock: !s.adblock })}
                />
                <Btn icon={s.muted ? VolumeX : Volume2} tip="Mute (Ctrl+M)" active={s.muted} onClick={go('mute')} />
                <Btn icon={PictureInPicture2} tip="Picture-in-picture (Alt+P)" onClick={go('pip')} />
                <Btn icon={Pin} tip="Keep window on top" active={s.pinned} onClick={go('pin')} />
                <Sep />
                <Btn icon={ZoomOut} tip="Zoom out (Ctrl+−)" onClick={go('zoomOut')} />
                {s.zoom !== 1 && (
                  <button className="w-10 text-[11px] text-white/70 hover:text-white" title="Reset zoom" onClick={go('zoomReset')}>
                    {Math.round(s.zoom * 100)}%
                  </button>
                )}
                <Btn icon={ZoomIn} tip="Zoom in (Ctrl++)" onClick={go('zoomIn')} />
                <Sep />
                <Btn icon={s.fullscreen ? Minimize2 : Maximize} tip={s.fullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen (F11)'} onClick={go('fullscreen')} />
                <Btn icon={MoreHorizontal} tip="More" onClick={go('menu')} />
                {s.fullscreen && (
                  <>
                    <Sep />
                    <Btn icon={Minus} tip="Minimize" onClick={go('minimize')} />
                    <Btn icon={X} tip="Close Prism" onClick={go('close')} />
                  </>
                )}
              </div>
              {s.loading && (
                <div className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden bg-white/10">
                  <div className="h-full w-1/3 animate-[slide_1.1s_linear_infinite] bg-white" />
                </div>
              )}
            </div>
            {s.error && (
              <div className="mt-2 flex items-center gap-3 rounded-2xl bg-zinc-900/95 px-4 py-3 text-sm text-white ring-1 ring-red-400/40">
                <AlertTriangle size={20} className="shrink-0 text-red-400" />
                <div className="min-w-0 flex-1">
                  <div className="truncate">Couldn’t load {s.host || 'this page'}</div>
                  <div className="text-xs text-white/50">{s.error}</div>
                </div>
                <button onClick={go('reload')} className="rounded-lg bg-white px-3 py-1.5 font-medium text-black">
                  Retry
                </button>
                <Btn icon={ExternalLink} tip="Open in browser" onClick={go('external')} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

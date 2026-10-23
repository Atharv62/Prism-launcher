export type Mode = 'app' | 'embed'

export type Service = {
  id: string
  name: string
  url: string
  color: string
  mode: Mode
  adblock: boolean
  allow: string[]
  poster?: string
  icon?: string
  zoom?: number
  last?: { url: string; title: string; poster?: string; at?: number }
}

export type Draft = Pick<Service, 'url' | 'name' | 'mode' | 'adblock' | 'allow'> & { id?: string; poster?: string }

export type Settings = { openAtLogin: boolean; fullscreen: boolean; hotkey: string; name: string; idleSeconds: number; tourDone: boolean }

export type NavAction =
  | 'home' | 'back' | 'forward' | 'reload' | 'fullscreen' | 'mute'
  | 'zoomIn' | 'zoomOut' | 'zoomReset' | 'pip' | 'pin' | 'menu' | 'external' | 'minimize' | 'close'

export type OverlayState = {
  id: string
  name: string
  mode: Mode
  adblock: boolean
  open: boolean
  title: string
  host: string
  icon?: string
  loading: boolean
  canBack: boolean
  canForward: boolean
  muted: boolean
  zoom: number
  pinned: boolean
  blocked: number
  error?: string
}

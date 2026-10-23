import { session, shell, WebContentsView, type BrowserWindow, type WebContents } from 'electron'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { NavAction, OverlayState, Service } from '../shared/types'
import { applyAdblock, onBlocked } from './adblock'
import { domainOf, getService, patch, profileDir } from './store'

const PILL_W = 820
const BAR_H = 64
const ERR_H = 140
const HANDLE = 6
const DENY = ['notifications', 'geolocation', 'midi', 'media', 'clipboard-read', 'display-capture']
// Google (and other OAuth) refuse sign-in from embedded browsers; a Firefox identity is accepted.
const FIREFOX = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0'
const AUTH = ['accounts.google.com', 'accounts.youtube.com', 'appleid.apple.com', 'login.microsoftonline.com', 'login.live.com', 'discord.com', 'www.facebook.com']
const isAuth = (url: string) => {
  try {
    return AUTH.includes(new URL(url).hostname)
  } catch {
    return false
  }
}

const PIP = `(() => {
  if (document.pictureInPictureElement) { document.exitPictureInPicture(); return true }
  const v = [...document.querySelectorAll('video')].filter((v) => v.readyState > 0)
    .sort((a, b) => b.videoWidth * b.videoHeight - a.videoWidth * a.videoHeight)[0]
  if (!v) return false
  v.disablePictureInPicture = false
  v.requestPictureInPicture().catch(() => {})
  return true
})()`

let win: BrowserWindow
let overlay: WebContentsView
let view: WebContentsView | null = null
let active: string | null = null
let expanded = false
let hovered = false
let pinned = false
let blocked = 0
let icon: string | undefined
let error: string | undefined
let fsPrev: boolean | null = null
let timer: NodeJS.Timeout | undefined
let blockTimer: NodeJS.Timeout | undefined

export function loadRenderer(wc: WebContents, hash = '') {
  if (process.env.ELECTRON_RENDERER_URL) wc.loadURL(process.env.ELECTRON_RENDERER_URL + (hash && `#${hash}`))
  else wc.loadFile(join(__dirname, '../renderer/index.html'), { hash })
}

export function initViews(w: BrowserWindow, preload: string) {
  win = w
  overlay = new WebContentsView({ webPreferences: { preload } })
  overlay.setBackgroundColor('#00000000')
  loadRenderer(overlay.webContents, 'overlay')
  win.on('resize', layout)
  onBlocked((tabId) => {
    if (!view || tabId !== view.webContents.id) return
    blocked++
    blockTimer ??= setTimeout(() => {
      blockTimer = undefined
      sendState()
    }, 300)
  })
}

function layout() {
  if (!view) return
  const [w, h] = win.getContentSize()
  view.setBounds({ x: 0, y: 0, width: w, height: h })
  const bw = Math.min(PILL_W, w - 24)
  overlay.setBounds({ x: Math.round((w - bw) / 2), y: 0, width: bw, height: expanded ? (error ? ERR_H : BAR_H) : HANDLE })
}

function setOpen(v: boolean) {
  expanded = v
  layout()
  sendState()
}

/** Mouse entered/left the bar; closing is delayed so it doesn't flicker. */
export function hover(v: boolean) {
  hovered = v
  clearTimeout(timer)
  if (v) setOpen(true)
  else timer = setTimeout(() => !hovered && setOpen(!!error), 350)
}

function peek() {
  setOpen(true)
  clearTimeout(timer)
  timer = setTimeout(() => !hovered && setOpen(!!error), 2500)
}

function sendState() {
  const s = active ? getService(active) : undefined
  if (!view || !s) return
  const wc = view.webContents
  let host = ''
  try {
    host = new URL(wc.getURL()).hostname.replace(/^www\./, '')
  } catch {}
  overlay.webContents.send('overlay', {
    id: s.id,
    name: s.name,
    mode: s.mode,
    adblock: s.adblock,
    open: expanded,
    title: wc.getTitle() || s.name,
    host,
    icon,
    loading: wc.isLoading(),
    canBack: wc.navigationHistory.canGoBack(),
    canForward: wc.navigationHistory.canGoForward(),
    muted: wc.isAudioMuted(),
    zoom: s.zoom ?? 1,
    pinned,
    blocked,
    error
  } satisfies OverlayState)
}

const findBrowser = () => {
  const bins = ['Microsoft\\Edge\\Application\\msedge.exe', 'Google\\Chrome\\Application\\chrome.exe']
  const roots = [process.env['ProgramFiles(x86)'], process.env.ProgramFiles, process.env.LOCALAPPDATA]
  return bins.flatMap((b) => roots.map((r) => r && join(r, b))).find((p) => p && existsSync(p))
}

function launchApp(s: Service, url = s.url) {
  const bin = findBrowser()
  if (!bin) return void shell.openExternal(url)
  spawn(
    bin,
    [`--app=${url}`, `--user-data-dir=${profileDir(s.id)}`, '--no-first-run', '--no-default-browser-check'],
    { detached: true, stdio: 'ignore' }
  ).unref()
}

const permitted = (s: Service, url: string) => {
  const d = domainOf(url)
  return isAuth(url) || d === domainOf(s.url) || s.allow.includes(d)
}

/** Record the current page as the resume point (continue watching). */
async function capture(wc: WebContents, id: string) {
  const s = getService(id)
  if (!s || wc.isDestroyed() || !wc.getURL()) return
  const u = new URL(wc.getURL())
  if (u.pathname.length <= 1 || u.href === s.url || u.href === s.last?.url || domainOf(u.href) !== domainOf(s.url)) return
  const poster: string = await wc
    .executeJavaScript(
      `(() => { const c = document.querySelector('meta[property="og:image"]')?.content; return c ? new URL(c, location.href).href : '' })()`
    )
    .catch(() => '')
  if (wc.isDestroyed()) return
  patch(id, { last: { url: u.href, title: wc.getTitle(), poster: poster || undefined, at: Date.now() } })
}

function wire(wc: WebContents, id: string) {
  const svc = () => getService(id)!
  let initial = true // redirects while loading the start URL (mirror domains) are trusted

  wc.setWindowOpenHandler(({ url }) => {
    if (isAuth(url))
      return { action: 'allow', overrideBrowserWindowOptions: { parent: win, width: 500, height: 720, autoHideMenuBar: true } }
    if (!svc().adblock || permitted(svc(), url)) wc.loadURL(url)
    return { action: 'deny' }
  })
  wc.on('did-create-window', (child) => child.webContents.setUserAgent(FIREFOX))

  const guard = (e: Electron.Event & { url: string; isMainFrame: boolean }) => {
    const s = svc()
    if (!initial && e.isMainFrame && s.adblock && !permitted(s, e.url)) e.preventDefault()
  }
  wc.on('will-navigate', guard)
  wc.on('will-redirect', guard)

  let capTimer: NodeJS.Timeout
  const schedule = () => {
    clearTimeout(capTimer)
    capTimer = setTimeout(() => capture(wc, id), 1500)
  }
  wc.on('did-finish-load', schedule)
  wc.on('did-navigate-in-page', schedule)

  wc.once('did-stop-loading', () => {
    initial = false
    const d = domainOf(wc.getURL())
    const s = svc()
    if (d && !permitted(s, d)) patch(id, { allow: [...s.allow, d] })
  })

  const zoom = () => wc.setZoomFactor(svc().zoom ?? 1)
  wc.on('dom-ready', zoom)
  wc.on('did-navigate', zoom)

  wc.on('did-start-navigation', (e) => {
    if (!e.isMainFrame || e.isSameDocument) return
    blocked = 0
    if (error) {
      error = undefined
      layout()
    }
  })
  wc.on('did-fail-load', (_e, code, desc, _url, isMain) => {
    if (!isMain || code === -3) return
    error = desc
    peek()
  })
  const upd = () => sendState()
  wc.on('did-start-loading', upd)
  wc.on('did-stop-loading', upd)
  wc.on('page-title-updated', upd)
  wc.on('did-navigate', upd)
  wc.on('did-navigate-in-page', upd)
  wc.on('page-favicon-updated', (_e, f) => {
    icon = f[0]
    sendState()
  })

  wc.on('enter-html-full-screen', () => {
    fsPrev = win.isFullScreen()
    win.setFullScreen(true)
  })
  wc.on('leave-html-full-screen', () => {
    win.setFullScreen(fsPrev ?? false)
    fsPrev = null
  })

  wc.on('before-input-event', (e, i) => {
    if (i.type !== 'keyDown') return
    const k = i.key.toLowerCase()
    const a: NavAction | undefined =
      i.alt && k === 'home' ? 'home'
      : i.alt && k === 'arrowleft' ? 'back'
      : i.alt && k === 'arrowright' ? 'forward'
      : i.alt && k === 'p' ? 'pip'
      : k === 'f5' || (i.control && k === 'r') ? 'reload'
      : k === 'f11' ? 'fullscreen'
      : i.control && k === 'm' ? 'mute'
      : i.control && (k === '=' || k === '+') ? 'zoomIn'
      : i.control && k === '-' ? 'zoomOut'
      : i.control && k === '0' ? 'zoomReset'
      : undefined
    if (a) {
      e.preventDefault()
      nav(a)
    }
  })
}

function prepare(ses: Electron.Session) {
  ses.setUserAgent(ses.getUserAgent().replace(/\s(Electron|prism-launcher|Prism)\/\S+/gi, ''))
  ses.setPermissionRequestHandler((_wc, perm, cb) => cb(!DENY.includes(perm)))
  ses.webRequest.onBeforeSendHeaders({ urls: ['*://accounts.google.com/*', '*://accounts.youtube.com/*'] }, (d, cb) => {
    const h = { ...d.requestHeaders }
    for (const k of Object.keys(h)) if (k.toLowerCase().startsWith('sec-ch-')) delete h[k]
    h['User-Agent'] = FIREFOX
    cb({ requestHeaders: h })
  })
}

export function open(s: Service, url = s.url) {
  if (s.mode === 'app') return launchApp(s, url)
  closeView()
  const ses = session.fromPartition(`persist:${s.id}`)
  prepare(ses)
  applyAdblock(ses, s.adblock)

  view = new WebContentsView({ webPreferences: { session: ses } })
  view.setBackgroundColor('#111')
  active = s.id
  blocked = 0
  error = undefined
  icon = undefined
  wire(view.webContents, s.id)
  win.contentView.addChildView(view)
  win.contentView.addChildView(overlay)
  peek()
  view.webContents.loadURL(url)
  view.webContents.focus()
}

export function closeView() {
  if (!view) return
  clearTimeout(timer)
  win.contentView.removeChildView(view)
  win.contentView.removeChildView(overlay)
  view.webContents.close()
  view = null
  active = null
  expanded = hovered = false
  if (pinned) win.setAlwaysOnTop(false)
  pinned = false
  if (fsPrev !== null) win.setFullScreen(fsPrev)
  fsPrev = null
  win.webContents.focus()
}

/** Re-apply a service's settings after it changed while its view is open. */
export function refresh(id: string) {
  const s = getService(id)
  if (!view || active !== id || !s) return
  if (s.mode === 'app') {
    closeView()
    return launchApp(s)
  }
  applyAdblock(view.webContents.session, s.adblock)
  sendState()
  view.webContents.reload()
}

async function pip(wc: WebContents) {
  for (const f of wc.mainFrame.framesInSubtree) {
    if (await f.executeJavaScript(PIP, true).catch(() => false)) return
  }
}

export function nav(a: NavAction) {
  if (a === 'fullscreen') return win.setFullScreen(!win.isFullScreen())
  if (a === 'minimize') return win.minimize()
  if (a === 'close') return win.close()
  const wc = view?.webContents
  if (!wc || !active) return
  const h = wc.navigationHistory
  switch (a) {
    case 'home': return closeView()
    case 'back': h.canGoBack() && h.goBack(); break
    case 'forward': h.canGoForward() && h.goForward(); break
    case 'reload': return wc.reload()
    case 'mute': wc.setAudioMuted(!wc.isAudioMuted()); break
    case 'zoomIn':
    case 'zoomOut':
    case 'zoomReset': {
      const cur = getService(active)?.zoom ?? 1
      const z = a === 'zoomReset' ? 1 : Math.min(3, Math.max(0.5, Math.round((cur + (a === 'zoomIn' ? 0.1 : -0.1)) * 10) / 10))
      patch(active, { zoom: z === 1 ? undefined : z })
      wc.setZoomFactor(z)
      break
    }
    case 'pin': pinned = !pinned; win.setAlwaysOnTop(pinned); break
    case 'pip': return void pip(wc)
    case 'external': return void shell.openExternal(wc.getURL())
  }
  sendState()
}

export const activeId = () => active
export const currentUrl = () => view?.webContents.getURL()
export async function clearSiteData() {
  if (!view) return
  await view.webContents.session.clearStorageData()
  view.webContents.reload()
}

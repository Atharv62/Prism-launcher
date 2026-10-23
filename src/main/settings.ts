import { app, dialog, globalShortcut, type BrowserWindow, type Rectangle } from 'electron'
import { copyFileSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import type { Settings } from '../shared/types'

type Saved = { fullscreen: boolean; hotkey: string; name: string; idleSeconds: number; tourDone: boolean; wallpaper: string; bounds?: Rectangle }

const file = () => join(app.getPath('userData'), 'settings.json')
let saved: Saved = { fullscreen: false, hotkey: 'Ctrl+Alt+L', name: '', idleSeconds: 6, tourDone: false, wallpaper: '' }
const persist = () => writeFileSync(file(), JSON.stringify(saved))

export function loadSettings() {
  try {
    saved = { ...saved, ...JSON.parse(readFileSync(file(), 'utf8')) }
  } catch {}
  return saved
}

export const saveBounds = (b: Rectangle) => {
  saved.bounds = b
  persist()
}

export const getSettings = (): Settings => ({
  openAtLogin: app.getLoginItemSettings().openAtLogin,
  fullscreen: saved.fullscreen,
  hotkey: saved.hotkey,
  name: saved.name,
  idleSeconds: saved.idleSeconds,
  tourDone: saved.tourDone
})

export function applyHotkey(win: BrowserWindow, key = saved.hotkey): string | null {
  globalShortcut.unregisterAll()
  if (!key) return null
  try {
    const ok = globalShortcut.register(key, () => {
      if (win.isMinimized()) win.restore()
      win.show()
      win.focus()
    })
    return ok ? null : 'Hotkey unavailable (already in use?)'
  } catch {
    return 'Invalid hotkey'
  }
}

export function setSettings(win: BrowserWindow, p: Partial<Settings>): string | null {
  if (p.openAtLogin !== undefined) app.setLoginItemSettings({ openAtLogin: p.openAtLogin })
  if (p.fullscreen !== undefined) saved.fullscreen = p.fullscreen
  if (p.name !== undefined) saved.name = String(p.name).trim().slice(0, 40)
  if (p.idleSeconds !== undefined) saved.idleSeconds = Math.max(0, Math.min(3600, Math.round(+p.idleSeconds) || 0))
  if (p.tourDone !== undefined) saved.tourDone = !!p.tourDone
  let err: string | null = null
  if (p.hotkey !== undefined) {
    err = applyHotkey(win, p.hotkey)
    if (err) applyHotkey(win)
    else saved.hotkey = p.hotkey
  }
  persist()
  return err
}

const MIME: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }
const wallPath = () => join(app.getPath('userData'), saved.wallpaper)
const readWallpaper = () => {
  try {
    return saved.wallpaper ? `data:${MIME[extname(saved.wallpaper).slice(1)]};base64,${readFileSync(wallPath()).toString('base64')}` : null
  } catch {
    return null
  }
}

/** Custom landing wallpaper: a copy lives in userData and the UI gets it as a data URL (file:// is blocked in dev). */
export async function wallpaper(win: BrowserWindow, action?: 'pick' | 'clear'): Promise<{ url: string | null; error?: string }> {
  if (action === 'clear') {
    if (saved.wallpaper) rmSync(wallPath(), { force: true })
    saved.wallpaper = ''
    persist()
  }
  if (action === 'pick') {
    const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'Images', extensions: Object.keys(MIME) }] })
    const src = r.filePaths[0]
    if (src) {
      const ext = extname(src).slice(1).toLowerCase()
      if (!MIME[ext] || statSync(src).size > 15e6) return { url: readWallpaper(), error: 'Choose a JPG, PNG or WebP under 15 MB' }
      if (saved.wallpaper) rmSync(wallPath(), { force: true })
      saved.wallpaper = `wallpaper.${ext}`
      copyFileSync(src, wallPath())
      persist()
    }
  }
  return { url: readWallpaper() }
}

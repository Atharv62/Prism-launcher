import { app, BrowserWindow, clipboard, dialog, globalShortcut, ipcMain, Menu, screen, shell } from 'electron'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Draft, NavAction, Service, Settings } from '../shared/types'
import { refreshPosters } from './meta'
import { applyHotkey, getSettings, loadSettings, saveBounds, setSettings, wallpaper } from './settings'
import { getService, getServices, move, onChange, patch, remove, replaceAll, save } from './store'
import { activeId, clearSiteData, closeView, currentUrl, hover, initViews, loadRenderer, nav, open, refresh } from './views'

const JSON_FILTER = [{ name: 'JSON', extensions: ['json'] }]

app.whenReady().then(() => {
  Menu.setApplicationMenu(null)
  const saved = loadSettings()
  const preload = join(__dirname, '../preload/index.js')
  const b = saved.bounds
  const onScreen = b && screen.getAllDisplays().some((d) => b.x < d.bounds.x + d.bounds.width && b.x + b.width > d.bounds.x && b.y < d.bounds.y + d.bounds.height && b.y + b.height > d.bounds.y)
  const win = new BrowserWindow({
    ...(onScreen ? b : { width: 1280, height: 720 }),
    backgroundColor: '#000',
    webPreferences: { preload }
  })
  if (saved.fullscreen) win.setFullScreen(true)
  win.on('close', () => saveBounds(win.getNormalBounds()))
  initViews(win, preload)
  loadRenderer(win.webContents)
  applyHotkey(win)
  win.webContents.on('before-input-event', (e, i) => {
    if (i.type === 'keyDown' && i.key === 'F11') {
      win.setFullScreen(!win.isFullScreen())
      e.preventDefault()
    }
  })

  onChange((l) => win.webContents.send('services', l))
  const update = (id: string, p: Partial<Service>) => {
    patch(id, p)
    refresh(id)
  }

  function barMenu() {
    const id = activeId()
    const s = id ? getService(id) : undefined
    if (!id || !s) return
    Menu.buildFromTemplate([
      { label: 'Open in browser', click: () => shell.openExternal(currentUrl() ?? s.url) },
      { label: 'Copy link', click: () => clipboard.writeText(currentUrl() ?? s.url) },
      { type: 'separator' },
      { label: 'Open this site as App', click: () => update(id, { mode: 'app' }) },
      { label: 'Sign out & clear site data', click: () => clearSiteData() }
    ]).popup({ window: win })
  }

  refreshPosters()
  ipcMain.handle('list', () => getServices())
  ipcMain.handle('open', (_, id: string, resume?: boolean) => {
    const s = getService(id)
    if (s) open(s, resume ? s.last?.url : undefined)
  })
  ipcMain.handle('save', (_, d: Draft) => {
    const err = save(d)
    if (!err) refreshPosters()
    return err
  })
  ipcMain.handle('move', (_, id: string, d: 1 | -1) => move(id, d))
  ipcMain.handle('patch', (_, id: string, p: Partial<Service>) => update(id, p))
  ipcMain.on('nav', (_, a: NavAction) => (a === 'menu' ? barMenu() : nav(a)))
  ipcMain.on('hover', (_, v: boolean) => hover(v))

  ipcMain.handle('wallpaper', (_, a?: 'pick' | 'clear') => wallpaper(win, a))
  ipcMain.handle('settings', () => getSettings())
  ipcMain.handle('setSettings', (_, p: Partial<Settings>) => setSettings(win, p))
  ipcMain.handle('export', async () => {
    const r = await dialog.showSaveDialog(win, { defaultPath: 'prism-services.json', filters: JSON_FILTER })
    if (!r.canceled && r.filePath) writeFileSync(r.filePath, JSON.stringify(getServices(), null, 2))
  })
  ipcMain.handle('import', async () => {
    const r = await dialog.showOpenDialog(win, { filters: JSON_FILTER, properties: ['openFile'] })
    if (r.canceled) return null
    try {
      const err = replaceAll(JSON.parse(readFileSync(r.filePaths[0], 'utf8')))
      if (!err) refreshPosters()
      return err
    } catch {
      return 'Could not read file'
    }
  })

  ipcMain.on('menu', (_, id: string) => {
    const s = getService(id)
    if (!s) return
    const i = getServices().findIndex((x) => x.id === id)
    const last = getServices().length - 1
    Menu.buildFromTemplate([
      { label: 'Open as App', type: 'radio', checked: s.mode === 'app', click: () => update(id, { mode: 'app' }) },
      { label: 'Open Embedded', type: 'radio', checked: s.mode === 'embed', click: () => update(id, { mode: 'embed' }) },
      {
        label: 'Block ads && redirects',
        type: 'checkbox',
        checked: s.adblock,
        enabled: s.mode === 'embed',
        click: () => update(id, { adblock: !s.adblock })
      },
      { type: 'separator' },
      { label: 'Move Left', enabled: i > 0, click: () => move(id, -1) },
      { label: 'Move Right', enabled: i < last, click: () => move(id, 1) },
      { label: 'Refresh poster & icon', click: () => { patch(id, { poster: undefined, icon: undefined }); refreshPosters() } },
      { label: 'Clear resume point', enabled: !!s.last, click: () => update(id, { last: undefined }) },
      { type: 'separator' },
      { label: 'Edit…', click: () => win.webContents.send('edit', s) },
      {
        label: 'Remove',
        click: () => {
          const ok = dialog.showMessageBoxSync(win, {
            type: 'question',
            buttons: ['Remove', 'Cancel'],
            defaultId: 1,
            cancelId: 1,
            message: `Remove ${s.name}?`
          })
          if (ok === 0) {
            if (activeId() === id) closeView()
            remove(id)
          }
        }
      }
    ]).popup({ window: win })
  })
})

app.on('will-quit', () => globalShortcut.unregisterAll())
app.on('window-all-closed', () => app.quit())

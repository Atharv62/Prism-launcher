import { contextBridge, ipcRenderer } from 'electron'

const sub = <T>(ch: string, cb: (v: T) => void) => {
  const h = (_: unknown, v: T) => cb(v)
  ipcRenderer.on(ch, h)
  return () => void ipcRenderer.removeListener(ch, h)
}
const call = (ch: string) => (...a: unknown[]) => ipcRenderer.invoke(ch, ...a)
const send = (ch: string) => (...a: unknown[]) => ipcRenderer.send(ch, ...a)

contextBridge.exposeInMainWorld('api', {
  list: call('list'),
  open: call('open'),
  save: call('save'),
  move: call('move'),
  patch: call('patch'),
  settings: call('settings'),
  wallpaper: call('wallpaper'),
  setSettings: call('setSettings'),
  exportServices: call('export'),
  importServices: call('import'),
  menu: send('menu'),
  nav: send('nav'),
  hover: send('hover'),
  onServices: (cb: (v: unknown) => void) => sub('services', cb),
  onEdit: (cb: (v: unknown) => void) => sub('edit', cb),
  onOverlay: (cb: (v: unknown) => void) => sub('overlay', cb)
})

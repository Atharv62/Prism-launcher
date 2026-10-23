import { app, type Session } from 'electron'
import { ElectronBlocker } from '@ghostery/adblocker-electron'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

let blockedCb: (tabId: number) => void = () => {}
export const onBlocked = (cb: (tabId: number) => void) => (blockedCb = cb)

let engine: Promise<ElectronBlocker | null> | undefined

const getEngine = () =>
  (engine ??= ElectronBlocker.fromPrebuiltAdsAndTracking(fetch, {
    path: join(app.getPath('userData'), 'adblock-engine.bin'),
    read: readFile,
    write: writeFile
  })
    .then((b) => {
      b.on('request-blocked', (r) => blockedCb(r.tabId))
      return b
    })
    .catch((e) => {
    console.error('adblock engine unavailable:', e)
    return null
  }))

export async function applyAdblock(ses: Session, on: boolean) {
  const b = await getEngine()
  if (!b) return
  if (on) b.enableBlockingInSession(ses)
  else b.disableBlockingInSession(ses)
}

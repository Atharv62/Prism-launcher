import type { Draft, NavAction, OverlayState, Service, Settings } from '../shared/types'

declare global {
  interface Window {
    api: {
      list(): Promise<Service[]>
      open(id: string, resume?: boolean): Promise<void>
      save(d: Draft): Promise<string | null>
      move(id: string, d: 1 | -1): Promise<void>
      patch(id: string, p: Partial<Service>): Promise<void>
      settings(): Promise<Settings>
      wallpaper(a?: 'pick' | 'clear'): Promise<{ url: string | null; error?: string }>
      setSettings(p: Partial<Settings>): Promise<string | null>
      exportServices(): Promise<void>
      importServices(): Promise<string | null>
      menu(id: string): void
      nav(a: NavAction): void
      hover(v: boolean): void
      onServices(cb: (v: Service[]) => void): () => void
      onEdit(cb: (v: Service) => void): () => void
      onOverlay(cb: (v: OverlayState) => void): () => void
    }
  }
}
export {}

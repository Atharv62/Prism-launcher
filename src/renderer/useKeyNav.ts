import { useEffect, useState } from 'react'

export type Pos = { row: number; col: number }

/** Rows: 0 = Continue Watching shelf, 1 = dock (services + add tile). */
export function useKeyNav(
  counts: [number, number],
  onSelect: (p: Pos) => void,
  onMove: (col: number, d: 1 | -1) => boolean,
  enabled: boolean,
  onRemove?: (col: number) => void
) {
  const [raw, setRaw] = useState<Pos>({ row: 1, col: 0 })
  const row = counts[0] === 0 ? 1 : raw.row
  const col = Math.max(0, Math.min(raw.col, counts[row] - 1))

  useEffect(() => {
    if (!enabled) return
    const h = (e: KeyboardEvent) => {
      const services = counts[1] - 1
      if (e.key === 'Enter') return onSelect({ row, col })
      if ((e.key === 'Delete' || e.key === 'Backspace') && row === 0) return onRemove?.(col)
      if (/^[1-9]$/.test(e.key)) {
        const n = +e.key - 1
        return n < services ? onSelect({ row: 1, col: n }) : undefined
      }
      if (e.key === 'ArrowUp' && row === 1 && counts[0]) return setRaw({ row: 0, col: Math.min(col, counts[0] - 1) })
      if (e.key === 'ArrowDown' && row === 0) return setRaw({ row: 1, col: Math.min(col, services) })
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
      if (!d) return
      if (e.ctrlKey && row === 1) {
        if (onMove(col, d)) setRaw({ row, col: col + d })
      } else setRaw({ row, col: Math.max(0, Math.min(col + d, counts[row] - 1)) })
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [counts[0], counts[1], row, col, onSelect, onMove, onRemove, enabled])

  return { row, col, setPos: setRaw }
}

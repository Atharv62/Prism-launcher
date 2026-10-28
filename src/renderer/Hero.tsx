import { useEffect, useState } from 'react'

type Layer = { url: string; poster: boolean }

/** Keeps the previous image underneath until the next one has loaded, so focus changes crossfade instead of flashing. */
export function Hero({ url, poster }: { url?: string; poster: boolean }) {
  const [layers, setLayers] = useState<Layer[]>([])

  useEffect(() => {
    if (!url) return void setLayers([])
    let live = true
    let t: ReturnType<typeof setTimeout> | undefined
    const next = { url, poster }
    const im = new Image()
    im.referrerPolicy = 'no-referrer'
    im.onload = () => {
      if (!live) return
      setLayers((l) => [...l.slice(-1), next])
      t = setTimeout(() => live && setLayers([next]), 900) // old layer is gone by now
    }
    im.onerror = () => live && setLayers([])
    const d = setTimeout(() => (im.src = url), 150)
    return () => {
      live = false
      clearTimeout(d)
      clearTimeout(t)
    }
  }, [url, poster])

  const newest = layers.at(-1)
  return layers.map((l, i) => {
    // a poster covers the layer below it; a faint icon does not, so the old one has to fade out
    const hide = i < layers.length - 1 && !newest?.poster
    return l.poster ? (
      <img
        key={l.url}
        src={l.url}
        referrerPolicy="no-referrer"
        className="absolute inset-0 animate-[fade_.8s_ease-out] h-full w-full object-cover transition-opacity duration-700"
        style={{ opacity: hide ? 0 : 1 }}
      />
    ) : (
      <img
        key={l.url}
        src={l.url}
        referrerPolicy="no-referrer"
        className="absolute right-[8vw] top-[6vh] h-[28vw] w-[28vw] animate-[fade_.6s] blur-sm transition-opacity duration-700"
        style={{ opacity: hide ? 0 : 0.2 }}
      />
    )
  })
}

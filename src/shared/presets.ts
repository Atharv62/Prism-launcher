import type { Mode } from './types'

const app = (name: string, url: string) => ({ name, url, mode: 'app' as Mode })
const embed = (name: string, url: string) => ({ name, url, mode: 'embed' as Mode })

// DRM-protected services default to App (Edge, Widevine L1); open-web ones can run embedded.
export const PRESETS = [
  app('Netflix', 'https://www.netflix.com'),
  app('Prime Video', 'https://www.primevideo.com'),
  app('JioHotstar', 'https://www.hotstar.com'),
  app('Disney+', 'https://www.disneyplus.com'),
  app('YouTube', 'https://www.youtube.com'),
  app('YouTube Music', 'https://music.youtube.com'),
  app('SonyLIV', 'https://www.sonyliv.com'),
  app('ZEE5', 'https://www.zee5.com'),
  app('Apple TV', 'https://tv.apple.com'),
  app('Hulu', 'https://www.hulu.com'),
  app('Max', 'https://www.max.com'),
  app('Paramount+', 'https://www.paramountplus.com'),
  app('Peacock', 'https://www.peacocktv.com'),
  app('Crunchyroll', 'https://www.crunchyroll.com'),
  app('Spotify', 'https://open.spotify.com'),
  app('MX Player', 'https://www.mxplayer.in'),
  embed('Twitch', 'https://www.twitch.tv'),
  embed('Kick', 'https://kick.com'),
  embed('Vimeo', 'https://vimeo.com'),
  embed('Dailymotion', 'https://www.dailymotion.com'),
  embed('Pluto TV', 'https://pluto.tv')
]

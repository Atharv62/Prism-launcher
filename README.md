# Prism

A focused, tvOS-style home screen for everything you stream. One place to open your services, pick up where you left off, and watch without a browser full of tabs, bookmarks and distractions.

Desktop app for Windows, built with Electron, React and TypeScript.

## The problem

Watching things on a computer usually means a regular browser: dozens of tabs, ads and pop-ups, a different login on every site, and no single answer to "what was I watching?". Each service lives in its own bookmark, and getting back to an episode means remembering where you were.

## What it does

Prism replaces that with one full-screen launcher, closer to a streaming box than a browser:

- **One home screen** with a big hero for the selected service, a dock of all your services, and a clock.
- **A calm landing page at rest:** a greeting with your name, the time, and a one-click Continue button over a time-of-day gradient or your own wallpaper. It appears on launch and after a quiet spell, and gives way to the service preview as soon as you hover or press a key.
- **A short first-run tour** that asks your name and labels where everything is, with a "don't show again" option.
- **Continue Watching** shelf that remembers the last page you were on, so one click resumes it.
- **Two ways to open a service**, chosen per service, so sites that refuse to run embedded still work:
  - **Embedded**: the site opens inside the launcher, with a small auto-hiding control bar at the top.
  - **App mode**: the site opens in its own Edge or Chrome app window, with a separate profile per service. This is the default for DRM-protected services (Netflix, Prime Video, Disney+ and similar).
- **Ads and redirects blocked** in embedded mode, per service, with a counter in the bar.
- **Logins kept separate** per service, and Google, Apple and Microsoft sign-in popups work.
- **Easy navigation** with keyboard, mouse or scroll wheel.

## Features

### Home

- Hovering a Continue Watching item shows its own poster; hovering a service shows that site's artwork, never a last-watched poster.
- Remove a recent with the small ✕ on its card or the Delete key.
- Hero artwork and title for the focused service; sharp site icons and posters are fetched automatically from each site.
- Dock of services in one scrolling row, with tilt and shine on hover.
- Right-click a tile to open as App or Embedded, toggle ad blocking, move left or right, refresh poster and icon, clear the resume point, edit, or remove.
- Add any site by URL, or pick from a built-in list of popular services.
- Minimise and close buttons, plus F11 for fullscreen.

### Embedded bar

Move the mouse to the top edge to reveal it.

- Back, forward, reload
- Mute, zoom in or out, picture-in-picture, pin on top
- Open the page in your browser, copy the link, sign out and clear site data
- Page title, site, loading state and an error screen if a page fails to load

### Settings

- Your name (used in the greeting)
- How long before the landing page returns: 6, 15 or 30 seconds, or never
- Landing wallpaper: choose or remove a JPG, PNG or WebP (up to 15 MB); otherwise the time-of-day gradient is used
- Show the welcome tour again
- Open at login
- Start fullscreen
- Global hotkey to bring the launcher to the front (default `Ctrl+Alt+L`)
- Export and import your services as a JSON file
- Window size and position are remembered

## Keyboard shortcuts

| Where | Keys | Action |
| --- | --- | --- |
| Home | Arrow keys | Move between shelf and dock |
| Home | Enter | Open the focused item |
| Home | Delete / Backspace | Remove the focused Continue Watching item |
| Home | 1 to 9 | Open the Nth service |
| Home | Ctrl + Left/Right | Reorder services |
| Embedded | Alt + Home | Back to the launcher |
| Embedded | Alt + Left/Right | Back / forward |
| Embedded | Alt + P | Picture-in-picture |
| Embedded | F5 or Ctrl + R | Reload |
| Embedded | Ctrl + M | Mute |
| Embedded | Ctrl + `+` / `-` / `0` | Zoom in / out / reset |
| Anywhere | F11 | Toggle fullscreen |

## Install

Download the latest installer or portable `.exe` from the [Releases](https://github.com/Atharv62/Prism-launcher/releases) page.

The installer is not code-signed yet, so Windows SmartScreen may warn you. Choose **More info**, then **Run anyway**.

## Run from source

```bash
git clone https://github.com/Atharv62/Prism-launcher.git
cd Prism-launcher
npm install
npm run dev      # run in development
npm run dist     # build a Windows installer and portable exe into dist/
```

Requires Node.js 22 or newer and, for App mode, Microsoft Edge or Google Chrome. The app icon is `build/icon.ico`; replace it with your own 256 x 256 `.ico`.

To publish a release, push a version tag (`git tag v0.1.0 && git push origin v0.1.0`). A GitHub Actions workflow builds the installer and attaches it to the release.

## Project structure

```
src/
  main/        Electron main process
    index.ts     window, menus, IPC handlers
    views.ts     embedded view, control bar, App-mode launching, resume capture
    store.ts     services list (services.json), import/export validation
    settings.ts  settings, global hotkey, window bounds, landing wallpaper
    meta.ts      fetches posters and icons from each site
    adblock.ts   ad and tracker blocking engine
  preload/     safe bridge between main and renderer
  renderer/    React UI
    App.tsx      home screen
    Hero.tsx     crossfading background
    Landing.tsx  greeting, clock and gradient/wallpaper at rest
    Tour.tsx     first-run welcome and walkthrough
    Tile.tsx     dock tiles
    Shelf.tsx    Continue Watching
    Editor.tsx, Settings.tsx, Overlay.tsx, useKeyNav.ts
  shared/      types, presets, default services
build/         app icon
```

Your data lives in the app's user-data folder (`%APPDATA%\Prism`): `services.json`, `settings.json`, your landing `wallpaper.*` copy, and one `profiles/<service>` folder per service.

## Built with

Electron, electron-vite, React 19, Tailwind CSS 4, TypeScript, lucide-react, and the Ghostery ad blocker.

## Known issues

- YouTube Shorts can misbehave in Embedded mode. Try turning off ad blocking for that service (right-click its tile), or switch it to App mode.
- DRM services such as Netflix and Prime Video do not play embedded and need App mode.
- The installer is unsigned (see Install).

## Limits and non-goals

- Windows only for now.
- Resume ("Continue Watching") works for embedded services; App-mode services open at their start page.
- DRM services such as Netflix and Prime Video are meant to run in App mode, not embedded.
- No search, folders, cloud sync, gamepad or remote support.
- Mouse and keyboard only.
- This is a test build, not a polished release.

## Disclaimer

Prism is a launcher. It does not host, download or unlock any content, and it does not bypass paywalls or DRM. You need your own accounts. Ad blocking is optional per service; check each site's terms before using it. All service names and logos belong to their respective owners, and this project is not affiliated with any of them.

## Contributing

Issues and small pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE) © 2026 Atharv Nikam

# RepLens React PWA

A mobile-first React + TypeScript interface built with Vite and Tailwind CSS. Its visual direction adapts the [Ronas IT reference](https://dribbble.com/shots/23816920-Fitness-Mobile-App-Design): charcoal surfaces, amber actions, exercise-led screens and restrained statistics. Original SVG artwork and line icons are local assets. Sora is loaded through its Google Fonts stylesheet with system fallback. There are no emoji or third-party image calls. This font stylesheet requires a connection unless the browser already cached it; it is not included in the public-shell service-worker cache.

## Run

From the repository root:

```bash
pnpm install
pnpm dev:frontend
```

Open http://localhost:5173. `pnpm dev` starts the frontend and NestJS backend together. The interface itself does not require the health API to render. Vite proxies future `/api` requests to port 3000; production forwarding awaits the real VPS domain.

## Implemented interface

- App-style Home with a single featured curl, a session action, a guide row and recent-session empty state. No landing-page tutorial or decorative badges.
- Searchable library of 14 exercise guides with body-area filters, equipment/muscle information, movement instructions, form tips and ACE reference links. Detail pages use `#guide/exercise-id` and preserve library filters when going back. Only the simultaneous curl guide links to camera preview.
- Live-session page with actual video-only camera access, permission error handling, camera switching, framing cues and a configurable preview countdown/timer.
- Camera tracks stop on navigation, tab backgrounding and component cleanup, including late permission responses. No MediaRecorder or video upload is used.
- History empty state; previews are not presented as completed exercise sessions.
- Profile with browser-local camera/countdown preferences and installation guidance.
- Account form designs with native validation. These do not send credentials, create accounts or sign users in; that requires Better Auth integration.
- Bottom navigation on phones, sidebar on larger screens, hash navigation with browser Back support, keyboard focus styles and a native modal dialog.

Rep tracking, RIR inference, authenticated history and saved sessions remain unimplemented. Rep and RIR fields display unavailable marks rather than example predictions. The athlete artwork is illustrative; it is not tracked footage.

## PWA

The manifest includes standalone mode and local app icons. After Vite builds, `scripts/build-sw.mjs` generates a service worker with a content-versioned cache of the public app shell. It is registered in production only, leaving normal Vite development untouched.

```bash
pnpm --filter @replens/frontend build
pnpm --filter @replens/frontend preview
```

Test installation/offline behavior in this production preview or on HTTPS Netlify hosting. Visit online first so the shell is cached, then reload once the worker is active and test offline. A new worker waits for existing app tabs to close before activation. Installing the PWA does not install a trained predictor.

Only static shell assets are cached. Auth/API requests, model files, camera footage and private data are excluded. Camera preferences alone use localStorage. The first load requires a connection; offline account/history access is not implemented. Browser-specific camera, installation and offline behavior still needs actual device testing.

Netlify builds from the repo root with `pnpm --filter @replens/frontend build` and publishes `web/frontend/dist`; `netlify.toml` defines it. Camera access requires HTTPS or localhost. A plain HTTP LAN address on a phone is not sufficient.

## Files to read

| File | Purpose |
|---|---|
| `src/App.tsx` | App shell, navigation, preferences and account dialog |
| `src/pages/` | Home, Guide, Live, History and Profile |
| `src/hooks/useCamera.ts` | Camera acquisition, errors and cleanup |
| `src/hooks/useInstall.ts` | Browser install prompt |
| `src/components/` | Original icons/artwork and account form |
| `src/styles.css` | Tailwind theme, shared UI styles and responsive layout |
| `public/manifest.webmanifest` | PWA identity and icons |
| `scripts/build-sw.mjs` | Public-shell cache generated after build |
| `scripts/test-pwa.mjs` | Cache exclusion, offline fallback and versioning checks |

## Verification

The current frontend passes TypeScript 7 checking and the actual Vite 8.3.4 production build. The PWA build step generated a versioned cache with eight public assets. The PWA cache-contract test also passes. Existing application dependencies became available during this revision; the earlier isolated checks are superseded by this production build.

Browser/device review is still pending: local HTTP binding was denied in the managed environment, and computer-use approval for Zen was denied. Rendered layout, camera permissions and installation must still be checked on real phones before deployment.

The mobile redesign uses compact titles, a single-column home screen, a fixed bottom bar and 44px icon controls. Decorative preview labels and repeated category chips were removed. Sora uses Google Fonts in this revision because the new font package could not be resolved through the restricted registry. The existing pnpm lockfile is preserved; the font has a system fallback and is not in the service-worker cache.

## Exercise library and future support

`src/content/exercises.ts` is the typed, locally bundled guide catalog. It covers arms, chest, back, shoulders, legs and core. The current research still concerns simultaneous two-arm dumbbell curls; adding guides does not add tracking or validated RIR support. `cameraPreview` is true only for that curl variation. The standing curl guide links explicitly to a related seated-curl reference, rather than claiming identical posture. Other guides link to their specific ACE technique pages.

To add a guide, supply a stable ID, display name, body area, equipment, focus, steps, tips and reference URL. Model support needs a separate evaluated pipeline for the exercise; do not turn on camera or prediction affordances merely because an exercise has guide content. No ACE photos/videos are copied into the app. Sources are available online; bundled guide text remains part of the public offline shell.

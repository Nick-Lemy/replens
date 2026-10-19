# RepLens React PWA

A mobile-first React + TypeScript interface built with Vite and Tailwind CSS. Its visual direction adapts the [Ronas IT reference](https://dribbble.com/shots/23816920-Fitness-Mobile-App-Design): charcoal surfaces, amber actions, exercise-led screens and restrained statistics. Line icons are local assets. Exercise photos are served from Free Exercise DB and Wikimedia Commons, with source/license metadata and visible credits. Sora is loaded through its Google Fonts stylesheet with system fallback. There are no emoji or cartoon exercise illustrations. Photos are fetched from their external providers when displayed. This font stylesheet requires a connection unless the browser already cached it; it is not included in the public-shell service-worker cache.

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

Rep tracking, RIR inference, authenticated history and saved sessions remain unimplemented. Rep and RIR fields display unavailable marks rather than example predictions. Exercise photos are static guide references; they are not live footage or model outputs.

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
| `src/styles.css` | Shared Tailwind colors/font and global accessibility/base rules |
| `public/manifest.webmanifest` | PWA identity and icons |
| `scripts/build-sw.mjs` | Public-shell cache generated after build |
| `scripts/test-pwa.mjs` | Cache exclusion, offline fallback and versioning checks |

## Verification

The current frontend passes TypeScript 7 checking and the actual Vite 8.3.4 production build. The PWA build step generated a versioned cache with eight public assets. The PWA cache-contract test also passes. Existing application dependencies became available during this revision; the earlier isolated checks are superseded by this production build.

Browser/device review is still pending: local HTTP binding was denied in the managed environment, and computer-use approval for Zen was denied. Rendered layout, camera permissions and installation must still be checked on real phones before deployment.

The mobile redesign uses compact titles, a single-column home screen, a fixed bottom bar and 44px icon controls. Decorative preview labels and repeated category chips were removed. Sora uses Google Fonts in this revision because the new font package could not be resolved through the restricted registry. The existing pnpm lockfile is preserved; the font has a system fallback and is not in the service-worker cache.

## Exercise library and future support

`src/content/exercises.ts` is the typed, locally bundled guide catalog. It covers arms, chest, back, shoulders, legs and core. The current research still concerns simultaneous two-arm dumbbell curls; adding guides does not add tracking or validated RIR support. `cameraPreview` is true only for that curl variation. The standing curl guide links explicitly to a related seated-curl reference, rather than claiming identical posture. Other guides link to their specific ACE technique pages.

To add a guide, supply a stable ID, display name, body area, equipment, focus, steps, tips and reference URL. Model support needs a separate evaluated pipeline for the exercise; do not turn on camera or prediction affordances merely because an exercise has guide content. No ACE photos/videos are copied into the app. Sources and photos are hosted externally and require a connection unless already in the browser HTTP cache. The service worker does not cache them; bundled guide text remains part of the public offline shell.

## Exercise photographs

`src/content/exercisePhotos.ts` maps all 14 guide IDs to public photographs. Thirteen guides use [Free Exercise DB](https://github.com/yuhonas/free-exercise-db), whose publisher declares the catalog/imagery public-domain under its [Unlicense](https://github.com/yuhonas/free-exercise-db/blob/main/LICENSE.md). It provides an open JSON endpoint and image URLs, with no API key. Bird dogs use the Wikimedia [PTPioneer photograph](https://commons.wikimedia.org/wiki/File:Bird_dog_exercise.jpg), licensed CC BY 2.0; the UI links to the creator, source and license and identifies resizing/thumbnail cropping. Publisher license declarations are recorded, not presented as an independent rights audit.

Home uses the curl photograph, every library row has a lazy-loaded photo, and every detail page has a full-image gallery. The helper displays a text fallback on loading failure and retries after reconnection. Detail images fit within their frame; library thumbnails are cropped. Photo controls say “Photo 1/2” rather than claiming that still frames prove complete rep boundaries. Kettlebell goblet-squat, walking-lunge and rotating-grip seated-curl variations are explicitly identified below their photos. The written guide variants and research scope are unchanged.

All Free Exercise DB image URLs were checked through the web tool. The bridge's first image repeatedly timed out, so only its second image is used. The bird-dog source/credit/license were verified on Commons, but direct thumbnail retrieval could not be verified; its Special:FilePath URL requests a 640px image. Shell downloads and browser review remain blocked, so image rendering on actual devices is still pending. These external references are not bundled local assets and remain subject to provider availability.

`node scripts/test-photos.mjs` checks coverage and credit/license metadata without making network requests. The public photos are UI content, not research training examples or RIR-labeled data.

## Editing the design

Page and component styles live in their JSX `className` attributes. Use Tailwind utilities directly rather than adding named CSS selectors or `@apply` component classes.

- Edit a screen in `src/pages/` (for example, `Home.tsx`).
- Edit navigation and the main layout in `src/App.tsx`.
- Edit photo sizing in `src/components/ExercisePhoto.tsx`: `fill`, `thumbnail`, and `gallery` have separate class lists.
- Change shared colors and the Sora font in the `@theme` block of `src/styles.css`. `bg-accent`, `bg-surface`, and `text-muted` use those values.
- `p-5` changes padding, `gap-3` changes spacing, and `rounded-xl` changes corner size. `sm:` and `lg:` apply changes on larger screens. `aria-[pressed=true]:` and `aria-[current=page]:` style selected tabs and navigation.
- Brackets preserve a specific design value, such as `text-[13px]` or `rounded-[22px]`; edit the number directly.

Global CSS is limited to the theme, browser defaults, keyboard focus, disabled controls and reduced-motion support. Responsive layouts, camera overlays, forms and galleries use Tailwind classes alongside their markup.

## Accounts (Sprint 1)

The existing account dialog now calls the real NestJS/Better Auth API. `features/auth/api.ts` owns HTTP communication; `AuthProvider` owns session restoration and state. Profile shows the actual account name/email and signout. Guests can still browse guides and use camera preview. History remains unavailable until its later feature; no fabricated summaries are shown.

Requests use same-origin `/api`, credentials included, and `cache: no-store`. Session cookies are HttpOnly; no account tokens or credentials enter browser storage. The PWA shell cache continues to bypass API requests. A failed/expired session read clears the displayed identity; failed requests show a retry state. Request generations prevent older responses overwriting newer authentication state. Email verification/recovery, profile editing, deletion and saved sessions are not implemented in this feature.

Local Vite proxies `/api` to `http://127.0.0.1:3000`. `API_PROXY_TARGET` can override that development-only destination. Production must provide the same-origin API proxy or an explicitly reviewed same-site deployment; Netlify-to-VPS cookie/domain setup remains pending.

### Browser verification

Run migrations against a dedicated disposable PostgreSQL database ending in `_test`, build the backend, then:

```sh
DATABASE_URL="$TEST_DATABASE_URL" pnpm --filter @replens/backend db:migrate
pnpm --filter @replens/backend build
pnpm --filter @replens/frontend exec playwright install chromium
pnpm --filter @replens/frontend test:e2e
```

`TEST_DATABASE_URL` is required. The suite starts its own NestJS on port 3123 and Vite on port 4273, uses the real API/database, creates isolated test accounts and removes those accounts afterward. It verifies real signup/signin/signout, cookie restoration, expired sessions, invalid credentials, validation, dialog Escape/focus, mobile fit, network recovery stale-response protection, and camera-track cleanup on navigation/backgrounding. Network interruption/delayed-response cases are isolated failure tests; successful authentication is never simulated. Screenshots/traces remain ignored local artifacts. Chromium phone emulation does not establish real iPhone/Android hardware or production deployment compatibility.

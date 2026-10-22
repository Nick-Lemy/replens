# RepLens React PWA

A mobile-first React + TypeScript interface built with Vite and Tailwind CSS. Its visual direction adapts the [Ronas IT reference](https://dribbble.com/shots/23816920-Fitness-Mobile-App-Design): charcoal surfaces, amber actions, exercise-led screens and restrained statistics. Line icons are local assets. Exercise photos are served from Free Exercise DB and Wikimedia Commons, with source/license metadata and visible credits. Sora is loaded through its Google Fonts stylesheet with system fallback. There are no emoji or cartoon exercise illustrations. Photos are fetched from their external providers when displayed. This font stylesheet requires a connection unless the browser already cached it; it is not included in the public-shell service-worker cache.

## Run

From the repository root:

```bash
pnpm install
cd web/frontend
pnpm dev
```

Open http://localhost:5173. This command starts only the frontend. Run `pnpm start:dev` separately in `web/backend` for accounts, guides and session history. The app shell and live session remain navigable if the exercise-guide API is unavailable; Home and Guide show a retry state. Vite proxies `/api` requests to port 3000; `API_PROXY_TARGET` can override this development-only destination.

## Implemented interface

- App-style Home with a single featured curl, a session action, a guide row and recent-session empty state. No landing-page tutorial or decorative badges.
- Searchable API-backed library of 14 exercise guides with body-area filters, equipment/muscle information, movement instructions, form tips and ACE reference links. Detail pages use `#guide/exercise-id` and preserve library filters when going back. Only the simultaneous curl guide links to camera preview.
- Live-session page with actual video-only camera access, permission error handling, camera switching, framing cues and a configurable preview countdown/timer.
- Camera tracks stop on navigation, tab backgrounding and component cleanup, including late permission responses. No MediaRecorder or video upload is used.
- History shows only saved session summaries returned for the signed-in account; previews are not presented as completed exercise sessions.
- Profile with actual account name/email, signout, browser-local camera/countdown preferences and installation guidance.
- Account forms with native validation and real persisted signup/signin through Better Auth. Sessions restore through `/api/me`; unavailable and expired sessions are handled without fabricated identity.
- Bottom navigation on phones, sidebar on larger screens, hash navigation with browser Back support, keyboard focus styles and a native modal dialog.

Live two-arm curl counting runs in a browser worker using the API's pinned MediaPipe Tasks Vision 1.1.1 Full pose asset. Frames are resized to a maximum 640-pixel edge before inference. Video frames and landmarks stay in the browser; counts remain in memory until the user explicitly saves a session summary. The counter requires visible image and world landmarks for each shoulder, elbow, and wrist, and uses elapsed-time smoothing, preview calibration, bilateral top/return checks and bounded pose-loss recovery. These are counting rules, not an accuracy guarantee. The optional collapsed tracking details show runtime version, observed frame rate, estimated elbow angles and the latest rejected movement reason. New summaries carry `world-full-v2`; history still accepts `world-full-v1`. MediaPipe 1.1.1 has no documented telemetry opt-out, so the worker allows only same-origin GETs for tracking configuration and versioned assets; production also sets `connect-src 'self'`. The reps-left field remains unavailable.

The Live page offers an off-by-default synthetic preview with speed-only (default) and speed-plus-movement-instability choices. It loads the selected versioned ONNX asset into a separate same-origin WASM worker, validates the config and SHA-256, and only evaluates an already accepted curl. Versioned model downloads can use the browser's HTTP cache and are hash-checked before inference; config responses remain no-store. Its output is labeled **Synthetic model — not validated**; it is a software-path demonstration, not an evaluated RIR prediction or recommendation. The movement feature uses image-plane wrist positions relative to the shoulders, divided by shoulder width, with a quadratic trend removed over about 0.4 seconds and residual variation summarized. Browser timestamps are resampled to a uniform timeline before fitting, so this is a pilot-style approximation; it is calculated only when the movement model is selected. Sparse, gappy, or invalid movement traces make the selected movement preview unavailable; they never change the rep count. The current synthetic movement-feature scale (about 0.3) differs substantially from the pilot's observed scale (about 0.006). No gain or offset is applied. The feature does not establish muscle tremor. Preview errors do not affect counting, and values are transient in browser memory, never included in saved summaries. The service worker does not precache ONNX model files or ONNX Runtime WASM/MJS assets.

## PWA

The manifest includes standalone mode and local app icons. After Vite builds, `scripts/build-sw.mjs` generates a service worker with a content-versioned cache of the public app shell. It is registered in production only, leaving normal Vite development untouched.

```bash
pnpm --filter @replens/frontend build
pnpm --filter @replens/frontend preview
```

Test installation/offline behavior in this production preview or on HTTPS Netlify hosting. Visit online first so the shell is cached, then reload once the worker is active and test offline. A new worker waits for existing app tabs to close before activation. Installing the PWA does not install a trained predictor.

Only static shell assets are cached. Auth/API requests, model files, camera footage and private data are excluded. Camera and appearance preferences use localStorage. TanStack Query keeps server responses in memory only; private user-scoped queries are canceled and removed on signout or account changes. Nothing is persisted through a query plugin or the service worker. The guide catalog is held in memory for the current app visit and is not persisted for offline use; saved history and tracking files also require a connection. Browser-specific camera, installation and offline behavior still needs actual device testing.

Netlify builds from the repo root with `pnpm --filter @replens/frontend build:netlify` and publishes `web/frontend/dist`; `netlify.toml` defines it. Set the Netlify build environment variable `API_UPSTREAM_ORIGIN` to the API's HTTPS origin only, such as `https://api.example.com` (no path or trailing route). The build fails before compiling if this value is absent or invalid. It writes a forced `/api/*` proxy redirect to the same API path, so the frontend continues to use relative `/api` requests and API errors cannot fall through to the SPA shell. Do not publish with a placeholder hostname. Ordinary local `pnpm build` does not need this variable and clears any previous redirect artifact.

The Kamal deployment uses `REPLENS_API_HOST` for the API hostname and `REPLENS_FRONTEND_ORIGIN` for the public frontend URL. Configure `REPLENS_FRONTEND_ORIGIN` to the exact HTTPS Netlify site origin so Better Auth can issue host-only Secure cookies through the same-origin proxy. Actual production URLs remain unset until deployment domains are chosen. Camera access requires HTTPS or localhost. A plain HTTP LAN address on a phone is not sufficient.

## Files to read

| File | Purpose |
|---|---|
| `src/App.tsx` | App shell, navigation, preferences and account dialog |
| `src/pages/` | Home, Guide, Live, History and Profile |
| `src/features/api/` | Shared JSON transport, backend error handling and in-memory query client |
| `src/features/exercises/` | Guide response validation and shared catalog query |
| `src/features/sessions/` | Account-scoped history queries and save/delete mutations |
| `src/features/live/curlCounter.ts` | Pure bilateral curl-count state machine and counter diagnostics |
| `src/features/live/LivePanels.tsx` | Live metrics, optional tracking diagnostics and saved-session summary panels |
| `src/features/live/videoFramePump.ts` | Resized camera frame scheduling, worker back-pressure and stall detection |
| `src/features/live/poseFrameAdapter.ts` / `poseWorkerProtocol.ts` | Typed worker messages and validated pose-frame conversion |
| `src/features/live/useLiveSession.ts` | Countdown, session timing, interruption and summary draft lifecycle |
| `src/hooks/useCamera.ts` | Camera acquisition, errors and cleanup |
| `src/hooks/useInstall.ts` | Browser install prompt |
| `src/components/` | Original icons/artwork and account form |
| `src/styles.css` | Shared Tailwind colors/font and global accessibility/base rules |
| `public/manifest.webmanifest` | PWA identity and icons |
| `scripts/build-sw.mjs` | Public-shell cache generated after build |
| `scripts/test-pwa.mjs` | Cache exclusion, offline fallback and versioning checks |
| `scripts/test-live-counter.mjs` | Synthetic frame-rate, calibration, loss and rejection regressions |

## Verification

The current frontend passes TypeScript 7 checking and the actual Vite 8.3.4 production build. The PWA build step generated a versioned cache with eight public assets. The PWA cache-contract test also passes. Existing application dependencies became available during this revision; the earlier isolated checks are superseded by this production build.

Chromium mobile-emulation browser checks pass against real NestJS/PostgreSQL, including authentication, modal focus, mobile overflow and camera-track cleanup with a test-only camera fixture. Physical-phone camera permissions, installation and deployment still need real-device verification.

The mobile redesign uses compact titles, a single-column home screen, a fixed bottom bar and 44px icon controls. Decorative preview labels and repeated category chips were removed. Sora uses Google Fonts in this revision because the new font package could not be resolved through the restricted registry. The existing pnpm lockfile is preserved; the font has a system fallback and is not in the service-worker cache.

## Exercise library and future support

The canonical authored catalog is served by the backend from `web/backend/src/exercises/catalog/`; the frontend loads it from `/api/exercises` and fetches deep-linked guides from `/api/exercises/:id`. The catalog covers arms, chest, back, shoulders, legs and core. The current research still concerns simultaneous two-arm dumbbell curls; other guides do not have tracking or validated RIR support. `cameraPreview` is true only for that curl variation. The standing curl guide links explicitly to a related seated-curl reference, rather than claiming identical posture. Other guides link to their specific ACE technique pages. Guide API failures have no bundled-content fallback.

To add a guide, update the backend catalog with a stable ID, display name, body area, equipment, focus, steps, tips, reference URL and photo metadata. Model support needs a separate evaluated pipeline for the exercise; do not turn on camera or prediction affordances merely because an exercise has guide content. No ACE photos/videos are copied into the app. Sources and photos are hosted externally and require a connection unless already in the browser HTTP cache. The service worker does not cache the API or photos.

## Exercise photographs

The backend's canonical photo map serves metadata for all 14 guide IDs. Thirteen guides use [Free Exercise DB](https://github.com/yuhonas/free-exercise-db), whose publisher declares the catalog/imagery public-domain under its [Unlicense](https://github.com/yuhonas/free-exercise-db/blob/main/LICENSE.md). Bird dogs use the Wikimedia [PTPioneer photograph](https://commons.wikimedia.org/wiki/File:Bird_dog_exercise.jpg), licensed CC BY 2.0; the UI links to the creator, source and license and identifies resizing/thumbnail cropping. Publisher license declarations are recorded, not presented as an independent rights audit.

Home uses the curl photograph, every library row has a lazy-loaded photo, and every detail page has a full-image gallery. The helper displays a text fallback on loading failure and retries after reconnection. Detail images fit within their frame; library thumbnails are cropped. Photo controls say “Photo 1/2” rather than claiming that still frames prove complete rep boundaries. Kettlebell goblet-squat, walking-lunge and rotating-grip seated-curl variations are explicitly identified below their photos. The written guide variants and research scope are unchanged.

All Free Exercise DB image URLs were checked through the web tool. The bridge's first image repeatedly timed out, so only its second image is used. The bird-dog source/credit/license were verified on Commons, but direct thumbnail retrieval could not be verified; its Special:FilePath URL requests a 640px image. Image rendering on physical devices and external-provider delivery remain pending. These external references are not bundled local assets and remain subject to provider availability.

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

The account dialog calls the real NestJS/Better Auth API. `features/auth/api.ts` owns HTTP communication; `AuthProvider` owns session restoration and state. Profile shows the actual account name/email and verification state, supports display-name updates and current-password-confirmed account deletion, and provides signout. Password reset and explicit email verification use the backend email endpoints and frontend hash routes; their link tokens are held in memory and removed from the URL. Guests can still browse guides and use camera preview. Completed live sets remain in memory until the user explicitly saves them; saved summaries use an idempotent client ID and the signed-in account's cookie session. History loads real account-scoped API records with pagination, detail and confirmed deletion; Home shows the actual recent records. Account deletion also deletes that account's saved summaries. No videos, landmarks, RIR estimates or mock summaries are stored.

Google sign-in is shown only when `/api/auth/providers` reports it available. The frontend uses Better Auth's redirect flow and accepts only the Google authorization origin returned by the API; it never handles an ID token. OAuth callback errors are mapped to a short notice and callback parameters are removed from the address bar. Account deletion follows the server's `accountDeletion` capabilities: password accounts keep current-password confirmation, while Google-only accounts require a fresh Google session and a separate final delete action. A session-expired response starts reauthentication but never retries deletion automatically. The frontend does not simulate a successful OAuth exchange; complete provider sign-in requires configured Google credentials.

Requests use same-origin `/api`, credentials included for private calls, and `cache: no-store`. Public exercise-guide reads omit credentials. Session cookies are HttpOnly; no account tokens or credentials enter browser storage. The shared API client validates JSON responses and displays the backend's safe error message, with a generic connection message when the service cannot be reached. TanStack Query does not automatically retry requests; the UI provides explicit retry actions. Auth-session checks refetch on focus and reconnect; public guides and saved history do not refetch just because a tab regained focus. A failed/expired session read clears the displayed identity and cancels/removes that user's private query data. Query cache is memory-only. A guest can explicitly sign in from a completed live summary to save it; the summary remains in memory only and is discarded on navigation or reload.

## API explorer (Swagger)

With the local backend running, open Swagger UI at `http://localhost:3000/api/docs`; its OpenAPI document is at `/api/docs-json`. You can also use the same-origin Vite proxy at `http://localhost:5173/api/docs` while the frontend dev server and backend are running. Vite forwards the full `/api` path to the backend.

Production Swagger is disabled by default. To expose it intentionally, set `API_DOCS_ENABLED=true` in the backend environment; when enabled through the Netlify API proxy, append `/api/docs` to the configured frontend URL to open Swagger UI. With the flag false, both docs routes return 404. The Swagger UI uses relative API paths and same-origin credentials for Try it out. Authenticate through the documented sign-in endpoint or the app on that same origin; browser cookies are used for protected calls. Do not copy or store Better Auth response tokens. No app button or authentication bypass is added for the API explorer.

Local Vite proxies `/api` to `http://127.0.0.1:3000`. `API_PROXY_TARGET` can override that development-only destination. Production Netlify builds require `API_UPSTREAM_ORIGIN` as described above; configure Kamal's `REPLENS_FRONTEND_ORIGIN` to the Netlify origin for host-only Secure cookies.

### Browser verification

Run migrations against a dedicated disposable PostgreSQL database ending in `_test`, build the backend, then:

```sh
DATABASE_URL="$TEST_DATABASE_URL" pnpm --filter @replens/backend db:migrate
pnpm --filter @replens/backend build
pnpm --filter @replens/frontend exec playwright install chromium
pnpm --filter @replens/frontend test:e2e
```

`TEST_DATABASE_URL` is required. The suite starts its own NestJS on port 3123 and Vite on port 4273, uses the real API/database, creates isolated test accounts and removes those accounts afterward. It verifies real signup/signin/signout, cookie restoration, expired sessions, invalid credentials, validation, dialog Escape/focus, mobile fit, network recovery, stale-response protection, and camera-track cleanup on navigation/backgrounding. Network interruption/delayed-response cases are isolated failure tests; successful authentication is never simulated. Screenshots/traces remain ignored local artifacts. Chromium phone emulation does not establish real iPhone/Android hardware or production deployment compatibility.

## Appearance

The header sun/moon button switches between light and dark themes. A first visit uses the device color preference; a valid explicit choice is saved as `replens.theme` in this browser. Blocked storage falls back to a working theme for the current visit. The small head script applies the initial theme before the interface paints; `features/theme/ThemeProvider.tsx` manages switching and browser theme metadata. Semantic Tailwind colors in `src/styles.css` cover pages, forms and dialogs. Fixed camera overlays and photo backgrounds retain their own contrast. No account or backend setting is involved.

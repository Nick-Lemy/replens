# RepLens web application

This folder will contain the mobile-first web application people use for live feedback during a curl set. It now contains `frontend/` (React, TypeScript, Vite and Tailwind) and `backend/` (NestJS and TypeScript). The working video-processing demo remains in `../pilot/`.

The planned parts are:

- A live camera session as the main experience, with video upload as a secondary testing/research path.
- Live arm tracking and a rep counter.
- Movement measurements and, once supported by evaluation, updated reps-left estimates after each completed repetition.
- A NestJS backend for accounts, guides and history, with proposed live pose tracking and evaluated RIR inference in the phone browser.
- Clear messages when tracking is poor or a prediction cannot be trusted.

The web app will use the same feature calculations used during model training. For example, if the model learns from elbow-angle speed, the app must calculate that speed in the same way.

**Inference** means using a trained model to make a prediction on a new input. The app will perform inference; training happens separately in `../training/` before a model is added to the app.

The proposed web stack is React + TypeScript for the interface and NestJS + TypeScript for a modular backend, with Better Auth, Prisma and PostgreSQL, with the React frontend and model assets hosted on Netlify. Docker Compose runs Caddy, NestJS and PostgreSQL on one VPS. Caddy uses a Caddyfile for HTTPS and API routing. Both belong in this repository. See `ARCHITECTURE.md` and the compact `ARCHITECTURE.eraser` diagram. Live browser inference remains subject to model export and actual phone performance checks.

Before building the full app, we need a reliable video pipeline and an evaluation showing what the RIR model can and cannot do.

## Mobile-first design reference

The primary interface is designed for a phone because users will use its camera for live curl feedback. Use the [Ronas IT Fitness Mobile App concept on Dribbble](https://dribbble.com/shots/23816920-Fitness-Mobile-App-Design) as the main visual reference. Borrow its video-led workout flow, live exercise screen, and restrained dark palette with warm accent colors; adapt these ideas to RepLens rather than copying the screens directly.

Design priorities for the phone experience:

- Make camera setup and framing easy to understand before starting a live session.
- Keep the live view focused on the camera preview, tracking overlay, rep count, estimated reps left, and large controls.
- Support hands-free use after a countdown, since the phone should be placed away from the user.
- Put charts, per-rep measurements, review, and export after the set, where there is room to inspect them.
- Keep personal session history and account settings responsive for larger screens too.
- Focus the current app on lifters; a researcher workspace is out of scope for now.

## User-facing session wording

- Navigation/page: **Live session**.
- Main action: **Start live session**.
- Setup action: **Enable camera**.
- During exercise: **Live feedback**.
- Finish action: **End session**.

Do not label the main live feature or its controls "Record" or "Recording": the intended interaction is live feedback. Explain actual camera processing, transmission, and storage separately in clear language. These labels do not imply that videos are saved or that processing stays on the phone; storage and processing behavior still need to be specified and implemented. Any research recording must remain explicitly described and consented to.

## Starter commands

From the repository root: `pnpm install`, then `pnpm dev`. The frontend runs on port 5173 and proxies `/api` to the backend on port 3000. `pnpm check` checks types and `pnpm build` compiles both workspaces. There is no React Router server framework or frontend server rendering. The frontend now has Home, Guide, Live, History and Profile pages, account form designs, and PWA support. Camera preview/countdown works in the implementation; rep tracking, RIR and account backend integration remain pending. See `frontend/README.md` for behavior and verification limits.

## Verification

Earlier installation attempts were blocked by registry access. Dependencies are now present, and the mobile frontend passes its actual TypeScript 7 check, Vite 8.3.4 production build and PWA generation. The cache-contract test passes. Backend production verification and browser/device review remain pending.

The frontend uses Sora through a Google Fonts stylesheet, compact phone layouts and a focused app-style Home. The font's external requests are not cached by the shell service worker. See `frontend/README.md` for the current implementation and limits.

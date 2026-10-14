# RepLens

Camera-based curl analysis and research into estimating reps left.

This repository will hold the capstone's web app, video-processing code, and ML models together. The research question is whether visible small-movement measurements improve estimates of reps left during simultaneous two-arm dumbbell curls beyond a speed-only baseline.

## Current structure

```text
pilot/    Video upload and rep-counting prototype, its learning guide, and CSV tools
web/      React frontend and NestJS backend, plus architecture and flow notes
training/ Planned model training and evaluation
docs/     Project proposal
```

The current prototype is in [pilot/README.md](pilot/README.md). It counts curls and extracts movement measurements; it does not have a trained RIR predictor. Volunteer collection is planned only after ALU ethics approval, gym permission, and consent.

[web/README.md](web/README.md) explains the planned application. [training/README.md](training/README.md) explains how we will train and compare the RIR models. The web folder now has a frontend/backend starter; training currently contains documentation only.

Local model files, videos, set CSVs, and the Python environment are excluded from version control. Keep the participant code-to-name list separately in approved storage.

## Run the web starter

Use Node.js 24 or newer. From the repository root:

```bash
pnpm install
pnpm dev
```

Frontend: http://localhost:5173. Backend health endpoint: http://127.0.0.1:3000/api/health. Run the services separately with `pnpm dev:frontend` and `pnpm dev:backend`. `pnpm check` checks TypeScript; `pnpm build` builds both.

The React app uses Vite and Tailwind CSS with browser rendering. The NestJS backend currently exposes only a health endpoint. The frontend includes a mobile PWA interface and camera preview/countdown; Better Auth, PostgreSQL integration, pose processing and RIR inference remain future implementation. Netlify settings live in `netlify.toml`; production API forwarding needs the actual VPS hostname.

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

The current prototype is in [pilot/README.md](pilot/README.md). It counts curls and extracts movement measurements; it does not have a trained RIR predictor. Volunteer recording requires ALU ethics approval, gym permission, and individual consent.

[web/README.md](web/README.md) explains the application. [training/README.md](training/README.md) explains the isolated synthetic training experiment and planned real-data comparison. The synthetic experiment checks training and ONNX export; it is not a validated RIR predictor.

Local model files, videos, set CSVs, and the Python environment are excluded from version control. Keep the participant code-to-name list separately in approved storage.

## Run the web app

See [SETUP.md](SETUP.md) for the full local setup, Swagger access, deployment/email settings and the remaining live RIR requirements.

Use Node.js 24 LTS. From the repository root:

```bash
pnpm install
```

Follow [backend local setup](web/backend/README.md#local-setup) to create the ignored environment file and apply migrations to your selected database. For live curl counting, prepare the pinned pose/runtime files with `node web/backend/scripts/prepare-tracking-assets.mjs` from the repository root. These public model files stay ignored. Start the backend with `pnpm start:dev` in `web/backend` and the frontend with `pnpm dev` in `web/frontend`, using separate terminals.

Frontend: http://localhost:5173. Backend health endpoint: http://127.0.0.1:3000/api/health. `pnpm check` checks TypeScript; `pnpm build` builds both.

The React app uses Vite and Tailwind CSS with browser rendering. Better Auth accounts and cookie sessions persist in PostgreSQL through Prisma. The mobile PWA includes signup, signin, signout, display-name editing, password-confirmed account deletion, educational guides and browser-local live curl counting with arm landmarks. Email verification and password reset require backend Resend credentials and a configured sender; actual email delivery remains unverified. Users can explicitly save live-count summaries, view private history and delete entries. Only counts and timing are stored; videos, landmarks and RIR are excluded. RIR inference is not implemented yet. Apply the committed database migrations before using saved history. The live counter uses estimated 3D joints and conservative movement rules; it is not a validated accuracy benchmark. Netlify settings live in `netlify.toml`; production API forwarding and cookie behaviour need verification with the actual frontend/API domains.

## Git checks and commit messages

Husky manages the tracked Git hooks in `.husky/`. A root `prepare` script activates them during `pnpm install` when lifecycle scripts are enabled. To activate or repair them manually after installation:

```bash
pnpm hooks:install
```

- **Pre-commit:** checks staged changes for whitespace errors, then type-checks both web packages.
- **Pre-push:** builds both web packages and runs available workspace tests. Database and browser integration checks are separate CI gates; see [SPRINT.md](SPRINT.md).

Hooks require pnpm on your terminal's PATH. They validate the current working files; stage the intended changes before committing. These checks do not evaluate the Python pilot or RIR model accuracy. Run them manually with `pnpm check`, `pnpm build`, and `pnpm test`.

Use Conventional Commit messages: `type(scope): short description`. Common types are `feat` (new feature), `fix` (bug fix), `refactor` (code restructuring), `docs` (documentation), `test` (tests), and `chore` (tooling). For example: `feat(web): add exercise photo guides`. These are naming conventions; commit-message validation is not configured.

Husky is a root development dependency. `.husky/install.mjs` skips setup in CI, production installs and when `HUSKY=0`, so Netlify and future container builds do not need Git hooks. Generated Husky files under `.husky/_/` are ignored; commit the hook files themselves. Activation is local to each checkout and requires permission to update `.git/config`. Migrating from our old `.githooks` setup uses the same `pnpm hooks:install` command.

# RepLens: setup and remaining work

## What works now

Accounts, educational exercise guides, live two-arm curl counting, and explicitly saved personal summaries are implemented. Swagger documents the existing API. The live page also offers a default-off **synthetic RIR preview**. It demonstrates browser inference after completed curls; its estimates are not validated exercise feedback.

To try it, start the backend and frontend normally, open **Live session**, enable the camera and select **Try experimental speed-only preview**. Start a live session and complete a curl. **Demo reps left** shows the synthetic model's output from measured angular speeds. The backend includes the small versioned model; the frontend bundles the pinned WASM runtime. Saved summaries contain counts and timing only. Real-data training and evaluation are still required before normal RIR feedback.

The frontend uses TanStack Query to manage API loading, errors and an in-memory cache. It needs no separate hosted service or account; `pnpm install` installs it with the app.

## 1. Run locally

### Install the tools

- Node.js 24 LTS.
- pnpm 11.25.0, matching the root `packageManager` setting.
- Docker for Miget migrations and later Kamal image builds. Docker Compose is needed only if you choose the optional local database. Starting the apps with Miget does not use Docker.

Run JavaScript commands from the repository root:

```sh
pnpm install
cp -n web/backend/.env.example web/backend/.env
```

If `.env` already exists, edit it; do not replace existing credentials.

### Fill the ignored backend environment file

Edit `web/backend/.env`. Keep secrets there, outside Git and chat.

| Setting | Local setup |
| --- | --- |
| `POSTGRES_PASSWORD` | Choose a unique URL-safe password for the development database. |
| `DATABASE_URL` | Edit the example URL to use that same password. The development database host is `127.0.0.1`, port `55434`, user `replens`, database `replens`. |
| `BETTER_AUTH_SECRET` | Generate a unique secret, for example with `openssl rand -hex 32`, and copy it into this field. |
| `PORT` / `HOST` | Default backend: `3000` / `127.0.0.1`. |
| `BETTER_AUTH_URL` | `http://localhost:3000` for the default direct local backend. |
| `FRONTEND_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` allows both local frontend addresses. Origins must match exactly, without trailing slashes. |
| `API_DOCS_ENABLED` | `true` to enable Swagger locally. |
| `RESEND_API_KEY` / `EMAIL_FROM` | Optional initially. Leave both blank if you have not configured Resend. |

If port 3000 is occupied, use port 3001 instead: update `PORT` and `BETTER_AUTH_URL` accordingly, then start the frontend with `API_PROXY_TARGET=http://127.0.0.1:3001 pnpm dev`. Do not stop another application just to free its port.

### Start the database, apply its schema, and prepare pose files

```sh
cd web/backend
docker compose -f compose.dev.yml up -d
cd ../..
pnpm --filter @replens/backend db:migrate
node web/backend/scripts/prepare-tracking-assets.mjs
```

A **migration** creates or updates database tables. The asset script downloads the pinned pose/WASM files into the ignored `models/` directory. No participant videos are needed to start the web app.

#### Using Miget instead of the local database

Put Miget's external PostgreSQL URL in `web/backend/.env` as `DATABASE_URL`. Append `?sslmode=require&uselibpqcompat=true&sslaccept=accept_invalid_certs` if the URL has no query string. The connection uses TLS, but these options do not verify Miget's certificate; obtain a verifiable external certificate/hostname from Miget before using real accounts. Do not start `compose.dev.yml` when using Miget.

The first two migrations were applied to the Miget database on 21 October 2026. When new migrations are added, run this single command from the repository root:

```sh
pnpm db:migrate:miget
```

It runs Prisma's migration command in a temporary Linux container against Miget, then exits. It builds the migration image if one is not cached and mounts the current migration files on every run. Prisma's migration command failed with a TLS protocol error on this Mac. Restart the backend after editing `.env`.

### Start the apps in separate terminals

Backend terminal:

```sh
cd web/backend
pnpm start:dev
```

Frontend terminal:

```sh
cd web/frontend
pnpm dev
```

These commands start only their own app. Install dependencies from the repository root first. The frontend sends `/api` requests to the backend on port 3000 by default.

Open:

| Page | Default local URL |
| --- | --- |
| Web app | http://localhost:5173 |
| Swagger through the frontend proxy | http://localhost:5173/api/docs |
| Swagger directly on the backend | http://localhost:3000/api/docs |
| OpenAPI JSON | http://localhost:3000/api/docs-json |
| Health check | http://localhost:3000/api/health |

If Better Auth reports `Invalid origin`, check that the address used in the browser is included in `FRONTEND_ORIGINS`, then restart the backend after editing `.env`. `localhost` and `127.0.0.1` are different origins.

Use your configured backend port if you changed it. OpenAPI is the machine-readable description of the API; Swagger UI is the interactive page that displays it.

### Use Swagger

1. Open `/api/docs` on the frontend origin, or the local backend origin.
2. Expand an operation and select **Try it out**.
3. Use the sign-up or sign-in operation with a test account.
4. Then try `/api/me` and the session-history operations. The browser sends its HttpOnly session cookie automatically; do not paste a bearer token or copy a cookie into JavaScript.
5. Sign out when finished.

Swagger sends real requests. Creating or deleting a record there changes the database. It does not invent demo results. Missing/expired authentication should still return 401.

### Check the app

```sh
pnpm check
pnpm build
pnpm test
```

Then try signup/signin, guides, a live curl set, explicit save, history after reload, deletion and signout. Rep counting still needs broader footage and physical-phone evaluation; one successful clip is not an accuracy benchmark.

## 2. Enable verification and password-reset emails

1. Create a Resend account and verify a sending domain.
2. Create a Resend API key.
3. Set both `RESEND_API_KEY` and `EMAIL_FROM` in the ignored backend environment file. Use a sender allowed by your verified domain.
4. Restart the backend.
5. Test verification and password reset with an address you control, including expiry and failed-link handling.

Without these settings, email actions report unavailable. Signup/signin and the other implemented features can still work. Real Resend delivery has not yet been verified here.

## 3. Prepare actual hosting

The backend uses [Kamal](web/backend/README.md#backend-deployment-with-kamal) on one VPS. The React frontend stays on Netlify; Miget stays the database. No VPS Compose stack or Caddyfile is needed.

1. Obtain a VPS IP, an SSH user/key, and an API hostname pointing to the VPS. Open TCP 80/443. Use root SSH for Kamal's automatic first-time Docker installation, or bootstrap a non-root user yourself.
2. Fill ignored `.kamal/deploy.env` and `.kamal/secrets` using their tracked `.example` files. Use a new production auth secret and rotate the Miget password that was pasted into chat.
3. Back up Miget, apply pending migrations with `pnpm db:migrate:miget`, review `kamal config`, then run `kamal setup`. Later releases use `kamal deploy`.
4. On Netlify, set `API_UPSTREAM_ORIGIN=https://<your API hostname>` and deploy the frontend. The generated same-origin `/api/*` route forwards calls to the VPS.
5. Check `https://<API hostname>/api/health` and then test accounts, history, guides and live counting through the public Netlify URL on a real phone. Health alone does not prove the database works.

For automatic releases, configure the GitHub Actions variables and `production` secrets in the [backend deployment guide](web/backend/README.md#automatic-deployment-from-main). Enable `DEPLOY_ENABLED` after the VPS, DNS and Miget backups are ready. Run the manual **first_setup** workflow once; later successful pushes to `main` deploy the backend automatically after CI. Netlify deploys the frontend separately through its Git connection.

Set both Resend values later if you want real verification/reset emails. Production Swagger is off unless you explicitly enable `API_DOCS_ENABLED` in the Kamal config. See the backend runbook for those settings and deployment limits.

## 4. What live RIR still needs

**RIR means repetitions in reserve: an estimate of how many more valid reps the person could complete.** Counting completed reps cannot establish this by itself.

| Missing piece | What must be done |
| --- | --- |
| Suitable study data and labels | Finish consented collection and review completed reps and documented set endpoints. A clip ending or a voluntary stop does not establish exact RIR. Keep research records separate from personal app history. |
| A matching feature extractor | Validate the speed and candidate movement-instability measurements used for real training against the live browser path. Use the same landmarks, timestamps, smoothing, units and rep boundaries. The demo uses estimated 3D joint angles; the Python pilot's image-plane measurements are not automatically interchangeable. |
| Trained and compared models | Train matched speed-only and speed-plus-instability models on reviewed study data, then test both on people excluded from training. Measure error; do not assume instability improves it. The `training/` pipeline currently runs an isolated synthetic experiment only. |
| A deployment package | Export the evaluated model to ONNX with its feature order, preprocessing/scaler, supported exercise, version and operating limits. Check that exported predictions match the original model. |
| Evaluated model integration | The opt-in demo already uses an ONNX Runtime Web worker after completed reps. A real-data model still needs a new verified version, matching features, preprocessing and operating limits before becoming usable feedback. Preserve same-origin assets, stale-result handling and privacy boundaries. |
| Reliable feedback and validation | Handle missing landmarks, interrupted sets, bad inputs and unsupported views honestly. Test prediction quality, download time and response delay on real phones before showing estimates as usable feedback. |

**Inference** means running a trained model on a new input. **ONNX** is a model-file format; it does not train a model or improve its accuracy by itself. **Preprocessing** is the exact preparation of inputs before prediction. It must match training.

Only information available through the current completed rep can enter a live prediction. A training label may use a later verified endpoint, but a live feature must not reveal future reps. No RIR value should be fabricated while these stages are missing.

The web app can be used for guides, accounts, rep counting and personal summaries, plus the explicitly labeled synthetic preview. It currently has no RIR predictor trained on reviewed study data, no validated muscle-tremor measurement and no demonstrated injury-reduction outcome.

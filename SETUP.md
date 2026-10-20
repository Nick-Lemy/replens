# RepLens: setup and remaining work

## What works now

Accounts, educational exercise guides, live two-arm curl counting, and explicitly saved personal summaries are implemented. Swagger documents the existing API. The live page does **not** predict reps left yet. Downloading the MediaPipe pose model enables joint tracking; it does not add an RIR model.

The frontend uses TanStack Query to manage API loading, errors and an in-memory cache. It needs no separate hosted service or account; `pnpm install` installs it with the app.

## 1. Run locally

### Install the tools

- Node.js 24 LTS.
- pnpm 11.25.0, matching the root `packageManager` setting.
- Docker with Docker Compose. On your Mac, start Docker Desktop first.

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
| `FRONTEND_ORIGINS` | `http://localhost:5173`. Use the exact frontend origin, without a trailing slash. |
| `API_DOCS_ENABLED` | `true` to enable Swagger locally. |
| `RESEND_API_KEY` / `EMAIL_FROM` | Optional initially. Leave both blank if you have not configured Resend. |

If port 3000 is occupied, use port 3001 instead: update `PORT` and `BETTER_AUTH_URL` accordingly, then start the app with `API_PROXY_TARGET=http://127.0.0.1:3001 pnpm dev` in the final step below. Do not stop another application just to free its port.

### Start the database, apply its schema, and prepare pose files

```sh
cd web/backend
docker compose -f compose.dev.yml up -d
cd ../..
pnpm --filter @replens/backend db:migrate
node web/backend/scripts/prepare-tracking-assets.mjs
pnpm dev
```

A **migration** creates or updates database tables. The asset script downloads the pinned pose/WASM files into the ignored `models/` directory. No participant videos are needed to start the web app.

Open:

| Page | Default local URL |
| --- | --- |
| Web app | http://localhost:5173 |
| Swagger through the frontend proxy | http://localhost:5173/api/docs |
| Swagger directly on the backend | http://localhost:3000/api/docs |
| OpenAPI JSON | http://localhost:3000/api/docs-json |
| Health check | http://localhost:3000/api/health |

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

You still need:

- A VPS with Docker/Compose and an API hostname pointing to it.
- A Netlify site with its final public frontend URL.
- HTTPS connectivity to the VPS on ports 80/443 for Caddy's setup.
- Unique production database/auth secrets and a private backup destination.

### VPS

Follow [the backend deployment runbook](web/backend/README.md#vps-deployment-configuration).

Copy `web/backend/deploy/production.env.example` to the ignored `web/backend/deploy/.env`. Required values intentionally start blank.

| Setting | Meaning |
| --- | --- |
| `API_HOST` | API hostname only, without scheme or path. |
| `FRONTEND_ORIGIN` | Exact public HTTPS frontend origin. The API uses this as Better Auth's public origin for the frontend proxy arrangement. |
| `POSTGRES_PASSWORD` / `DATABASE_URL` | Production database credentials; the Compose database service is named `db`, on port 5432. |
| `BETTER_AUTH_SECRET` | A unique production secret, separate from development. |
| `DEPLOY_VERSION` | Source commit/image version used for this deployment. |
| `RESEND_API_KEY` / `EMAIL_FROM` | Your configured sender credentials, or both blank initially. |
| `API_DOCS_ENABLED` | `false` by default in production. Set `true` only if you want the documentation exposed. |

Provision the pose files, build the images, start PostgreSQL, run the separate migration service, then start API/Caddy. The runbook contains the commands. The API does not apply migrations automatically. API/database host ports stay private; Caddy handles the public routes.

Back up the database before updates, keep a copy outside the VPS, and verify a restore into a separate database. Do not remove volumes containing data you need.

### Netlify

- Build command and publish directory are already set in `netlify.toml`.
- Set the build environment variable `API_UPSTREAM_ORIGIN` to your real HTTPS API origin, without credentials, path, query or fragment.
- Deploy the source only after the VPS API is reachable.

`build:netlify` generates a forced proxy for `/api/*`. Missing/invalid upstream configuration deliberately fails the build; a failed deploy preview at this stage does not mean a placeholder API has been published. Normal local builds need no production URL.

After deployment, verify signup, reload/signin persistence, signout, private history, guides, pose downloads and live counting through the **public frontend URL**. Check on actual iPhone/Android browsers. Preview domains are not automatically trusted by the backend configuration.

For production Swagger, explicitly enable `API_DOCS_ENABLED` on the VPS and restart/recreate the API, then append `/api/docs` to your public frontend URL and open it through the same-origin proxy. The documentation toggle does not make protected operations public. Public DNS/TLS, real Netlify cookie handling, production rate-limit behavior and real-phone performance still require hosted verification.

Camera access on a phone needs HTTPS. A plain HTTP laptop LAN address is not equivalent to localhost on that phone. The service worker caches the public interface only; it does not persist API data, camera frames or model bundles.

## 4. What live RIR still needs

**RIR means repetitions in reserve: an estimate of how many more valid reps the person could complete.** Counting completed reps cannot establish this by itself.

| Missing piece | What must be done |
| --- | --- |
| Suitable study data and labels | Finish consented collection and review completed reps and documented set endpoints. A clip ending or a voluntary stop does not establish exact RIR. Keep research records separate from personal app history. |
| A matching feature extractor | Implement the speed and candidate movement-instability measurements used for training in the live browser path. Use the same landmarks, timestamps, smoothing, units and rep boundaries. The browser counter currently uses estimated 3D joints; the Python pilot's image-plane measurements are not automatically interchangeable. |
| Trained and compared models | Train matched speed-only and speed-plus-instability models, then test both on people excluded from training. Measure error; do not assume instability improves it. The `training/` pipeline is not implemented yet. |
| A deployment package | Export the evaluated model to ONNX with its feature order, preprocessing/scaler, supported exercise, version and operating limits. Check that exported predictions match the original model. |
| Browser inference code | Add an ONNX Runtime Web loader and worker inference after each completed rep. The current worker tracks pose/counts; it has no RIR feature pipeline or trained predictor. Host versioned files on the VPS and preserve the download/privacy boundaries. |
| Reliable feedback and validation | Handle missing landmarks, interrupted sets, bad inputs and unsupported views honestly. Test prediction quality, download time and response delay on real phones before showing estimates as usable feedback. |

**Inference** means running a trained model on a new input. **ONNX** is a model-file format; it does not train a model or improve its accuracy by itself. **Preprocessing** is the exact preparation of inputs before prediction. It must match training.

Only information available through the current completed rep can enter a live prediction. A training label may use a later verified endpoint, but a live feature must not reveal future reps. No RIR value should be fabricated while these stages are missing.

The immediate web app can therefore be used for guides, accounts, rep counting and personal summaries while the research/model work is completed later. It currently has no trained RIR predictor, no validated muscle-tremor measurement and no demonstrated injury-reduction outcome.

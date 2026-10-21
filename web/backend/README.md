# RepLens API

NestJS + TypeScript, Better Auth 1.7.11 and PostgreSQL through Prisma 7.10.1. Accounts and personal curl session summaries are real persisted records. Email verification and password reset use Resend when configured. The API does not store videos, landmarks or RIR estimates.

## Local setup

Install dependencies from the repository root with `pnpm install`. Copy `web/backend/.env.example` to `web/backend/.env`, set a unique `POSTGRES_PASSWORD`, use that password in `DATABASE_URL`, and generate `BETTER_AUTH_SECRET` with:

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

The development Compose service reads its password from the ignored `.env` file. PostgreSQL refuses initial startup if that password is empty. The optional development database binds only `127.0.0.1:55434` and keeps a named volume:

```sh
cd web/backend
docker compose --env-file .env -f compose.dev.yml up -d
cd ../..
pnpm --filter @replens/backend db:migrate
```

If using Miget, skip the local Compose database and run `pnpm db:migrate:miget` from the repository root only when a new migration needs applying. Start this API separately:

```sh
cd web/backend
pnpm start:dev
```

Start the frontend in another terminal with `cd web/frontend` and `pnpm dev`. Do not run `down -v` against a database containing records you need. The API loads `web/backend/.env` when run through its workspace scripts. Configuration rejects missing database/secret, invalid ports, wildcard/path origins and non-HTTPS production origins. `GET /api/health` remains a liveness response, not a database-readiness guarantee.

## Interactive API reference

With local development configuration, open `http://localhost:3000/api/docs` for Swagger UI or `/api/docs-json` for the OpenAPI document. `API_DOCS_ENABLED` defaults to `true` outside production and `false` in production; only the literal values `true` and `false` are accepted. Set it explicitly to hide the docs locally or enable them in a controlled production environment. Disabled docs return 404. The UI and JSON document are served by this API, use relative same-origin paths, set `Cache-Control: no-store`, and do not call an external validator or CDN.

The reference describes the callable API: health, account/session and the ten explicitly supported Better Auth routes, workout summaries, exercise guides, and versioned live-tracking and experimental-demo assets. Sign in through the documented endpoint in Swagger UI; its requests include the browser's HttpOnly cookie. There is no bearer-token authorization flow or persisted Swagger authorization. Swagger does not display session cookies, secrets, or account records in the document. The docs are an API reference, not a production authorization boundary; enabling them makes the reference public at that API origin.

Workout DELETE requests require JSON even though the body is empty. Swagger sends `{}` with `Content-Type: application/json`. Workout summaries are client-reported estimates; no video, landmarks, RIR, or study labels are included.

Nest controllers describe their operations with Swagger decorators; feature-owned DTOs describe fields with `@ApiProperty`. Shared setup lives in `src/swagger/configure-swagger.ts`, and the auth bridge supplies only allowlisted operations from Better Auth's native schema generator. Do not duplicate route definitions in a handwritten OpenAPI file.

## Accounts contract

Use `credentials: 'include'` on browser requests. Auth errors provide a `message` and may include `code`; `/api/me` unauthorized errors use Nest's `{statusCode,message,error}`. Successful signup signs the user in automatically. Signup/signin return Better Auth's native user/token response; clients should ignore returned tokens and use cookies, never browser storage. Restore the UI through `/api/me`.

| Method and path | Body | Result |
| --- | --- | --- |
| `POST /api/auth/sign-up/email` | `{name,email,password}` | 200, user and HttpOnly session cookie |
| `POST /api/auth/sign-in/email` | `{email,password}` | 200 and HttpOnly session cookie; wrong credentials 401 |
| `POST /api/auth/sign-out` | `{}` | 200; database session revoked |
| `GET /api/me` | — | `{user:{id,name,email,emailVerified,image,createdAt,updatedAt}}`; no session secrets; 401 if absent/expired |
| `GET /api/auth/get-session` | — | Native Better Auth session response, or null |
| `POST /api/auth/update-user` | `{name}` | Authenticated; 200 `{status:true}`, updates only the account name |
| `POST /api/auth/delete-user` | `{password}` | Authenticated; requires the current password, deletes the signed-in account and clears its session |
| `POST /api/auth/send-verification-email` | `{email,callbackURL?}` | Authenticated; can send only to the signed-in account's address |
| `GET /api/auth/verify-email?token=...` | — | Verifies a valid token; the client should ask the user to confirm before calling this endpoint |
| `POST /api/auth/request-password-reset` | `{email,redirectTo?}` | Generic acknowledgment for known and unknown addresses; it means the request was processed, not that delivery succeeded |
| `POST /api/auth/reset-password` | `{token,newPassword}` | Resets a password with a valid token; revokes all account sessions |

Names are trimmed, 1–80 characters. Profile updates accept exactly `{name}`; other fields, including email, verification state and image, are rejected. Emails must be valid. Passwords are 12–128 characters, hashed by Better Auth. Invalid input returns 400; duplicate signup returns 422. Signup keeps its existing auto-session behavior and does not send email; existing unverified accounts can still sign in. Email verification is an explicit signed-in action. A valid confirmation token updates `emailVerified`; verification links expire after one hour. Password reset links expire after 15 minutes and can be used once. Reset emails use a fixed configured frontend origin, and supplied redirect values must resolve to a configured frontend origin.

Account deletion accepts exactly the current password. Better Auth checks that password against the signed-in user's credential account; fresh-session status alone, missing passwords, callback URLs, deletion tokens and user IDs cannot authorize deletion. On success, Better Auth deletes the account and its credentials/sessions and clears the session cookie. Pending password-reset verification records for that user are also removed. The current API has no history or study-data tables.

Set both `RESEND_API_KEY` and `EMAIL_FROM` to enable outbound email. Leave both blank for local account development; verification-send and reset-request routes then return 503 uniformly without looking up account addresses. Previously issued links can still be confirmed or consumed during a provider outage because token operations require the auth secret and database, not Resend. The key is used only by the backend. Resend send failures on verification return 503. Password-reset requests keep the same generic acknowledgment for known/unknown addresses, including when provider delivery fails; delivery failures are recorded with a generic server log message that contains no address, token, key, or request data. Do not treat the acknowledgment as proof that an email was sent. Real Resend delivery requires a configured sender/domain and credentials and has not been verified in this environment.

Requests over 16 KiB are rejected before authentication parsing. Private responses use `Cache-Control: no-store`, including errors. When Resend is configured, verification email sends and password reset requests have path-specific in-process rate limits of five per minute per client IP; verification and reset completions are limited to 10 and five per minute. Existing signup/signin limits remain in place.

Sessions last seven days with database-backed validation (no cookie cache), and rotate/update after one day. Cookies are HttpOnly and SameSite=Lax; production cookies are Secure. Trusted origins protect writes. Rate limits are in-process: 20 signup requests and 10 signin requests per minute per client IP, with a general limit of 30. Limits reset on process restart and are intended for the selected single-process VPS, not multiple replicas.

## Deployment configuration

Set `NODE_ENV=production`, explicit HTTPS `BETTER_AUTH_URL` and comma-separated exact `FRONTEND_ORIGINS`. Netlify's same-origin `/api` proxy lets the backend use the public frontend origin for both settings. Cookie behavior still needs verification after deployment.

No proxy is trusted by default. Kamal's HTTPS proxy does not forward client IP headers by default. This keeps client-supplied headers out of rate-limit identity, but users behind Netlify may share an apparent IP and rate limits can group them. Revisit this after hosted checks. The optional Compose file is for a local development database only.

## Live tracking assets

The tracking API publishes the pinned MediaPipe Tasks Vision 1.1.1 runtime files and Google's versioned Pose Landmarker Full `float16/1` task from local disk. It does not accept camera uploads or proxy requests to external hosts. Provision the ignored local assets from the repository root:

```sh
node web/backend/scripts/prepare-tracking-assets.mjs
```

The script downloads only the six WASM loader/binary files from the pinned `@mediapipe/tasks-vision@1.1.1` package and the official Google `pose_landmarker_full/float16/1` task. It writes atomically under `models/mediapipe/1.1.1/` and records source URLs, sizes and SHA-256 hashes in an ignored `manifest.json`. Re-running verifies the same hashes and refuses to replace an existing immutable version if upstream bytes change. Set `TRACKING_ASSET_DIR` when the assets live outside the repository default.

| Method and path | Result |
| --- | --- |
| `GET /api/tracking/config` | `{runtimeVersion,modelUrl,wasmRoot,exerciseId}`; `503` until every local asset is provisioned |
| `GET /api/tracking/assets/:version/:filename` | Public allowlisted runtime/model bytes with versioned immutable caching; unknown versions or filenames return `404` |

The config response is `no-store`. Asset URLs include both runtime and model versions and use `Cache-Control: public, max-age=31536000, immutable`. The browser can load WASM and model bytes from the same API origin. The supported exercise ID is `two-arm-dumbbell-curl`. Camera frames remain in the browser; there is no upload endpoint. This serves pose-estimation assets only; it does not claim rep-counting accuracy or produce RIR estimates.

## Experimental synthetic RIR demo

`GET /api/experimental-rir/config` preserves the speed-only no-store contract. `GET /api/experimental-rir/config/speed-movement` explicitly selects the second model; `/config/speed-only` is also available, and unsupported model names return 400. Both responses mark `synthetic: true` and `deploymentApproved: false`, and include the exact version, SHA-256, feature order and feature-definition version. Speed-only inputs are `mean_up_speed_deg_s` and `peak_up_speed_deg_s`; the movement model adds `movement_instability` as a third input. That field is a synthetic dimensionless value, not a calibrated muscle-tremor or browser/pilot feature. `GET /api/experimental-rir/assets/:version/model.onnx` serves only the two allowlisted, versioned and hash-verified files with immutable caching; other versions or filenames return 404. Missing, changed, or invalid bundle metadata returns 503.

| Config route | Bundle version | SHA-256 | Ordered inputs |
| --- | --- | --- | --- |
| `/api/experimental-rir/config` (or `/config/speed-only`) | `synthetic-rir-speed-only-v1` | `7c734ec947b86df655635a9bca5058801fb7c63fedf9049eb3a82caf6bdbb627` | `mean_up_speed_deg_s`, `peak_up_speed_deg_s` |
| `/api/experimental-rir/config/speed-movement` | `synthetic-rir-speed-movement-v1` | `54c30a7a9ccb76ab7b03f5f4ab51b554a59d8f7571ff6156f2e298bd35689c2c` | `mean_up_speed_deg_s`, `peak_up_speed_deg_s`, `movement_instability` |

Both ONNX artifacts are from synthetic run `20261021T155611102710Z`; each manifest records its source artifact and model hash plus the dataset hash, split counts, preprocessing and software-only notice. This endpoint serves model bytes only: it does not run inference, store predictions or create workout history. The models are not research evidence, curl-validated, medically validated, or approved for production use. The movement feature does not establish tremor measurement or improvement over speed-only. Any preview using these models must remain labeled synthetic and experimental, not validated exercise feedback.

## Personal workout history

Apply migrations before starting the API:

```sh
pnpm --filter @replens/backend db:migrate
```

All workout-session routes require the signed-in account's cookie session. The server derives the owner from that session; request bodies never select a user. Anonymous requests return 401. A record owned by another account is indistinguishable from a missing record and returns 404. Private success and error responses use `Cache-Control: no-store`.

| Method and path | Body/query | Result |
| --- | --- | --- |
| `POST /api/workout-sessions` | `{clientId,startedAt,endedAt,completedReps,interrupted,counterVersion?}` | Creates a summary (201); identical retry returns the existing summary (200); conflicting retry with the same client ID returns 409 |
| `GET /api/workout-sessions?limit=20&cursor=...` | Optional limit 1–50 and opaque cursor | `{items,nextCursor}` ordered newest-first |
| `GET /api/workout-sessions/:id` | — | One owner-scoped summary |
| `DELETE /api/workout-sessions/:id` | No body; `Content-Type: application/json` required | Deletes one owner-scoped summary and returns 204 |

The create body requires the five session fields; `counterVersion` is optional and defaults to `world-full-v1` for older clients. The accepted versions are `world-full-v1` and `world-full-v2`; other values are rejected. `clientId` must be a UUID; timestamps must be ISO date-times with an offset; completed reps must be an integer from 0 through 1000; and `interrupted` must be boolean. End time must follow start time, sessions can last at most two hours, and neither timestamp may be more than five minutes in the future. The server derives duration and creation time, and fixes `exerciseId` to `two-arm-dumbbell-curl`. The submitted allowlisted counter version is stored and participates in idempotency comparison. It rejects unknown keys, including `userId` and client-supplied exercise IDs.

These are client-reported counting estimates for a person's own history, not validated study measurements or medical data. The API does not persist video, pose landmarks or RIR. Deleting an account cascades to that account's summaries. Mutations require an Origin matching the configured auth or frontend origin and use `Content-Type: application/json`; request bodies remain bounded to 16 KiB. Pagination is keyset-based and capped at 50 entries per page.

## Exercise guides

The backend serves the existing 14 authored exercise guides and their curated photo-source credits as public read-only content. The catalog is stored in `src/exercises/catalog/`; it preserves the guide instructions, references, image URLs, credits, publisher-declared licenses and variation notes. Photo URLs are returned as metadata and are not fetched or proxied by the API. Guide availability does not imply tracking or RIR support: only `two-arm-dumbbell-curl` has `cameraPreview: true`.

| Method and path | Result |
| --- | --- |
| `GET /api/exercises` | `{items,groups}` with all guides, including each guide's `photos` object; groups are ordered `All`, `Arms`, `Chest`, `Back`, `Shoulders`, `Legs`, `Core` |
| `GET /api/exercises/:id` | One guide; unknown IDs return 404 |

These endpoints are public and accept no query parameters; any query string returns 400. Successful responses use `Cache-Control: public, max-age=300`; errors are not cached. The frontend can migrate its catalog reads to these same-origin routes while retaining its existing search/filter behavior; the backend does not filter the fixed catalog. API responses remain outside the service-worker shell cache.

## Backend deployment with Kamal

Kamal deploys only the NestJS API to one VPS. Netlify still builds the frontend, and Miget remains the external PostgreSQL database. The API image contains the pinned MediaPipe pose files and the explicitly synthetic experimental ONNX demo bundle, so the VPS needs no model-file mount or manual asset download. No real-data-trained or production-approved RIR model is available.

1. Install [Kamal 2](https://kamal-deploy.org/docs/installation/) on your computer. Keep local Docker running for image builds. Use a VPS with SSH access and an API hostname whose DNS A record points to that VPS. Open inbound TCP 80 and 443. The simplest first setup uses root SSH; another user may need Docker installed and access configured first.
2. From the repository root, copy `.kamal/deploy.env.example` to ignored `.kamal/deploy.env`. Enter the VPS IP, API hostname, exact HTTPS Netlify frontend origin, SSH user, private key path, and VPS CPU architecture. The private key stays on your computer.
3. Copy `.kamal/secrets.example` to ignored `.kamal/secrets`. Enter Miget's external `DATABASE_URL` and a new production `BETTER_AUTH_SECRET` of at least 32 characters. Rotate the Miget password previously shared in chat. Do not put credentials in tracked YAML, the frontend, or Netlify.
4. Apply any pending database migrations with `pnpm db:migrate:miget` from the repository root, after taking a Miget backup. The existing migration helper uses a temporary local Docker container. Kamal does not run migrations automatically.
5. Run `kamal config` to review the resolved configuration, then `kamal setup` for first deployment. Run `kamal deploy` for later releases. Kamal starts Docker on a fresh root-access VPS, a local image registry and its HTTPS proxy; it builds the backend image locally and uploads it. GitHub Actions builds on an ARM runner when the VPS architecture is ARM64, and reuses BuildKit caches for the migration and API images. The proxy retains the `/api/health` readiness check and allows 90 seconds for a cold app startup; failed deploys collect redacted recent proxy and app logs without restarting services. It is not a zero-touch server: you still need DNS, a reachable VPS, SSH, open ports and a backup plan.
6. Set Netlify's `API_UPSTREAM_ORIGIN` build variable to `https://<your API hostname>`, then deploy the frontend. Its generated `/api/*` proxy sends browser API calls to the VPS while retaining the frontend origin for cookies.

Verify `https://<API hostname>/api/health` first, then test signup, reload/signin, history and live rep counting through the **public Netlify frontend URL**. The health route is a process liveness check; it does not prove database connectivity. Production Swagger is disabled by default; change `API_DOCS_ENABLED` in `config/deploy.yml` to `true` only if you intend to expose the API reference publicly, then redeploy.

For email verification and reset, add both `RESEND_API_KEY` and `EMAIL_FROM` to ignored `.kamal/secrets` and list both under `env.secret` in `config/deploy.yml`. Then redeploy. Until both are configured, signup/signin work but email actions return unavailable. Test delivery with a sender domain you control.

Kamal's image rollback does not reverse database migrations. Back up Miget before schema changes and check old/new schema compatibility. Public DNS, TLS, Netlify cookie behavior, Miget access from the VPS, email delivery, and real-phone performance remain unverified until you supply hosting details and deploy.

### Automatic deployment from `main`

The `deploy` job in `.github/workflows/checks.yml` runs after the existing checks pass on a push to `main`. It verifies SSH, applies pending Prisma migrations from the committed migration files, deploys with Kamal, and checks the public health URL. A failed check or migration stops deployment. Pull requests and pushes to `dev` do not deploy. The job is disabled until the repository variable `DEPLOY_ENABLED` is set to `true`. It uses repository secrets so this private repository does not depend on a paid GitHub environment feature.

Set these GitHub Actions **variables** in repository Settings → Secrets and variables → Actions:

| Variable | Value |
| --- | --- |
| `DEPLOY_ENABLED` | `true` after the VPS, DNS, backup policy and credentials are ready |
| `REPLENS_VPS_IP` | VPS public IP |
| `REPLENS_API_HOST` | API hostname without `https://` |
| `REPLENS_FRONTEND_ORIGIN` | Exact HTTPS Netlify frontend origin |
| `REPLENS_SSH_USER` | SSH user; defaults to `root` |
| `REPLENS_VPS_ARCH` | `amd64` or `arm64`; defaults to `amd64` |

Set these **repository secrets** in the same Actions settings page:

| Secret | Value |
| --- | --- |
| `DEPLOY_SSH_PRIVATE_KEY` | Private key for an SSH account authorized on this VPS; never paste it into chat or Git |
| `DATABASE_URL` | Miget's external PostgreSQL URL with the rotated password and required TLS settings |
| `BETTER_AUTH_SECRET` | New production random secret of at least 32 characters |

Before enabling deployments, ensure Miget has recoverable backups. The workflow applies migrations before replacing the API container; migrations must remain compatible with the running version. To initialize a fresh VPS without installing Kamal locally, run **Actions → Application checks → Run workflow** on `main` with **first_setup** checked. Leave it unchecked on later manual runs. Subsequent successful `main` pushes run `kamal deploy` automatically. Netlify's Git integration separately publishes the frontend from `main` once its site and `API_UPSTREAM_ORIGIN` are configured. The two publishes can overlap, so paired API/frontend changes must be compatible during rollout.

The CI runner accepts the VPS SSH host key on its first connection within each run, then Kamal uses that runner's SSH configuration. No host-key secret is required. Because runners do not retain `known_hosts` between runs, this does not detect a changed VPS identity across separate deployments.

## Verification

```sh
pnpm check
pnpm build
pnpm test
```

The default backend tests validate configuration without a database. Integration tests are a separate required gate, run in CI with PostgreSQL. They fail explicitly if `TEST_DATABASE_URL` is absent or the database name does not end in `_test`. They create isolated synthetic test accounts, clean those accounts up and never truncate tables.

For a disposable test database, apply migrations then run:

```sh
DATABASE_URL="$TEST_DATABASE_URL" pnpm --filter @replens/backend db:migrate
pnpm --filter @replens/backend test:integration
```

Coverage: real signup and hashing, invalid input, duplicate signup, untrusted origin rejection, HttpOnly cookie, protected current-user data, session continuity across API restart, logout/revocation, expiry, no-store aliases, body limit, unavailable email actions and rate limiting. The account integration flow also checks legacy counter-version defaulting, accepted `world-full-v2`, rejection of unknown versions, and version-sensitive idempotency on the disposable `_test` database. History ownership, pagination, validation and deletion remain manually checked. Expanded integration coverage for verification, reset and the Resend transport is deferred; real Resend delivery, deployment and real-device browser behavior remain unverified.

The CI workflow requires checks/builds/unit tests and PostgreSQL integration tests on PRs to `dev` and `main`. Prisma CLI/client/adapter stay on matching stable versions; exact Better Auth release-age exceptions are limited to the documented 1.7.11 release family. Generated Prisma source is ignored and regenerated during check/build.

References: [Better Auth Express integration](https://better-auth.com/docs/integrations/express), [Prisma adapter](https://better-auth.com/docs/adapters/prisma), [Prisma configuration](https://www.prisma.io/docs/orm/reference/prisma-config-reference).

Deployment build references: [GitHub-hosted ARM runners](https://docs.github.com/en/actions/reference/runners/github-hosted-runners), [Kamal builder cache](https://kamal-deploy.org/docs/configuration/builder-examples/), and [Docker's GitHub Actions cache backend](https://docs.docker.com/build/cache/backends/gha/).

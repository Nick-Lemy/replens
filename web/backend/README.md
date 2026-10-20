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
pnpm dev
```

Do not run `down -v` against a database containing records you need. The API loads `web/backend/.env` when run through its workspace scripts. Configuration rejects missing database/secret, invalid ports, wildcard/path origins and non-HTTPS production origins. `GET /api/health` remains a liveness response, not a database-readiness guarantee.

## Interactive API reference

With local development configuration, open `http://localhost:3000/api/docs` for Swagger UI or `/api/docs-json` for the OpenAPI document. `API_DOCS_ENABLED` defaults to `true` outside production and `false` in production; only the literal values `true` and `false` are accepted. Set it explicitly to hide the docs locally or enable them in a controlled production environment. Disabled docs return 404. The UI and JSON document are served by this API, use relative same-origin paths, set `Cache-Control: no-store`, and do not call an external validator or CDN.

The reference describes the callable API: health, account/session and the ten explicitly supported Better Auth routes, workout summaries, exercise guides, and versioned live-tracking configuration/assets. Sign in through the documented endpoint in Swagger UI; its requests include the browser's HttpOnly cookie. There is no bearer-token authorization flow or persisted Swagger authorization. Swagger does not display session cookies, secrets, or account records in the document. The docs are an API reference, not a production authorization boundary; enabling them makes the reference public at that API origin.

Workout DELETE requests require JSON even though the body is empty. Swagger sends `{}` with `Content-Type: application/json`. Workout summaries are client-reported estimates; no video, landmarks, RIR, or study labels are included.

## Accounts contract

Use `credentials: 'include'` on browser requests. Auth errors use `{code,message}`; `/api/me` unauthorized errors use Nest's `{statusCode,message,error}`. Successful signup signs the user in automatically. Signup/signin return the Better Auth user/session response; clients should ignore returned tokens and use cookies, never browser storage. Restore the UI through `/api/me`.

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

Set `NODE_ENV=production`, explicit HTTPS `BETTER_AUTH_URL` and comma-separated exact `FRONTEND_ORIGINS`. Frontend/API need same-site custom domains (for example app.example.com and api.example.com), or a verified same-origin proxy. Unrelated Netlify/VPS domains can trigger third-party-cookie restrictions; changing SameSite alone does not make that reliable. Deployment is not yet verified.

No proxy is trusted by default. For Caddy, configure `TRUSTED_PROXY_CIDRS` with only its exact source IP or tightly scoped network, and keep the API inaccessible directly from the internet. Express derives the client IP using that trust list; the auth bridge overwrites its private IP header so clients cannot spoof rate-limit identity. Caddy must sanitize forwarded headers. Never set broad all-network trust. The optional Compose file is local development only, not a production deployment.

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

## Personal workout history

Apply migrations before starting the API:

```sh
pnpm --filter @replens/backend db:migrate
```

All workout-session routes require the signed-in account's cookie session. The server derives the owner from that session; request bodies never select a user. Anonymous requests return 401. A record owned by another account is indistinguishable from a missing record and returns 404. Private success and error responses use `Cache-Control: no-store`.

| Method and path | Body/query | Result |
| --- | --- | --- |
| `POST /api/workout-sessions` | `{clientId,startedAt,endedAt,completedReps,interrupted}` | Creates a summary (201); identical retry returns the existing summary (200); conflicting retry with the same client ID returns 409 |
| `GET /api/workout-sessions?limit=20&cursor=...` | Optional limit 1–50 and opaque cursor | `{items,nextCursor}` ordered newest-first |
| `GET /api/workout-sessions/:id` | — | One owner-scoped summary |
| `DELETE /api/workout-sessions/:id` | No body; `Content-Type: application/json` required | Deletes one owner-scoped summary and returns 204 |

The create body must contain exactly the five listed fields. `clientId` must be a UUID; timestamps must be ISO date-times with an offset; completed reps must be an integer from 0 through 1000; and `interrupted` must be boolean. End time must follow start time, sessions can last at most two hours, and neither timestamp may be more than five minutes in the future. The server derives duration and creation time, and fixes `exerciseId` to `two-arm-dumbbell-curl` and `counterVersion` to `world-full-v1`. It rejects unknown keys, including `userId` and client-supplied exercise/counter identifiers.

These are client-reported counting estimates for a person's own history, not validated study measurements or medical data. The API does not persist video, pose landmarks or RIR. Deleting an account cascades to that account's summaries. Mutations require an Origin matching the configured auth or frontend origin and use `Content-Type: application/json`; request bodies remain bounded to 16 KiB. Pagination is keyset-based and capped at 50 entries per page.

## Exercise guides

The backend serves the existing 14 authored exercise guides and their curated photo-source credits as public read-only content. The catalog is stored in `src/exercises/catalog/`; it preserves the guide instructions, references, image URLs, credits, publisher-declared licenses and variation notes. Photo URLs are returned as metadata and are not fetched or proxied by the API. Guide availability does not imply tracking or RIR support: only `two-arm-dumbbell-curl` has `cameraPreview: true`.

| Method and path | Result |
| --- | --- |
| `GET /api/exercises` | `{items,groups}` with all guides, including each guide's `photos` object; groups are ordered `All`, `Arms`, `Chest`, `Back`, `Shoulders`, `Legs`, `Core` |
| `GET /api/exercises/:id` | One guide; unknown IDs return 404 |

These endpoints are public and accept no query parameters; any query string returns 400. Successful responses use `Cache-Control: public, max-age=300`; errors are not cached. The frontend can migrate its catalog reads to these same-origin routes while retaining its existing search/filter behavior; the backend does not filter the fixed catalog. API responses remain outside the service-worker shell cache.

## VPS deployment configuration

The deployment files under `deploy/` prepare a Docker Compose stack for one VPS. They have not been used to publish a service. No production hostname, Netlify proxy target, credentials, VPS, or production database was supplied, so DNS, TLS issuance, browser cookie behavior, and real Resend delivery remain unverified.

Copy `deploy/production.env.example` to the ignored `deploy/.env` and replace every example value. Set `API_HOST` to the API hostname that will point to the VPS. Set `FRONTEND_ORIGIN` to the exact HTTPS Netlify site origin. Because the browser calls same-origin `/api`, Netlify must proxy `/api/*` to `https://API_HOST`; the frontend `build:netlify` command generates this route from its required `API_UPSTREAM_ORIGIN` build setting. `BETTER_AUTH_URL` and `FRONTEND_ORIGINS` are set to `FRONTEND_ORIGIN` for this proxy arrangement. The template trusts one exact frontend origin; preview URLs are not automatically trusted. `API_DOCS_ENABLED` defaults to false in the production Compose stack; enable the docs only when public API documentation is intended. Use a URL-safe database password and put the identical password in `POSTGRES_PASSWORD` and `DATABASE_URL`. Keep the generated auth secret and Resend credentials private.

The API and database have no published host ports. Caddy alone publishes 80/443 (default bind `0.0.0.0`) and proxies only `/api` routes; other paths return 404. Set `PUBLIC_BIND_ADDRESS=127.0.0.1` and nonstandard host ports for a local-only Docker smoke test. PostgreSQL is on an internal network. Caddy and the API use a dedicated edge network with fixed private addresses so Express trusts only the Caddy container as a proxy. Caddy replaces the forwarded client-IP header with its immediate peer address. When Netlify proxies a request, that peer is a Netlify edge; the API cannot identify the original browser IP from this configuration, so its existing IP rate limits can group users behind shared Netlify edges. Do not add trust for client-supplied IP headers.

The API image uses the Node 24 official image and pnpm 11.25.0, installs only backend production dependencies in its runtime stage, runs as the non-root `node` user, has a read-only root filesystem, and drops Linux capabilities. Ignored `models/mediapipe/1.1.1` files are mounted read-only. Database data and Caddy certificate/configuration data use named volumes. Migrations run only through the explicit `migrate` service; API startup never migrates automatically.

### First deployment and updates

Run these commands from the repository root after the VPS DNS A record points to the host and the firewall permits inbound TCP 80/443 (UDP 443 is optional for HTTP/3):

```sh
cp web/backend/deploy/production.env.example web/backend/deploy/.env
# Edit the ignored .env with the real API host, frontend origin and unique secrets.
node web/backend/scripts/prepare-tracking-assets.mjs
cd web/backend/deploy
docker compose --env-file .env -f compose.yml config -q
docker compose --env-file .env -f compose.yml build api migrate
docker compose --env-file .env -f compose.yml up -d db
docker compose --env-file .env -f compose.yml --profile ops run --rm migrate
docker compose --env-file .env -f compose.yml up -d api caddy
API_HOST='the exact public API hostname from deploy/.env'
curl --fail "https://${API_HOST}/api/health"
```

Before each release, take a database backup, set `DEPLOY_VERSION` to the source commit (for example its short Git SHA), build the API and migration images, review the migration, run the explicit migration command, then start the new API. Keep earlier versioned images for rollback. Roll back code by restoring the previous `DEPLOY_VERSION` and running `docker compose ... up -d --no-build api`; do not roll back schema automatically. Confirm that the migration remains compatible with the old code first. Never use `docker compose down -v` on a database volume you need.

### Database backup and restore

Create a private local backup directory and stream a custom-format PostgreSQL dump from the running database container:

```sh
umask 077
BACKUP_DIR="$HOME/replens-backups"
mkdir -p "$BACKUP_DIR"
docker compose --env-file .env -f compose.yml exec -T db pg_dump -U replens -d replens -Fc > "$BACKUP_DIR/replens-$(date -u +%Y%m%dT%H%M%SZ).dump"
```

For restore, stop the API, create a separate empty target database, and restore into it without dropping tables. Keep the original database and volume intact until the restored copy has been verified. Update only `DATABASE_URL` in the ignored `.env` to point to the restored database, then run migrations and start the API. To return to the original database, restore the original URL and restart the API.

```sh
docker compose --env-file .env -f compose.yml stop api
docker compose --env-file .env -f compose.yml exec db createdb -U replens replens_restore
docker compose --env-file .env -f compose.yml exec -T db pg_restore -U replens -d replens_restore --no-owner < "$BACKUP_DIR/REPLENS_BACKUP.dump"
# Update DATABASE_URL to end in /replens_restore, then:
docker compose --env-file .env -f compose.yml --profile ops run --rm migrate
docker compose --env-file .env -f compose.yml up -d api
```

Keep backups outside the repository and VPS where possible, restrict access, and verify a restore before relying on the backup. The repository ignores the local `deploy/backups/` directory and Docker excludes backup dumps from build contexts. Real DNS/TLS, Netlify proxy and cookie behavior, physical-device access, backup recovery, and provider email delivery require checks after the user supplies the deployment details.

Deployment references: [Docker official Node image](https://hub.docker.com/_/node), [Docker Compose startup order and health checks](https://docs.docker.com/compose/how-tos/startup-order/), [Docker multi-stage builds](https://docs.docker.com/build/building/multi-stage/), and [Caddy reverse proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy).

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

Coverage: real signup and hashing, invalid input, duplicate signup, untrusted origin rejection, HttpOnly cookie, protected current-user data, session continuity across API restart, logout/revocation, expiry, no-store aliases, body limit, unavailable email actions and rate limiting. New automated history coverage is deferred; its database/API ownership, idempotency, pagination, validation and deletion behavior are checked manually on the disposable `_test` database. Expanded integration coverage for verification, reset and the Resend transport is deferred; real Resend delivery, deployment and real-device browser behavior remain unverified.

The CI workflow requires checks/builds/unit tests and PostgreSQL integration tests on PRs to `dev` and `main`. Prisma CLI/client/adapter stay on matching stable versions; exact Better Auth release-age exceptions are limited to the documented 1.7.11 release family. Generated Prisma source is ignored and regenerated during check/build.

References: [Better Auth Express integration](https://better-auth.com/docs/integrations/express), [Prisma adapter](https://better-auth.com/docs/adapters/prisma), [Prisma configuration](https://www.prisma.io/docs/orm/reference/prisma-config-reference).

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

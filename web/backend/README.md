# RepLens API

NestJS + TypeScript, Better Auth 1.7.11 and PostgreSQL through Prisma 7.10.1. Accounts are real persisted records; email verification/recovery, profile edits, history and ML are outside Sprint 1.

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

Names are trimmed, 1–80 characters. Emails must be valid. Passwords are 12–128 characters, hashed by Better Auth. Invalid input returns 400; duplicate signup returns 422. All other authentication routes, including recovery and verification, return 404 rather than pretending to send email. Accounts are currently unverified; `emailVerified` remains false. Requests over 16 KiB are rejected before authentication parsing. Private responses use `Cache-Control: no-store`, including errors.

Sessions last seven days with database-backed validation (no cookie cache), and rotate/update after one day. Cookies are HttpOnly and SameSite=Lax; production cookies are Secure. Trusted origins protect writes. Rate limits are in-process: 20 signup requests and 10 signin requests per minute per client IP, with a general limit of 30. Limits reset on process restart and are intended for the selected single-process VPS, not multiple replicas.

## Deployment configuration

Set `NODE_ENV=production`, explicit HTTPS `BETTER_AUTH_URL` and comma-separated exact `FRONTEND_ORIGINS`. Frontend/API need same-site custom domains (for example app.example.com and api.example.com), or a verified same-origin proxy. Unrelated Netlify/VPS domains can trigger third-party-cookie restrictions; changing SameSite alone does not make that reliable. Deployment is not yet verified.

No proxy is trusted by default. For Caddy, configure `TRUSTED_PROXY_CIDRS` with only its exact source IP or tightly scoped network, and keep the API inaccessible directly from the internet. Express derives the client IP using that trust list; the auth bridge overwrites its private IP header so clients cannot spoof rate-limit identity. Caddy must sanitize forwarded headers. Never set broad all-network trust. The optional Compose file is local development only, not a production deployment.

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

Coverage: real signup and hashing, invalid input, duplicate signup, untrusted origin rejection, HttpOnly cookie, protected current-user data, session continuity across API restart, logout/revocation, expiry, no-store aliases, body limit, unavailable recovery and rate limiting. This verifies the API, not deployment or real-device browser behaviour.

The CI workflow requires checks/builds/unit tests and PostgreSQL integration tests on PRs to `dev` and `main`. Prisma CLI/client/adapter stay on matching stable versions; exact Better Auth release-age exceptions are limited to the documented 1.7.11 release family. Generated Prisma source is ignored and regenerated during check/build.

References: [Better Auth Express integration](https://better-auth.com/docs/integrations/express), [Prisma adapter](https://better-auth.com/docs/adapters/prisma), [Prisma configuration](https://www.prisma.io/docs/orm/reference/prisma-config-reference).

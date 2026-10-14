# RepLens backend

One NestJS + TypeScript backend. The initial module exposes `GET /api/health`; it confirms the API process is running, not database readiness.

From the repository root, run `pnpm install`, then `pnpm dev:backend`. The API listens on http://127.0.0.1:3000. `PORT`, `HOST` and `FRONTEND_ORIGIN` can be supplied as environment variables. `.env.example` documents them; this starter does not automatically load `.env` files.

Run `pnpm --filter @replens/backend build`, then `pnpm start:backend` for compiled execution. TypeScript 6 is used here because the current Nest CLI uses that compiler and Nest relies on decorator metadata; the frontend uses TypeScript 7 separately.

Better Auth, Prisma/PostgreSQL, exercise guides and user history are the next modules. They are not implemented by this initial setup. VPS deployment through Caddy and Docker Compose is planned; deployment files will be added when the backend requires its database and domain configuration.

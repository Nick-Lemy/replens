# Sprint 1 — Accounts and secure sessions

Scope approved: real email/password signup, signin, signout, current user and cookie-backed session restoration, backed by PostgreSQL and Better Auth. Email verification/recovery, profile editing/deletion, saved sessions, rep tracking and RIR integration belong to later features.

## Acceptance criteria

- Accounts persist across API restarts and sessions survive browser reloads.
- Invalid input/credentials and duplicate accounts are handled honestly.
- Unauthenticated private requests return 401; logout invalidates the session.
- Cookies, trusted origins and private-response caching are tested.
- Existing guides, camera preview, local preferences and PWA boundaries remain intact.
- Backend integration tests use isolated real PostgreSQL; browser tests use the real API.
- No credentials/tokens in browser storage and no fake user activity or prediction data.
- Lead independently reviews both PRs and verifies the complete feature before requesting human approval.

## Progress

| Stage | Owner | Status | Branch / PR |
|---|---|---|---|
| Backend | Backend Engineer | Implementing | `ft/accounts-backend`; PR pending |
| Backend review | Lead | Waiting | Must pass before frontend implementation |
| Frontend | Frontend Engineer | Read-only preparation | Branch not created; waits for backend merge |
| Integration verification | Lead | Waiting | Real PostgreSQL + browser workflow |
| Human review | Nick | Not ready | `dev` → `main` PR pending |

## Verification baseline

Sprint 0: both TypeScript checks and production builds passed; two existing frontend tests passed; compiled health endpoint returned 200. No auth/database/browser interaction tests existed at baseline. Private repository, clean `main`, no previous `dev` branch or PRs; Husky installed and active.

## Current decisions

- Local frontend defaults to the Vite `/api` proxy. Production origins/base URLs remain explicit environment configuration; deployment is not part of this feature.
- Better Auth owns authentication; Nest exposes a protected current-user contract for the UI.
- Frontend implementation starts only after the backend PR is reviewed and merged into `dev`.
- No merge to `main`, next feature or Sprint 2 without explicit user approval.

## Remaining gates

Backend tests/review/merge → frontend implementation/tests/review/merge → independent end-to-end verification → PR to `main` → stop for human approval.

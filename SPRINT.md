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
| Backend | Backend Engineer | Merged to `dev` | `ft/accounts-backend`; [PR #1](https://github.com/Nick-Lemy/replens/pull/1) |
| Backend review | Lead | Passed | Code review, separate real database tests and GitHub CI; merged at `2e13447` |
| Frontend | Frontend Engineer | Reviewed and merged to `dev` | `ft/accounts-frontend`; [PR #2](https://github.com/Nick-Lemy/replens/pull/2), merge `7e43f65` |
| Integration verification | Lead | Passed | Merged `dev`: real PostgreSQL + browser workflow |
| Human review | Nick | Approved and merged | [PR #3](https://github.com/Nick-Lemy/replens/pull/3); `main`/`dev` synchronized at `97c19d3` |

## Verification baseline

Sprint 0: both TypeScript checks and production builds passed; two existing frontend tests passed; compiled health endpoint returned 200. No auth/database/browser interaction tests existed at baseline. Private repository, clean `main`, no previous `dev` branch or PRs; Husky installed and active.

## Current decisions

- Local frontend defaults to the Vite `/api` proxy. Production origins/base URLs remain explicit environment configuration; deployment is not part of this feature.
- Better Auth owns authentication; Nest exposes a protected current-user contract for the UI.
- Frontend implementation starts only after the backend PR is reviewed and merged into `dev`.
- No merge to `main`, next feature or Sprint 2 without explicit user approval.

## Remaining gates

Sprint 1 complete. Nick authorized the next feature on 19 October 2026.

Backend verification: workspace checks/builds, five configuration tests, two existing frontend tests and 15 PostgreSQL integration tests passed independently. Migration applied to a separate disposable database; signup hashing, restart persistence, session revocation/expiry, origin validation, request-size bounds and no-store responses checked. GitHub application CI and GitGuardian passed. Review comment records requested corrections. No production domain/deployment or phone-device claim.

Final integration checkpoint (19 October 2026): merged `dev` passed both workspace checks/builds and all 30 tests: five configuration, two public-cache/photo, 15 real database integration, seven real API/browser workflows and one isolated stalled-body timeout test. Lead independently reviewed both PRs, requested corrections and re-reviewed them. Browser coverage includes signup/signin/signout, reload, expiry, invalid credentials, network recovery, stale-response protection, modal validation/focus/mobile fit and camera-track cleanup. Reviewed the mobile Profile screenshot. Both feature PRs passed GitHub CI and GitGuardian before merge.

Remaining limitations: production Netlify/API proxy and cookie domains, physical iPhone/Android behaviour and PWA installation need deployment/device checks. Email verification/recovery, profile edits/deletion, history persistence, live counts and RIR remain deferred. No unresolved implementation blocker in this feature.

## Feature 2 — Email verification and password reset

- Provider: Resend, selected by Nick. Credentials and verified sender are not configured yet; no real-recipient test emails authorized.
- Acceptance: explicit email confirmation; expiring reset links, single-use reset and session revocation; generic public reset acknowledgments; honest unavailable/failure states; existing account, guest, camera and PWA behaviour preserved.
- Backend first: `ft/email-access-backend`, Backend Engineer implementing. Frontend branch/implementation waits for backend review and merge. Main Agent owns independent review and final integration tests.
- Model metadata verified: Main `gpt-6.1-sol`/medium; Backend `/root/email_backend` `gpt-6-luna`/medium. Terra is unavailable. Frontend will use Luna/medium when its implementation is unblocked; verify its runtime then.
- Testing: targeted Resend transport failure fixtures and real PostgreSQL account/token tests; real browser/API integration at the final checkpoint. Isolated provider fixtures do not prove real Resend delivery.
- Gate: backend PR → review/merge into `dev` → frontend PR → review/merge → integration → `dev`/`main` PR → stop for Nick's approval. No next feature or automatic main merge.

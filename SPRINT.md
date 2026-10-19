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
- Backend: [PR #4](https://github.com/Nick-Lemy/replens/pull/4) independently reviewed and merged into `dev` at `d0db28b`. Frontend: [PR #5](https://github.com/Nick-Lemy/replens/pull/5) independently reviewed, corrected and merged at `2a8c260`. Existing application CI and GitGuardian passed for both PRs.
- Model metadata verified: Main `gpt-6.1-sol`/medium; Backend `/root/email_backend` and Frontend `/root/email_frontend` use `gpt-6-luna`/medium. Terra is unavailable.
- Verification update from Nick: defer new automated tests until after the sprints. Implement/review features, preserve existing hook/CI checks and use targeted smoke checks. New email-flow coverage and real Resend delivery remain unverified until credentials/testing are available.
- Gate: backend PR → review/merge into `dev` → frontend PR → review/merge → integration → `dev`/`main` PR → stop for Nick's approval. No next feature or automatic main merge.
- Lead verification: backend/frontend TypeScript and builds passed. Real backend/database/browser smoke checked invalid verification/reset links, password mismatch, fragment-token removal, unavailable reset requests and authenticated verification requests; mobile screenshot inspected. Temporary smoke account was removed from the isolated database. Source review covered native token expiry/consumption, session revocation, redirects, privacy and API response validation.
- Nick approved and merged [PR #6](https://github.com/Nick-Lemy/replens/pull/6); `main` and `dev` synchronized at `3d962cc`. Successful email round trips and Resend delivery remain unverified; new automated coverage is deferred.

## Feature 3 — Profile and privacy

- Nick authorized the next feature after merging Feature 2. Scope: persist display-name edits and permanently delete the signed-in account with current-password confirmation; preserve local camera preferences and existing flows.
- Acceptance: authenticated self-only operations, trimmed name validation, rejection of unsupported fields, mandatory password verification for deletion, removal of account/session records and honest loading/error/confirmation states. No email-change, researcher-data or export functionality in this slice.
- Backend [PR #7](https://github.com/Nick-Lemy/replens/pull/7) independently reviewed, smoke-checked and merged at `4343112` after existing CI/GitGuardian passed. Frontend [PR #8](https://github.com/Nick-Lemy/replens/pull/8) independently reviewed, corrected and merged at `f29a374`. Reused Backend/Frontend Engineers use Luna Medium; no new agents or dependencies.
- Existing hooks/CI remain; new automated coverage is deferred. Lead reviews source and uses disposable-account API/browser smoke checks. Stop at the final `dev` → `main` PR for Nick's approval.

- Lead verification: workspace TypeScript/build checks passed on both implementations. Real PostgreSQL/API smoke verified anonymous rejection, input bounds, self-only edits, mandatory password and deletion/session revocation. Mobile browser smoke verified trimmed-name persistence after reload, cancel clearing passwords, incorrect-password rejection, deletion returning to guest, removed database row and `/api/me` returning 401; synthetic accounts cleaned up. Mobile dialog screenshot reviewed. Existing 15 backend integration and eight browser regression tests passed; duplicate React keys found in console were corrected in [PR #9](https://github.com/Nick-Lemy/replens/pull/9), independently reviewed, and the eight browser tests passed again without that warning.

- Final gate: open the scoped `dev` → `main` PR for Nick. Deployment, physical-phone checks and new automated profile-flow coverage remain pending. Live counts and trained RIR inference are not part of this feature.

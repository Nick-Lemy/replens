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

- Nick approved and merged [PR #10](https://github.com/Nick-Lemy/replens/pull/10). `main` and `dev` synchronized at `317654a` before the next feature.

## Feature 4 — Live curl counting

- Scope: browser-local pose landmarks and automatic completed-rep counts for simultaneous two-arm dumbbell curls. No trained RIR model, fabricated estimates, camera uploads or saved history in this slice.
- Backend Engineer (`/root/email_backend`, reused Luna Medium): provision pinned real pose/runtime assets and serve an explicit config plus whitelisted files through a modular API. Missing assets must produce an honest unavailable state.
- Frontend Engineer (`/root/email_frontend`, reused Luna Medium): read-only preparation until backend review/merge; then worker inference, both-arm cycle detection, aligned landmarks and live UI integration. One frame in flight, timestamped processing and cleanup on stop/background/navigation.
- Acceptance: count only complete synchronized bottom/top/bottom cycles with adequate tracking; reject partial/alternating/lost tracking; show count and tracking state, keep RIR unavailable, preserve mobile design/guest/auth/camera/PWA boundaries. Count quality needs real footage checks, not a claimed general accuracy score.
- Verification: no new automated tests per Nick; existing checks/CI, independent API/browser smoke, real public pilot footage where feasible and explicit device limitations. Backend PR → Lead review/merge → frontend implementation/PR → Lead review/merge → integrated checks → final PR to `main` and stop for approval.

- Backend [PR #11](https://github.com/Nick-Lemy/replens/pull/11) independently reviewed and merged at `7fae817` after CI/GitGuardian passed. Lead checks/build and real HTTP smoke verified actual model/WASM delivery, MIME/cache contracts, whitelist rejection and missing-assets handling. Ignored pose assets provisioned locally; frontend implementation now active on `ft/live-counting-frontend`.

- Frontend [PR #12](https://github.com/Nick-Lemy/replens/pull/12): Lead reviewed source and requested fixes for initialization URLs, frontal-view geometry, bounded outliers, interruption handling, unsupported browsers and delayed SDK telemetry. Independent production full-clip smoke counted **9 of 10** manually identified cycles; RIR stayed unavailable, camera/worker stopped, and mobile screenshots were inspected. This is one debugging clip, not an accuracy benchmark; broader footage and physical-phone checks remain pending.
- Privacy correction: a long run exposed delayed SDK logging POSTs that the short startup check missed. Worker fetch restrictions now precede SDK import; Netlify worker-asset CSP provides another boundary. Independent production smoke **without CSP** ran 66 seconds plus task close, with no non-GET requests or JS errors and correct cleanup. Existing 15 backend integration and eight real API/browser tests passed; TypeScript and production builds passed. New automated live-flow coverage remains deferred as requested.

- Backend PR #11 and corrected frontend PR #12 both passed CI/GitGuardian before merging into `dev`; frontend merge `3197b08`. Final integration uses the frozen pnpm lockfile. Human review is the next gate: no `main` merge or next feature without Nick's approval.


- Nick merged [PR #13](https://github.com/Nick-Lemy/replens/pull/13); `main` and `dev` synchronized at `e5d5a22` before the next feature.

## Feature 5 — Saved session history

- Scope: explicit saving of actual finished/interrupted curl-session summaries, private history/detail, confirmed deletion and real recent sessions on Home. No video, pose data, RIR, research records or fabricated activity.
- Backend Engineer (`/root/email_backend`, reused Luna Medium): owner-scoped `/api/workout-sessions`, validated immutable drafts, idempotent retries, bounded pagination, Prisma migration and account-deletion cascade. Authentication, trusted mutation origins, JSON/body bounds and no-store apply to all private responses.
- Frontend Engineer (`/root/email_frontend`, reused Luna Medium): read-only preparation until backend review/merge; then API integration, in-memory live drafts, explicit save/retry, history/detail/delete and recent sessions. Clear private state on account changes, protect against stale responses, preserve guest live counting and mobile styling.
- Acceptance: real persistence across reloads, no duplicate saves after retry, no access to another account's records, invalid requests rejected, account deletion removes summaries, and no fake success on API failures. Only a set that actually started can create a summary. RIR remains unavailable; rep counts are client-reported estimates, not validated study labels.
- Verification: preserve existing hooks/CI; new automated coverage remains deferred at Nick's request. Use isolated PostgreSQL/API/browser smoke and independent review, then stop at the final PR to `main` for Nick's approval. Apply migrations only to disposable test storage during development; production migration/deployment is a separate owner action.

- Backend [PR #14](https://github.com/Nick-Lemy/replens/pull/14) reviewed and merged into `dev` at `b122d9a` after CI passed. Lead independently checked the modular implementation/migration and ran backend check/build plus real PostgreSQL/API smoke: concurrent identical saves create one row, conflicting retries and unknown fields fail, foreign origins are rejected, owner isolation/pagination work, and deletion/account cascade revoke access. Frontend implementation is now active on `ft/session-history-frontend`.

- Frontend [PR #15](https://github.com/Nick-Lemy/replens/pull/15) reviewed, corrected and merged at `77e278f` after CI passed. Lead independently verified a real two-curl camera run, lost-response retry with exactly one database row, persisted history after reload, detail and confirmed deletion. Separate browser smoke verified cancelled countdown creates no draft, camera loss creates an interrupted draft, guest signin preserves it, another account cannot save it, the original account can retry, Home shows the real recent record, and signout clears private history. Inspected the mobile detail screenshot; no horizontal overflow or JavaScript errors in the main flow.
- Existing 15 backend integration and eight browser regression tests passed. No new automated coverage was added. Production migration, deployment/domain checks and physical phones remain pending; RIR is still unavailable. Final gate: scoped `dev` → `main` PR for Nick; do not merge `main` or start another feature without approval.

- Nick approved and merged [PR #16](https://github.com/Nick-Lemy/replens/pull/16); `main` and `dev` synchronized at `36e6cda` before Feature 6.

## Feature 6 — Exercise-guide API

- Scope: serve the existing 14 authored exercise guides, photos and attribution through a public NestJS API and integrate Home/Guide with actual API responses. Preserve search/filtering, deep links, photo variations/credits and curl camera setup. Educational guide availability does not imply tracking/model support.
- Backend Engineer (`/root/email_backend`, reused Luna Medium): modular read-only curated catalog and list/detail endpoints; preserve existing editorial content exactly. No database/admin feature is needed for the current fixed catalog.
- Frontend Engineer (`/root/email_frontend`, reused Luna Medium): read-only preparation until backend review/merge, then typed API integration, shared catalog state, honest loading/error/retry/not-found states and removal of duplicate bundled catalog data. API failures must not masquerade as an empty catalog. The public shell remains installable; guide content requires a successful API read rather than a fabricated offline response.
- Acceptance: all 14 guides and photo credits survive the move; guests can browse; only two-arm curls link to live tracking; Home uses the real curl guide; unknown IDs return 404; malformed responses are rejected; API requests remain outside the service-worker cache. Auth, live counting and saved history remain intact. RIR stays unavailable.
- Verification: independent source/API/browser smoke, existing checks and regression tests. Maintain existing photo coverage against the canonical catalog; no new automated tests per Nick. Backend PR → review/merge into `dev` → frontend PR → review/merge → final `dev`/`main` PR and stop for approval.

- Backend [PR #17](https://github.com/Nick-Lemy/replens/pull/17) independently reviewed and merged at `7006290` after CI passed. Lead check/build and real HTTP smoke confirmed exact parity of all 14 guides/photo credits, guest list/detail access, successful cache headers, curl-only capability, query rejection, safe unknown/prototype IDs, and preserved private-history boundaries. Frontend now active on `ft/exercise-guides-frontend`.

- Frontend [PR #18](https://github.com/Nick-Lemy/replens/pull/18) independently reviewed; requested response-ID and StrictMode cleanup corrections are verified. Lead production browser smoke passed all 14 guides/credits, search/group/reset/back behavior, curl-only setup/gallery, 404 versus list/detail outage/retry, Home live access during an outage, mobile fit and no JavaScript errors. Separate dev StrictMode smoke passed; actual photo/credit screenshot inspected.
- Existing 15 backend integration and eight browser regressions passed. The initial browser regression launch lacked compiled backend files in the isolated worktree; building them resolved the harness setup and all eight checks passed. No new automated tests were added; the existing photo check now reads the canonical backend catalog. Production and physical-phone checks remain pending. Frontend CI passed and PR #18 merged into `dev` at `3a39310`. Final gate: PR to `main` for Nick's approval; no automatic main merge or next feature.

- Nick approved and merged [PR #19](https://github.com/Nick-Lemy/replens/pull/19); `main` and `dev` synchronized at `12d2b41` before Feature 7.

## Feature 7 — Deployment configuration

- Nick selected configuration only; frontend URL and VPS hostname will be supplied later. This is the final planned web infrastructure stage, not completion of the research or production launch.
- Backend Engineer (`/root/email_backend`, reused Luna Medium): Node 24/pnpm image, Caddy + API + PostgreSQL Compose, explicit migrations, persistent volumes, scoped proxy trust, ignored environment configuration, read-only pose assets and concise backup/restore/start instructions. Only isolated disposable container verification; do not touch production databases or existing services.
- Frontend Engineer (`/root/email_frontend`, reused Luna Medium): read-only preparation until backend review/merge, then Netlify build-time proxy generation from a validated HTTPS upstream. Keep browser requests same-origin, private no-store responses, worker CSP and public-shell cache boundaries. Fail Netlify builds with missing/invalid upstream rather than publish a placeholder.
- Acceptance: reproducible image/config validation where tooling/network permits; no secrets in build context or tracked files; database/API ports internal to Compose; deliberate migrations; Secure host-only authentication configured for the public frontend origin; missing deployment values fail clearly; local builds remain usable. No actual publishing or DNS changes.
- Verification: source/config review, isolated image/Compose smoke if available, build-artifact checks and existing engineering checks. New automated test implementation remains deferred. Backend PR → review/merge into `dev` → frontend PR → review/merge → final PR to `main`, then stop for Nick.
- Remaining after configuration: actual domains/VPS/Netlify rollout, real Resend delivery, backup/restore and production cookie/proxy checks, physical phones, consented data collection, matched RIR training/evaluation/export and model integration. Do not label these as completed by deployment templates.

- Backend [PR #20](https://github.com/Nick-Lemy/replens/pull/20) independently reviewed and merged at `f22a595` after CI passed. Both image targets built; blank required config values fail. Lead inspected the non-root/read-only API, private ports and read-only assets, then verified Caddy TLS, production cookie headers, private no-store responses, auth/summary persistence/origin checks, guides and exact pose bytes. Backend Engineer validated backup/restore of a synthetic record into a fresh database; the unique smoke project was cleaned up. Real public DNS/ACME/Netlify behavior remains unverified. Frontend configuration active on `ft/deployment-frontend`.

- Frontend [PR #21](https://github.com/Nick-Lemy/replens/pull/21) independently reviewed. Lead checked missing/HTTP/path/credentials/query/fragment failures before compilation, valid reserved HTTPS proxy output, unchanged headers/cache exclusions and cleanup during a normal build. No real deployment origin was supplied; Netlify publishing intentionally fails until it is configured. The agent resumed its existing uncommitted work after a usage-limit interruption. Application CI and GitGuardian passed; merged into `dev` at `cc05545`. Final human-review PR is the remaining gate; Swagger is not currently implemented.

- Final [PR #22](https://github.com/Nick-Lemy/replens/pull/22) is open; no main merge. GitGuardian flagged a Generic Password in the original Compose required-variable diagnostic at `f22a595`. Backend follow-up [PR #23](https://github.com/Nick-Lemy/replens/pull/23) simplified `${VAR:?}` guards without changing required/non-empty behavior; Lead independently validated blank/synthetic config and reviewed the diff. Both CI and GitGuardian passed before merge at `6087bcb`.
- Remaining review blocker: final PR still reports historical GitGuardian incident `38406391` in the old commit, despite clean current-code scanning. No scanner suppression or history rewrite was used; Nick was asked to review the false positive in his dashboard. Netlify deployment checks also intentionally fail until the deferred API URL is set. Actual deployment and Swagger remain unimplemented.

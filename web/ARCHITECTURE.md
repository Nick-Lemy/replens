# RepLens proposed architecture

The planned stack is React + TypeScript for the phone interface, NestJS + TypeScript for one modular backend, and PostgreSQL accessed through Prisma. Everything stays in one repository. Accounts, guides, live browser-local curl counts and personal summaries are implemented. Production hosting is not yet verified, and no RIR predictor has been trained.

## Compact diagram

Paste `ARCHITECTURE.eraser` into an Eraser Architecture diagram. It separates phone processing, Netlify hosting, the VPS backend/database and offline model training. A VPS boundary surrounds the server components. Short labels keep it readable on a presentation slide.

## How it works

1. The user opens the React app on their phone. Netlify serves the built React app over HTTPS. Browser requests use the frontend’s same-origin `/api` proxy, which forwards them to Caddy on the VPS and then NestJS. Versioned pose/runtime files come from the VPS through that API path.
2. The live path processes temporary camera frames on the phone. MediaPipe finds arm landmarks and a rule-based counter detects completed two-arm curls. A Web Worker keeps processing away from the interface. Tracking status reports when landmarks are insufficient. Speed/movement features and evaluated ONNX RIR inference remain future integration work; the app currently shows no RIR value.
3. NestJS handles signup, login, exercise guides, profile/privacy and saved summaries/history. Authentication, input validation and ownership checks protect private operations. Better Auth handles authentication inside NestJS. Resend is selected for verification and password reset; real delivery requires configured credentials and a verified sender.
4. Prisma connects NestJS to PostgreSQL. The database stores accounts, authentication records and summaries the user chooses to save, including the counter version.
5. Offline Python training uses separately consented study data and valid RIR labels. Speed-only and speed-plus-instability models use the same participant splits. Only a model evaluated on unseen people and tested for export parity and phone performance is deployed.

## Deployment and open checks

Docker Compose runs Caddy, NestJS and PostgreSQL on one VPS. A Caddyfile configures HTTPS and API routing. Netlify hosts the frontend; the VPS serves versioned pose/runtime assets, and future evaluated RIR files will also be hosted there. Docker Compose covers only the VPS services. The compiled React app runs in the phone browser. The browser uses relative `/api` URLs with [Netlify proxy rules](https://docs.netlify.com/manage/routing/redirects/rewrites-proxies/) and [Caddy reverse proxy routing](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy). Netlify’s proxy target must be the exact HTTPS API origin, while Better Auth’s public base URL and trusted frontend origin must be the public frontend origin. This arrangement is intended to keep host-only Secure cookies on the frontend domain. Real Netlify forwarding, cookie handling and browser behavior still require deployed verification. Database access stays internal to the VPS; backend code checks which user's records each request may access. Deployment must include HTTPS, persistent database storage and recoverable backups.

This retains one modular backend rather than introducing independent backend services. Redis and BullMQ are unnecessary for the proposed initial request and local-inference paths. A browser Web Worker runs code on the phone; it is different from a server job queue.

The proposed live path neither uploads nor saves camera frames. This requirement must be implemented and verified; the existing upload-based pilot has different behavior. Research recordings remain a separate consented workflow in approved storage.

Training and live code must match in landmark conventions, rep boundaries, timestamps, feature calculations and preprocessing. Live features may only use information available through the current rep. Browser model compatibility, phone processing rate and movement-instability signal quality remain validation gates. A VPS alone does not resolve those checks.

Solid arrows show runtime traffic. The dotted arrow shows deployment of the tested model bundle. Email delivery and deployment operations are documented in `backend/README.md` rather than expanded into extra diagram nodes.

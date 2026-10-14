# RepLens proposed architecture

The planned stack is React + TypeScript for the phone interface, NestJS + TypeScript for one modular backend, and PostgreSQL accessed through Prisma. Everything stays in one repository. This is a design proposal; the working system is still the Python video pilot and no RIR predictor has been trained.

## Compact diagram

Paste `ARCHITECTURE.eraser` into an Eraser Architecture diagram. It separates phone processing, Netlify hosting, the VPS backend/database and offline model training. A VPS boundary surrounds the server components. Short labels keep it readable on a presentation slide.

## How it works

1. The user opens the React app on their phone. Netlify serves the built React app and versioned model files over HTTPS. The browser sends API requests to Caddy on the VPS, which forwards them to NestJS.
2. The proposed live path processes temporary camera frames on the phone. MediaPipe finds arm landmarks; shared feature code detects reps and measures speed and movement instability. ONNX Runtime Web produces an RIR estimate after each completed rep. A browser Web Worker keeps this processing away from the interface. Poor tracking must produce an unavailable message.
3. NestJS handles signup, login, exercise guides, profile/privacy and saved summaries/history. Authentication, input validation and ownership checks protect private operations. Better Auth handles authentication inside NestJS. The email provider remains an implementation decision; verification and password reset require email delivery.
4. Prisma connects NestJS to PostgreSQL. The database stores accounts, authentication records and summaries the user chooses to save, including the model version.
5. Offline Python training uses separately consented study data and valid RIR labels. Speed-only and speed-plus-instability models use the same participant splits. Only a model evaluated on unseen people and tested for export parity and phone performance is deployed.

## Deployment and open checks

Docker Compose runs Caddy, NestJS and PostgreSQL on one VPS. A Caddyfile configures HTTPS and API routing. Netlify hosts the frontend and deployed model assets; Docker Compose covers only the VPS services. The compiled React app runs in the phone browser. Use frontend and API subdomains under the same owned domain when available (for example, app.example.com and api.example.com). Configure the Better Auth base URL and trusted frontend origin, credentialed browser requests and NestJS CORS for the exact frontend origin. Cookie and authentication behavior must be tested in the deployed browsers; default Netlify and VPS domains can complicate cross-site cookies. Database access stays internal to the VPS; backend code checks which user's records each request may access. Deployment must include HTTPS, persistent database storage and recoverable backups.

This retains one modular backend rather than introducing independent backend services. Redis and BullMQ are unnecessary for the proposed initial request and local-inference paths. A browser Web Worker runs code on the phone; it is different from a server job queue.

The proposed live path neither uploads nor saves camera frames. This requirement must be implemented and verified; the existing upload-based pilot has different behavior. Research recordings remain a separate consented workflow in approved storage.

Training and live code must match in landmark conventions, rep boundaries, timestamps, feature calculations and preprocessing. Live features may only use information available through the current rep. Browser model compatibility, phone processing rate and movement-instability signal quality remain validation gates. A VPS alone does not resolve those checks.

Solid arrows show runtime traffic. The dotted arrow shows deployment of the tested model bundle. Email delivery, backups and detailed internal modules are explained here rather than expanded into extra diagram nodes.

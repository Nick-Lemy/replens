FROM node:24-bookworm-slim AS base

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

FROM base AS backend-dependencies

WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY .husky/install.mjs .husky/install.mjs
COPY web/backend/package.json web/backend/package.json
COPY web/frontend/package.json web/frontend/package.json
RUN CI=true pnpm install --frozen-lockfile --filter @replens/backend...

FROM backend-dependencies AS workspace
COPY web/backend web/backend
RUN CI=true pnpm --filter @replens/backend build

FROM base AS tracking-assets
WORKDIR /workspace
COPY web/backend/scripts/prepare-tracking-assets.mjs web/backend/scripts/prepare-tracking-assets.mjs
RUN node web/backend/scripts/prepare-tracking-assets.mjs

# This image is run explicitly by the operator to apply migrations.
FROM backend-dependencies AS migration
WORKDIR /workspace/web/backend
COPY web/backend/prisma.config.ts ./prisma.config.ts
COPY web/backend/prisma ./prisma
ENV NODE_ENV=production
CMD ["./node_modules/.bin/prisma", "migrate", "deploy"]

# Keep the API image to production dependencies plus the compiled server.
FROM base AS production-dependencies
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY .husky/install.mjs .husky/install.mjs
COPY web/backend/package.json web/backend/package.json
COPY web/frontend/package.json web/frontend/package.json
RUN CI=true pnpm install --prod --frozen-lockfile --filter @replens/backend

FROM base AS api
ENV NODE_ENV=production
WORKDIR /workspace
COPY --from=production-dependencies --chown=node:node /workspace/node_modules ./node_modules
COPY --from=production-dependencies --chown=node:node /workspace/web/backend/node_modules ./web/backend/node_modules
COPY --from=production-dependencies --chown=node:node /workspace/package.json ./package.json
COPY --from=production-dependencies --chown=node:node /workspace/web/backend/package.json ./web/backend/package.json
COPY --from=workspace --chown=node:node /workspace/web/backend/dist ./web/backend/dist
COPY --chown=node:node web/backend/assets/experimental-rir ./web/backend/assets/experimental-rir
COPY --from=tracking-assets --chown=node:node /workspace/models/mediapipe/1.1.1 ./models/mediapipe/1.1.1
USER node
EXPOSE 3000
CMD ["node", "web/backend/dist/main.js"]

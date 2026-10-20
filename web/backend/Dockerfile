FROM node:24-bookworm-slim AS base

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

FROM base AS workspace

WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY .husky/install.mjs .husky/install.mjs
COPY web/backend/package.json web/backend/package.json
COPY web/frontend/package.json web/frontend/package.json
RUN CI=true pnpm install --frozen-lockfile

COPY web/backend web/backend
RUN CI=true pnpm --filter @replens/backend build

# This image is run explicitly by the operator to apply migrations.
FROM workspace AS migration
ENV NODE_ENV=production
CMD ["pnpm", "--filter", "@replens/backend", "db:migrate"]

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
USER node
EXPOSE 3000
CMD ["node", "web/backend/dist/main.js"]

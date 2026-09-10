# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=24.19.0

FROM node:${NODE_VERSION}-bookworm-slim AS tooling

ENV PNPM_HOME=/pnpm
ENV PATH=${PNPM_HOME}:${PATH}
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /workspace

RUN apt-get update \
    && apt-get install --yes --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable \
    && corepack prepare pnpm@11.19.0 --activate

FROM tooling AS dependencies

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/admin/package.json ./apps/admin/package.json
COPY apps/api/package.json ./apps/api/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
COPY packages/database/package.json ./packages/database/package.json
COPY packages/ui/package.json ./packages/ui/package.json

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile \
      --fetch-retries=5 \
      --fetch-timeout=120000 \
      --network-concurrency=8

FROM dependencies AS build

ARG NEXT_PUBLIC_API_URL=http://127.0.0.1:4000/api/v1
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

COPY . .

RUN DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build \
    pnpm db:generate
RUN pnpm --filter @ami/contracts build \
    && pnpm --filter @ami/database build \
    && pnpm --filter @ami/api build \
    && pnpm --filter @ami/admin build

FROM build AS api-package

RUN pnpm --filter @ami/api deploy --prod --legacy /output/api \
    && pnpm --filter @ami/database deploy --prod --no-optional --legacy /output/database \
    && rm -f /output/api/node_modules/@ami/database \
    && cp -R /output/database /output/api/node_modules/@ami/database

FROM node:${NODE_VERSION}-bookworm-slim AS api-runner

ENV NODE_ENV=production
ENV API_PORT=4000
WORKDIR /app

RUN apt-get update \
    && apt-get install --yes --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=api-package --chown=node:node /output/api ./

RUN mkdir -p /app/storage/private \
    && chown -R node:node /app/storage

USER node
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:4000/api/v1/health').then((response)=>{if(!response.ok)process.exit(1)}).catch(()=>process.exit(1))"]

CMD ["node", "dist/main.js"]

FROM node:${NODE_VERSION}-bookworm-slim AS admin-runner

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
WORKDIR /app

COPY --from=build --chown=node:node /workspace/apps/admin/.next/standalone ./
COPY --from=build --chown=node:node /workspace/apps/admin/.next/static ./apps/admin/.next/static
COPY --from=build --chown=node:node /workspace/apps/admin/public ./apps/admin/public

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3000/login').then((response)=>{if(!response.ok)process.exit(1)}).catch(()=>process.exit(1))"]

CMD ["node", "apps/admin/server.js"]

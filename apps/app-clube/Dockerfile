# syntax=docker/dockerfile:1
# app-clube (Next.js) — local dev image
#
# Built from the repo root so the whole Bun workspace (packages/auth)
# installs exactly like it does on the host, against the committed
# bun.lock. Build context: repo root.
#
#   docker build -f apps/app-clube/Dockerfile -t mf-clube .

FROM oven/bun:1

WORKDIR /app

COPY . .
# Cache mount keeps bun's package cache across builds — without it, every
# source edit invalidates the COPY layer above and forces a full re-fetch
# of the whole workspace's dependencies (Expo/RN included).
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

WORKDIR /app/apps/app-clube

EXPOSE 3000

CMD ["bun", "run", "dev"]

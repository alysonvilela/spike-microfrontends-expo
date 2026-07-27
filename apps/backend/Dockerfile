# syntax=docker/dockerfile:1
# Backend (Bun + Elysia + Better Auth) — local dev image
#
# Built from the repo root so the whole Bun workspace (packages/auth,
# packages/manifest) installs exactly like it does on the host, against
# the committed bun.lock. Build context: repo root.
#
#   docker build -f apps/backend/Dockerfile -t mf-backend .

FROM oven/bun:1

WORKDIR /app

COPY . .
# Cache mount keeps bun's package cache across builds — without it, every
# source edit invalidates the COPY layer above and forces a full re-fetch
# of the whole workspace's dependencies (Expo/RN included).
RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

WORKDIR /app/apps/backend

EXPOSE 3001

# Push the Better Auth schema to the sqlite db before starting — safe to
# run on every boot, it's a no-op once the schema already matches.
CMD ["sh", "-c", "cd /app/packages/auth && mkdir -p data && bunx drizzle-kit push && cd /app/apps/backend && bun run start"]

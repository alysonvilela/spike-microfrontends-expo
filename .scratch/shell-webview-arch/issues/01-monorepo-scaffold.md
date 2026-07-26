# 01 — Monorepo scaffold

**What to build:** A booting Turborepo + Bun workspace monorepo — the empty foundation every later ticket builds inside. No functional behavior yet.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] `bun install` succeeds at the repo root
- [ ] `turbo run` (no-op/empty pipeline) succeeds across all workspaces
- [ ] `apps/`, `packages/` directories exist per `main.plan.md` section 1, empty except placeholder `package.json`s
- [ ] Shared `tsconfig.json` and Biome config exist at the root and are referenced by workspace packages

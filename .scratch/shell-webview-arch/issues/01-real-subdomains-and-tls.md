Status: ready-for-review

# Real subdomains + TLS for local and production

## Deliverables

### A. `packages/manifest` — HOSTS structure + resolveManifest

- **`HOSTS`**: `Record<Env, string>` mapping `local` → `alysonvilela.local` and `production` → `alysonvilela.com`.
- **`resolveManifest`**: Takes `{ env, appVersion, flags }`, returns `{ version, ttl, env, apps }` with version-gating and feature-flag filtering entirely server-side.
- **Types**: `Env`, `AppEntry`, `Manifest`, `ResolveManifestOptions`, `Presentation`.
- **App registry**: Single source of truth for all known apps (clube seeded).
- **Entry URLs**: `https://{subdomain}.{domain}` — Caddy provides TLS for both local and prod.

### B. `Caddyfile` — Local reverse proxy with auto-TLS

- Wildcard handler for `*.alysonvilela.local` with `tls internal` (Caddy's locally-trusted CA).
- Routes: `auth.alysonvilela.local` → `localhost:3001`, `clube.alysonvilela.local` → `localhost:3000`.
- Configurable HTTP/HTTPS ports via `CADDY_HTTP_PORT` / `CADDY_HTTPS_PORT` env vars.
- Catch-all returns 404 for unknown subdomains.

### C. `scripts/setup-local-tls.sh` — Local CA trust helper

- Auto-detects Caddy (uses `caddy trust`) or mkcert (uses `mkcert -install` + wildcard cert).
- `--caddy` / `--mkcert` flags to force a method.
- Prints clear install instructions if neither tool is found.

### D. `docker-compose.local.yml` — Full local stack

- Caddy service (port 80/443 + admin at 2019).
- Backend service (port 3001) with dev volumes.
- App-clube service (port 3000) with dev volumes.

### E. `.env.example` — Environment variable reference

- `HOST`, `BACKEND_PORT`, `APP_CLUBE_PORT`, `PRODUCTION_HOST`, `CADDY_*_PORT`.

## Usage

```bash
# 1. Install Caddy or mkcert, then trust the local CA
./scripts/setup-local-tls.sh

# 2. Start Caddy as local reverse proxy
caddy run

# 3. In another terminal, start the dev servers
cd apps/backend && bun run dev    # → auth.alysonvilela.local
cd apps/app-clube && bun run dev  # → clube.alysonvilela.local
```

Or with Docker Compose:

```bash
docker compose -f docker-compose.local.yml up
```

## Comments

- Android emulator CA trust is a known gotcha (`caddy trust` + push root cert to emulator) — budget ~20min.
- The `HOSTS` structure resolves the domain suffix; per-app subdomains are defined in the internal `APP_DEFINITIONS` registry.

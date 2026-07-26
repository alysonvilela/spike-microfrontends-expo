# 06 — Manifest: server-resolved app routing

**What to build:** `packages/manifest` + `GET /manifest` on the backend — per-user, server-resolved app routing data, filtered by app version and flags.

**Blocked by:** 03 — Backend: bearer auth + OTT webview handshake + debug page

**Status:** ready-for-agent

- [ ] `resolveManifest({ env, appVersion, flags })` returns `{ version, ttl, env, apps }`; each app entry has `entry`, `min_app_version`, `presentation`, `bridge`, `fallback`
- [ ] `HOSTS: Record<Env, string>` map: `local` entries include an explicit port per app; `production` entries (`{app}.alysonvilela.com`) carry no port
- [ ] An app entry below the caller's `X-App-Version` never appears in the response
- [ ] Flag/version filtering happens entirely inside `resolveManifest` — nothing left for a client to evaluate
- [ ] `GET /manifest` (authenticated via bearer or cookie) is curl-testable and returns different hosts for `local` vs. a simulated `production` env from the same code path

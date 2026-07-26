Status: ready-for-agent

# Shell + WebView architecture spike

## Problem Statement

The shell (Expo) + WebView (Next.js) architecture in `main.plan.md` rests on an auth split ([ADR 0001](../../docs/adr/0001-hybrid-bearer-cookie-auth.md)) that hasn't been proven to work: a native session handed off through a one-time token (OTT) into an httpOnly cookie a Next.js server can read at render time, across subdomains. Nothing has been built yet, and the risk is architectural, not incremental — if the OTT→cookie handshake doesn't work, or the cookie doesn't survive a WebView reload, the whole "cookie + SSR" bet collapses and the honest fallback is a different frontend stack entirely (per the plan's Option A/B fork). Before investing in the full product build (three more frontends, CI/CD, a mobile release pipeline), that bet needs to be tested end-to-end with the smallest possible build.

## Solution

Build the architecture in six small, independently testable phases, each ending in a concrete pass/fail check pulled from `main.plan.md`'s acceptance checklist. Validate the riskiest unknown (OTT → `Set-Cookie`) first, in isolation, before any servers exist. Then stand up just enough of the real system — one backend, one frontend (`app-clube`), the manifest endpoint — to prove the hybrid auth model over real HTTP, using `*.localhost` subdomains to exercise real cross-subdomain cookie behavior without needing TLS infrastructure yet ([ADR 0002](../../docs/adr/0002-local-dev-localhost-subdomains.md)). Mobile/WebView verification is manual, on a physical device, deferred to its own phase.

## User Stories

1. As a developer validating the architecture, I want an isolated script that exchanges a one-time token for a valid `Set-Cookie` header, so that I know the core auth primitive works before building anything around it.
2. As a developer, I want a documented fallback (reissue a session for the returned `userId`) if `verifyOneTimeToken` doesn't expose a direct session-to-cookie helper, so that the spike isn't blocked by an API surface I don't control.
3. As a backend engineer, I want the monorepo scaffolded with Turborepo + Bun workspaces before any app code is written, so that every later phase has a consistent place to live.
4. As the Expo shell, I want to authenticate against the backend with a bearer token, so that I can call `/api/*` endpoints without managing a cookie jar.
5. As a backend engineer, I want `GET /api/health` to authenticate via bearer token alone with no cookie present, so that I can prove the native axis works independently, testable with `curl`.
6. As the shell, I want to generate a short-lived, single-use OTT and open `/webview/enter?token=…&to=…`, so that I can hand off my authenticated session into a WebView.
7. As a backend engineer, I want `/webview/enter` to reject any `to` value not on an explicit allowlist, so that the handshake can't become an open redirect with a live session cookie attached.
8. As a backend engineer, I want a validated OTT marked used immediately, so that replaying the handshake URL never re-authenticates.
9. As an end-user of `app-clube`, I want the page to render fully logged-in on first load, so that I never see a flash of logged-out content or a client-side auth spinner.
10. As a developer verifying SSR, I want to confirm the authenticated render with JavaScript disabled, so that I know the server — not client-side hydration — is what's authenticated.
11. As a backend engineer, I want `packages/auth/src/ssr.ts` to forward the incoming cookie to the backend's `get-session` endpoint, so that `app-clube` never duplicates auth logic.
12. As a developer, I want the session cookie shared across `auth.localhost` and `clube.localhost` via `crossSubDomainCookies`, so that I prove the same cross-subdomain mechanism planned for `alysonvilela.com` in production.
13. As a developer, I want `secure: true` cookies to work over plain HTTP on `*.localhost` in Chrome/Firefox, so that I don't have to stand up TLS before testing the real cookie configuration.
14. As a client consuming the manifest, I want `GET /manifest` to resolve app entries by my app version and flags, so that a route below `min_app_version` never appears to me.
15. As a backend engineer, I want manifest resolution to happen entirely server-side, so that no flag evaluation ever requires a native deploy to change segmentation.
16. As a developer, I want the same manifest-resolution code path to emit different hostnames for local (`*.localhost`) vs. a simulated production env, so that I know the `HOSTS: Record<Env, string>` abstraction works before wiring in the real `{app}.alysonvilela.com` domain.
17. As an end-user, I want signing out on the native shell to end my session everywhere, so that the next WebView navigation shows me logged out, not a stale authenticated page.
18. As a developer, I want `docker compose -f docker-compose.local.yml up` to bring up the whole system in one command, so that the integration check doesn't depend on manually running several dev servers.
19. As a developer, I want to change the `clube` entry URL in the manifest and see the new route appear on app reopen without a rebuild, so that I have direct proof the manifest — not a hardcoded URL — drives routing.
20. As a developer testing the mobile leg later, I want the Expo shell verified over Expo Go on a physical device, so that WebView behavior (cookie persistence across reload, `sharedCookiesEnabled`/`thirdPartyCookiesEnabled`) gets checked on real iOS/Android, not an environment this Linux dev box can't simulate.

## Implementation Decisions

- **Monorepo:** Turborepo + Bun workspaces. `apps/backend`, `apps/app-clube`, `apps/mobile` (phase 5+), `packages/auth`, `packages/manifest`, `packages/bridge` scaffolded empty first, filled in as each phase needs them. Shared `tsconfig.json` + Biome config at the root. `packages/ui` / `packages/design-tokens` are not needed for this spec (see Out of Scope).
- **Database:** SQLite via the Drizzle adapter for the MVP — Postgres is explicitly deferred as unnecessary overhead for a spike.
- **Backend** (`apps/backend`, built on `packages/auth`): Elysia mounting Better Auth's handler. Plugins: `expo()` (mobile origin/deep-link handling), `bearer()` (native↔API axis), `oneTimeToken()` with `expiresIn: 1` (minute) and `storeToken: 'hashed'` (webview↔SSR axis). `advanced.crossSubDomainCookies` enabled with domain `.localhost` for local dev, `defaultCookieAttributes: { httpOnly: true, secure: true, sameSite: 'lax' }`, `useSecureCookies: true`. `trustedOrigins` includes each frontend's `*.localhost` origin plus the Expo scheme.
- **Auth resolution:** a single macro/`resolve` on protected Elysia routes calling `auth.api.getSession({ headers })`, accepting either a `Authorization: Bearer` header or a cookie — no per-axis branching in route handlers, per ADR 0001.
- **`GET /webview/enter`:** accepts `token` and `to` query params, verifies the OTT server-side, sets the session cookie on the `.localhost` domain, 302-redirects to `to`. `to` is checked against an explicit allowlist of known frontend origins before the redirect; anything else gets a 400.
- **`GET /api/health`:** minimal protected route whose sole purpose is proving bearer-only auth works with no cookie present — a `curl` check, not a browser one.
- **`packages/manifest`:** exports a `resolveManifest` function taking `{ env, appVersion, flags }`, returning `{ version, ttl, env, apps }`, where each app entry carries `entry` (host URL), `min_app_version`, `presentation`, a `bridge` capability list, and `fallback`. Hosts resolve from a `HOSTS: Record<Env, string>` map: `local` entries include an explicit port per app (fixed per-app, since there's no reverse proxy in front of `*.localhost` yet); `production` entries (`{app}.alysonvilela.com`) carry no port. Flags and `min_app_version` filtering happen entirely inside `resolveManifest`, never client-side.
- **`GET /manifest`:** authenticated endpoint (bearer or cookie) that calls `resolveManifest` with the caller's resolved env, the `X-App-Version` header, and the user's already-resolved flags.
- **`app-clube`** (`apps/app-clube`, Next.js): one authenticated page. `packages/auth/src/ssr.ts` exports `getSession(headers)`, forwarding the incoming request's cookie to the backend's `get-session` endpoint and returning the session or `null`. The page is a Server Component gated on that result directly — no client-side auth check, no `'use client'` for the auth gate itself.
- **Logout (phase 6):** `authClient.signOut()` on the shell invalidates the backend session; the next WebView navigation to any frontend must render logged-out, proving the cookie is genuinely tied to the backend session rather than cached independently per app.
- **`docker-compose.local.yml`:** brings up backend + `app-clube` together. Used only in **phase 6** (integration check) — phases 2–5 run each service directly with `bun dev`, no Dockerfile needed.
  - Phase 6 creates `apps/backend/Dockerfile` and `apps/app-clube/Dockerfile` alongside the compose file.
  - `docker compose -f docker-compose.local.yml up` boots the full stack and the end-to-end flow (bearer, handshake, SSR, manifest, logout) is verified against the composed services.

## Testing Decisions

- A good test here asserts on real HTTP behavior — status codes, headers (`Set-Cookie`, redirects), rendered HTML — against the actually running `apps/backend` and `apps/app-clube` processes. Nothing mocks Better Auth internals, and nothing reaches into Elysia handlers directly; tests act like a real client (`curl`, a plain `fetch`, or eventually a WebView) would.
- **Primary seam:** the HTTP boundary of `apps/backend` and `apps/app-clube`, run as real processes (or via `docker-compose.local.yml`). This one seam covers bearer auth, the OTT/cookie handshake, SSR-authenticated rendering, manifest resolution, and logout — phases 2, 3, 4, and 6.
- **Phase 1** (the OTT→`Set-Cookie` spike script) is explicitly outside the durable test suite — a one-off script run by hand to de-risk before phase 2 exists. Once proven, its logic becomes what phase 2's `/webview/enter` handler implements, and that handler *is* covered by the HTTP-boundary tests.
- **Phase 3** (SSR) needs a test that fetches the page with a valid session cookie set and does not execute JS — a raw HTTP fetch of the page, not a browser-automation tool — asserting the authenticated content is present in the server-rendered markup itself. This directly encodes the "test with JS disabled" acceptance criterion from `main.plan.md`.
- **Phase 5** (Expo shell/WebView) has no automated test coverage in this spec — verified manually on a physical device via Expo Go, per ADR 0002.
- No prior art exists in this repo (greenfield). The closest reference is `main.plan.md` section 7 ("Checklist de aceite"), which is effectively the acceptance-test list these tests should satisfy.

## Out of Scope

- `app-ajuda`, `app-pedidos` — copies of `app-clube`'s structure, validate nothing new.
- CI/CD pipeline.
- Module Federation — each frontend is standalone; the manifest handles routing.
- The `jwt()` Better Auth plugin — only relevant if a non-JS service needs to validate sessions independently.
- WebView warm-up/preloading — an optimization, only after the core flow works.
- Automated mobile E2E (Detox or similar) — manual testing only in this first cycle.
- Real subdomains + TLS (Caddy/mkcert), for both local and production `{app}.alysonvilela.com` — tracked separately in [`01-real-subdomains-and-tls.md`](./issues/01-real-subdomains-and-tls.md), `needs-triage`.
- `packages/design-tokens` and `packages/ui` component work — not needed to prove the architecture; `app-clube`'s test page can be unstyled.
- Any production deployment/hosting setup.

## Further Notes

- Exact local port numbers for `apps/backend` / `apps/app-clube` are left to the implementing ticket; the interface decision is fixed above (local `HOSTS` entries carry an explicit port, production entries don't).
- The OTT→`Set-Cookie` mechanism has an explicit documented fallback in `main.plan.md` (Bloco 0): if `verifyOneTimeToken` doesn't expose a direct session→cookie helper in the installed Better Auth version, reissue a fresh session for the returned `userId` instead. Whichever path gets taken should be noted back on the phase-1 ticket, since it determines how phase 2's `/webview/enter` is implemented.
- Phase sequencing for `/to-tickets`: phase 2 blocks on phase 1; phase 3 and phase 4 both block on phase 2 (and can run in parallel with each other); phase 6 blocks on phases 2–4; phase 5 only needs phase 2 to exist and can run in parallel with 3/4/6, but is lower priority since it's manual-only.
- Domain glossary terms (OTT, Manifest, Bridge, Shell, Registrable domain) are defined in `CONTEXT.md`; architectural rationale lives in `docs/adr/0001-hybrid-bearer-cookie-auth.md` and `docs/adr/0002-local-dev-localhost-subdomains.md`.

## Comments

# 03 — Backend: bearer auth + OTT webview handshake + debug page

**What to build:** The real `apps/backend` service — Elysia + Drizzle/SQLite + Better Auth, running on `auth.localhost`. Bearer auth works for native-style calls. The OTT handshake (`/webview/enter`) exchanges a token for a cookie and redirects to an allowlisted destination. A minimal authenticated debug page is served directly by the backend, as a WebView test target for ticket 04 — no Next.js needed yet.

**Blocked by:** 02 — OTT → Set-Cookie spike

**Status:** ready-for-agent

- [ ] Better Auth mounted on Elysia with `expo()`, `bearer()`, `oneTimeToken({ expiresIn: 1, storeToken: 'hashed' })` plugins; `crossSubDomainCookies` domain `.localhost`, `secure: true`, `sameSite: 'lax'`
- [ ] `GET /api/health` authenticates via `Authorization: Bearer` alone, no cookie present — verified with `curl`
- [ ] `GET /webview/enter?token=…&to=…` verifies the OTT, sets the session cookie, 302-redirects to `to`
- [ ] `to` is checked against an explicit allowlist; a non-allowlisted value returns 400
- [ ] A used OTT is rejected on replay
- [ ] A minimal authenticated HTML page is served by the backend (e.g. "you are logged in as {user}"), reachable only with a valid session — the debug target for ticket 04

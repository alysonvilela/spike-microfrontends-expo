# 05 — app-clube: SSR authenticated via shared cookie

**What to build:** `apps/app-clube`, a Next.js app on `clube.localhost` with one page that renders authenticated content server-side, using the cookie set by ticket 03's handshake.

**Blocked by:** 03 — Backend: bearer auth + OTT webview handshake + debug page

**Status:** ready-for-agent

- [ ] `packages/auth/src/ssr.ts` exports `getSession(headers)`, forwarding the request's cookie to the backend's `get-session` endpoint
- [ ] The page is a Server Component gated on that session directly — no client-side auth check, no `'use client'` for the auth gate
- [ ] Manually navigating from a valid `/webview/enter` redirect renders the page logged-in
- [ ] Authenticated render is provable with JavaScript disabled in the browser
- [ ] A test fetches the page with a valid session cookie (no JS execution) and asserts the authenticated content is present in the raw server-rendered HTML

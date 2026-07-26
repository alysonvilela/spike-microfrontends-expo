# 08 — Logout + docker-compose integration

**What to build:** The closing integration check — native logout tears down the session everywhere, and the full backend + app-clube stack boots in one command.

**Blocked by:** 05 — app-clube: SSR authenticated via shared cookie; 06 — Manifest: server-resolved app routing; 07 — Wire manifest + app-clube into the Expo shell

**Status:** ready-for-agent

- [ ] `authClient.signOut()` on the shell + `CookieManager.clearAll()` (Android) / `WKWebsiteDataStore` (iOS) clear the native session
- [ ] The next WebView navigation to `app-clube` after logout renders logged-out, not a stale authenticated page
- [ ] `docker compose -f docker-compose.local.yml up` brings up backend + `app-clube` together, and the full flow (bearer, handshake, SSR, manifest) works end-to-end against the composed stack
- [ ] Verified via the real native shell's `signOut()`, plus the docker-compose HTTP check

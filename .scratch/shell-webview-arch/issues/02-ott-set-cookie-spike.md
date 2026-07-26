# 02 — OTT → Set-Cookie spike

**What to build:** A standalone script (not wired into the app) proving the one-time-token primitive works: create a user, generate an OTT, verify it, and produce a valid `Set-Cookie` header — or, if `verifyOneTimeToken` doesn't expose that directly, the documented fallback of reissuing a session for the returned `userId`.

**Blocked by:** 01 — Monorepo scaffold

**Status:** ready-for-agent

- [ ] Script creates a user, generates an OTT (`authClient.oneTimeToken.generate()` or equivalent), and verifies it server-side
- [ ] Script produces a valid `Set-Cookie` header for that user's session, via the direct helper or the session-reissue fallback
- [ ] Which path was taken (direct helper vs. fallback) is recorded in this ticket's Comments — it determines how ticket 03's `/webview/enter` is implemented
- [ ] Script is explicitly throwaway — not wired into the app, no test coverage required

# 02 — OTT → Set-Cookie spike

**What to build:** A standalone script (not wired into the app) proving the one-time-token primitive works: create a user, generate an OTT, verify it, and produce a valid `Set-Cookie` header — or, if `verifyOneTimeToken` doesn't expose that directly, the documented fallback of reissuing a session for the returned `userId`.

**Blocked by:** 01 — Monorepo scaffold

**Status:** ready-for-human

- [x] Script creates a user, generates an OTT (`authClient.oneTimeToken.generate()` or equivalent), and verifies it server-side
- [x] Script produces a valid `Set-Cookie` header for that user's session, via the direct helper or the session-reissue fallback
- [x] Which path was taken (direct helper vs. fallback) is recorded in this ticket's Comments — it determines how ticket 03's `/webview/enter` is implemented
- [x] Script is explicitly throwaway — not wired into the app, no test coverage required

## Result: DIRECT HELPER PATH WORKS

`verifyOneTimeToken(token, asResponse: true)` produces a valid `Set-Cookie` header
without any extra work — no session-reissue fallback needed.

**Observed Set-Cookie header:**
```
better-auth.session_token=<token>; Max-Age=604800; Path=/; HttpOnly; SameSite=Lax
```

**For ticket 03 (`/webview/enter`):**
The handler should call `auth.api.verifyOneTimeToken({ body: { token }, asResponse: true })`
and forward the `set-cookie` header from the response to the redirect. No session reissue needed.

**Single-use confirmed:** A second `verifyOneTimeToken` call with the same token
correctly returns an error.

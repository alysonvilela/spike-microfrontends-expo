---
status: accepted
---

# Hybrid bearer + cookie authentication

Two auth axes exist with opposing constraints: native Expo → API can carry a portable bearer token, but WebView → Next.js SSR needs a credential the *server* has at render time, and a top-level `WebView.load()` can't attach an `Authorization` header. We authenticate the native↔API axis with a bearer token, and the WebView↔SSR axis with an httpOnly `secure`/`sameSite=lax` cookie obtained through a one-time-token (OTT) handshake at `/webview/enter`. `auth.api.getSession({ headers })` accepts either, so route handlers don't fork per axis.

## Considered Options

- **Bearer everywhere.** Rejected: without a cookie, every Next.js page renders logged-out on the server, forcing `'use client'` everywhere and forfeiting SSR — the reason Next.js was chosen over a client-only SPA (Vite + React Router would be the honest choice in that world).
- **Cookie everywhere.** Rejected: native code isn't rendering pages that need a server-side credential, and there's no reason to burden native API calls with cookie-jar semantics.

## Consequences

- All frontends + backend must share one registrable domain (subdomains only) for `crossSubDomainCookies` to propagate the session cookie.
- The OTT must be single-use and short-lived (1 min) — a replay of the handshake URL must not re-authenticate.
- The WebView's post-handshake redirect target (`to`) must be allowlisted server-side, or the handshake becomes an open redirect with a live session cookie attached.

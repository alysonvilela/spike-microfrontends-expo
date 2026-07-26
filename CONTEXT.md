# Shell + WebView Architecture

Native Expo shell app that loads N Next.js web frontends inside WebViews, routed by a server-resolved manifest, authenticated via Better Auth as the shared session server.

## Language

### Auth

**OTT (one-time token)**:
A short-lived (1 minute), single-use token the shell exchanges for a session cookie when handing a logged-in user off to a WebView. Verified and consumed server-side exactly once; a second use is rejected.
_Avoid_: session token, handoff token, deep link token

### Routing

**Manifest**:
The server-resolved, per-user description of which web frontends exist, their entry URLs, minimum app version, presentation mode, and required bridge capabilities. Never evaluated client-side — flags and version gating are applied by the backend before the manifest is returned.
_Avoid_: config, remote config, feature list

### Integration

**Bridge**:
The webview↔native messaging protocol and its client library, kept framework-agnostic so the web side can be swapped (e.g. Next.js → Astro) later without rewriting the native side.
_Avoid_: postMessage layer, webview API

**Shell**:
The native Expo app that hosts WebViews, owns the bearer-authenticated session, and performs the OTT handoff into each WebView.
_Avoid_: native app, host app, container app

### Infra

**Registrable domain**:
The shared root domain (e.g. `alysonvilela.com` in production) that the backend and every frontend live under as subdomains, making them same-site — required for `crossSubDomainCookies` and `sameSite: 'lax'` cookies to work without weakening CSRF protection to `sameSite: 'none'`.
_Avoid_: root domain, apex domain

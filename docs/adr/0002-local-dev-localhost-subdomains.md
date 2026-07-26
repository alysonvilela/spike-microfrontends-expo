---
status: accepted
---

# Local dev over *.localhost, TLS deferred

Testing the auth split ([ADR 0001](./0001-hybrid-bearer-cookie-auth.md)) requires real subdomains — `crossSubDomainCookies` and `secure` cookies don't mean anything on a single bare `localhost`. Standing up Caddy plus a locally-trusted CA before the first test would mean solving a well-understood problem (TLS) before validating the actually risky one (does the cookie/SSR handshake work at all). Chrome and Firefox resolve any `*.localhost` subdomain to `127.0.0.1` with zero config, and both browsers honor the `Secure` cookie attribute over plain HTTP specifically for `localhost` and its subdomains — so `auth.localhost`, `clube.localhost`, etc. let us keep `secure: true`, `sameSite: 'lax'`, and `crossSubDomainCookies` configured exactly as production, without TLS.

## Consequences

- Safari does not grant this exception — real TLS (Caddy/mkcert) is required before any Safari or iOS testing.
- Real subdomains + TLS, for both local dev and production (`{app}.alysonvilela.com`, env-configurable), is parked as a backlog item rather than blocking the current phase plan.
- Mobile/WebView verification is deferred to its own phase, tested via Expo Go on a physical device — this dev machine is Linux, so an iOS simulator isn't possible here, and no Android emulator is currently configured either.

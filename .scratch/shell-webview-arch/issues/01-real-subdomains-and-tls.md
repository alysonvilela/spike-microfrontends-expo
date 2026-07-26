Status: needs-triage

# Real subdomains + TLS for local and production

Currently deferred — see [ADR 0002](../../../docs/adr/0002-local-dev-localhost-subdomains.md). Local dev runs on `*.localhost` subdomains over plain HTTP, relying on the Chrome/Firefox exception that allows `Secure` cookies over HTTP on `localhost`. This does not work in Safari, and there is no real domain wired up for production yet.

## Scope

- Local: real wildcard subdomains (not `*.localhost`) with a locally-trusted CA — Caddy's internal CA (`caddy trust`) or mkcert, matching `main.plan.md` section 2.
- Production: `{app}.alysonvilela.com`, env-configurable per the `HOSTS: Record<Env, string>` structure already in `packages/manifest`.
- Needed before any Safari or iOS testing (the localhost secure-cookie exception doesn't apply there).
- Android emulator CA trust is a known gotcha (`caddy trust` + push root cert to emulator) — budget ~20min per `main.plan.md` section 8.

## Comments

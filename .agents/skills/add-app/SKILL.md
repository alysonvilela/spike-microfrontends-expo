---
name: add-app
description: Add a new Next.js micro-frontend to the shell — scaffold it, register it in the manifest registry, allowlist its origins, and route it in Caddy. Use when the user wants to add an app or frontend to the shell, wire one into the manifest, or asks why a new app is not showing up in the shell.
---

An app's **entry URL is derived, never written**. `APP_DEFINITIONS` in `packages/manifest/src/index.ts` is the only place an app is described; `buildEntry` derives each caller's URL from the host their request arrived on, because a physical device, a browser behind Caddy, and production all need different URLs for the same app.

Every URL you write down by hand becomes a second source of truth. When the two disagree the remote manifest silently wins — it stamps `version: Date.now()`, so it outranks anything bundled or cached, on every launch.

## 1. Pick the id and the port

The id is the subdomain: lowercase, no dots (`clube` → `clube.alysonvilela.com`).

Read the `dev` script of every `apps/*/package.json` and pick a port none of them use. Uniqueness is load-bearing: in local-direct mode every app sits on the same LAN host and is told apart **only** by port.

**Done when:** the id and port are chosen and the port collides with no existing app.

## 2. Scaffold the app

Mirror `apps/app-clube` — it is the reference implementation, not a template to improve on.

- `package.json` — `"dev": "next dev -p <port>"`, `"start": "next start -p <port>"`, plus `typecheck` and `test`. Depend on `"auth": "workspace:*"`.
- `app/page.tsx` — authenticate server-side with `getSession(await headers())` from `auth/ssr`, and render an explicit unauthenticated branch. The shell hands the session over as a cookie; SSR is where it gets read.

Then `bun install` to link the workspace.

**Done when:** `bunx tsc --noEmit` passes in the new app.

## 3. Register it in the manifest registry

Add one `AppDefinition` to `APP_DEFINITIONS` in `packages/manifest/src/index.ts`. Set `localPort` to the port from step 1 — it is the dev server's port, used only when a client reaches that server directly. Behind Caddy the client connects on 443 and never names it.

Set `minAppVersion` to a version the installed shell already meets, or the app stays invisible. Give it a `flag` when it should ship dark.

`presentation`, `bridge`, and `fallback` travel to the client, but nothing consumes them yet — fill them in truthfully and expect no behaviour from them.

**Done when:** the app appears in `resolveManifest` output for both `local` and `production`.

## 4. Allowlist the origins the handshake may redirect to

`/webview/enter` refuses to redirect anywhere it does not recognise. Add both public origins to `ALLOWLIST` in `apps/backend/src/allowlist.ts`:

- `https://<id>.alysonvilela.com` — production
- `https://<id>.alysonvilela.local` — local behind Caddy

Local-direct origins are already covered: `isRedirectAllowed` accepts any port on the request's own hostname when that hostname is loopback or RFC 1918. Adding a LAN IP here hardcodes one machine's network and rots the moment it changes.

**Done when:** both origins are listed and no IP address was added.

## 5. Route it in Caddy

Add a matcher and handler to the `*.alysonvilela.local` block in `Caddyfile`, proxying `<id>.alysonvilela.local` to `localhost:<port>` — copy the `@clube` block. Without it the subdomain falls through to the catch-all 404.

**Done when:** the block exists and its port matches step 1.

## 6. Add the production entry to the bundled manifest

`apps/mobile/src/services/manifest.bundled.json` ships inside the app binary, so it carries **production** entries — that is what is true for a shipped build on its first offline launch. It is a cold-start placeholder that the host-derived remote replaces within milliseconds.

A dev URL here is the trap this whole architecture exists to avoid.

**Done when:** the entry is present and its URL is the production one.

## 7. Cover it with tests

- `packages/manifest/src/index.test.ts` — assert the new app's entry in both shapes: local-direct (`http://<host>:<port>`) and production.
- `apps/backend/src/allowlist.test.ts` — assert the new origins resolve.
- `apps/<app>/app/page.test.ts` — mirror `app-clube`'s SSR auth test.

Run `bun test` from the repo root, then `bunx tsc --noEmit` in each touched package.

`apps/backend/src/device-flow.test.ts` is the end-to-end guard: manifest fetched over the LAN, entry handed back, handshake accepting it. Extend it when the new app changes that path.

**Done when:** the full suite passes and every touched package typechecks.

## 8. Confirm it reaches the shell

The shell needs **no code change** — `HomeScreen` renders every entry the manifest returns. When a new app does not appear, the cause is one of:

- `minAppVersion` sits above the shell's `expoConfig.version`; the shell filters bundled and cached manifests client-side too.
- Its `flag` is absent or false for this caller.
- The backend is unreachable, so the shell is still showing bundled production entries.

**Done when:** the app is listed in the shell and opens authenticated through the OTT handshake.

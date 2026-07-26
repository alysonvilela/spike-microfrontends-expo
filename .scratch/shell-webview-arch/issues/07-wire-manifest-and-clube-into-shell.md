# 07 — Wire manifest + app-clube into the Expo shell

**What to build:** Replace the shell's hardcoded debug-page target (ticket 04) with real manifest-driven routing — the shell fetches `/manifest`, resolves `app-clube`'s entry, and performs the OTT handshake into the real Next.js app instead of the debug page. Adds the bundled/cached/remote manifest loading story.

**Blocked by:** 04 — Expo shell core: login + OTT handshake; 05 — app-clube: SSR authenticated via shared cookie; 06 — Manifest: server-resolved app routing

**Status:** ready-for-agent

- [ ] Shell loads a bundled `manifest.bundled.json` immediately on cold start, fetches the remote manifest in parallel, swaps if `remote.version > cache.version`
- [ ] Shell never blocks cold start waiting on the network
- [ ] Navigating to `clube` opens `app-clube` (not the debug page) via the OTT handshake, rendered authenticated
- [ ] An app entry with `min_app_version` above the installed version doesn't appear in the shell's UI
- [ ] Changing the `clube` entry URL in the manifest and reopening the app shows the new route — **without a rebuild**
- [ ] Verified manually on a physical device — no automated coverage required

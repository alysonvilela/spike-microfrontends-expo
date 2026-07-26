# 04 — Expo shell core: login + OTT handshake

**What to build:** The native shell app — login, bearer token storage, and a `WebViewScreen` that performs the OTT handshake against the backend's debug page from ticket 03. Proves the mobile-specific unknowns (cookie jar behavior, `sharedCookiesEnabled`/`thirdPartyCookiesEnabled`, cookie survival across reload) before any real frontend exists.

**Blocked by:** 03 — Backend: bearer auth + OTT webview handshake + debug page

**Status:** ready-for-agent

- [ ] `expoClient({ scheme, storagePrefix, storage: SecureStore })` configured; native login works, bearer token stored securely
- [ ] Shell generates an OTT and loads `/webview/enter?token=…&to=<debug page>` in a `WebViewScreen`
- [ ] Debug page renders authenticated inside the WebView
- [ ] Reloading the WebView keeps the session (cookie persists) — verified on both a physical iOS and Android device via Expo Go
- [ ] `onError`/`onHttpError` route to a fallback screen, never a blank/white error page
- [ ] Verified manually — no automated test coverage required for this ticket

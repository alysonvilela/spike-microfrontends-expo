/**
 * Allowlisted redirect destinations for the OTT webview handshake.
 *
 * URLs matching at least one entry here, or whose origin matches the
 * request's own origin (preventing open redirect), are permitted as the
 * `to` parameter in `/webview/enter`. The path portion is preserved.
 *
 * Adding a new frontend requires adding its origin here.
 */
export const ALLOWLIST: readonly string[] = [
  "http://localhost:3000", // app-clube (Next.js dev server, direct)
  "http://192.168.18.125:3000", // app-clube via LAN IP (physical device on same network)
  "http://clube.localhost:3000", // app-clube via local Caddy (no TLS)
  "https://clube.alysonvilela.local", // app-clube via Caddy + TLS (production)
  "https://clube.alysonvilela.local:3000", // app-clube via Caddy + TLS + port (local)
  "http://localhost:3001", // backend's own debug page (direct)
  "http://auth.localhost:3001", // backend via local Caddy (no TLS)
  "https://auth.alysonvilela.local", // backend via Caddy + TLS
] as const;

/**
 * Validates that the given URL's origin is allowed as a redirect target.
 *
 * A URL is allowed if:
 * 1. Its origin matches the static ALLOWLIST, OR
 * 2. Its origin matches the `requestOrigin` (same-server redirect, covers
 *    any LAN IP the backend is reachable at — no open redirect risk since
 *    the attacker can't control that origin).
 *
 * Returns true if allowed, false if the origin is not recognized.
 */
export function isRedirectAllowed(
  url: string,
  requestOrigin?: string,
): boolean {
  try {
    const parsed = new URL(url);
    const origin = parsed.origin;

    // Same-server redirect — always safe because the request origin is
    // controlled by the operator, not the attacker.
    if (requestOrigin && origin === requestOrigin) {
      return true;
    }

    return ALLOWLIST.some((allowed) => origin === allowed);
  } catch {
    return false;
  }
}

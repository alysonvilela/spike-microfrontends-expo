/**
 * Allowlisted redirect destinations for the OTT webview handshake.
 *
 * Only URLs matching at least one entry here are permitted as the `to`
 * parameter in `/webview/enter`. Each entry is the origin (protocol + host)
 * of a known frontend. The path portion of `to` is preserved during the
 * redirect, but the origin must be an exact prefix match.
 *
 * Adding a new frontend requires adding its origin here.
 */
export const ALLOWLIST: readonly string[] = [
  "http://localhost:3000", // app-clube (Next.js dev server, direct)
  "http://clube.localhost:3000", // app-clube via Caddy
  "https://clube.alysonvilela.local", // app-clube via Caddy + TLS
  "http://localhost:3001", // backend's own debug page (direct)
  "http://auth.localhost:3001", // backend via Caddy
  "https://auth.alysonvilela.local", // backend via Caddy + TLS
] as const;

/**
 * Validates that the given URL's origin is in the allowlist.
 * Returns true if allowed, false if the origin is not recognized.
 */
export function isRedirectAllowed(url: string): boolean {
  try {
    const parsed = new URL(url);
    const origin = parsed.origin;
    // Allow the origin to match exactly
    // Also allow matching just {origin}/*
    return ALLOWLIST.some((allowed) => origin === allowed);
  } catch {
    return false;
  }
}

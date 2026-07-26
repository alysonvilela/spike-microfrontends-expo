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
  "http://clube.localhost:3000", // app-clube via local Caddy (no TLS)
  "https://clube.alysonvilela.local", // app-clube via Caddy + TLS (local)
  "https://clube.alysonvilela.com", // app-clube (production)
  "http://localhost:3001", // backend's own debug page (direct)
  "http://auth.localhost:3001", // backend via local Caddy (no TLS)
  "https://auth.alysonvilela.local", // backend via Caddy + TLS
] as const;

/**
 * Validates that the given URL's origin is allowed as a redirect target.
 *
 * A URL is allowed if:
 * 1. Its origin matches the static ALLOWLIST, OR
 * 2. It shares a hostname with the request **and** that hostname is loopback
 *    or a private LAN address — the local-dev shape, where the shell reaches
 *    the backend on `192.168.x.y:3001` and app-clube on `192.168.x.y:3000`.
 *    Ports are not part of the check because cookies aren't scoped by port:
 *    a session set on one port is already readable on the other.
 *
 * The private-address condition is what makes rule 2 safe. `requestOrigin` is
 * derived from the Host header, which a caller controls, so an unrestricted
 * same-host rule would let `Host: evil.com` + `to=http://evil.com` through as
 * an open redirect. A spoofed public hostname fails the private-address test
 * and falls back to the static allowlist.
 *
 * Returns true if allowed, false if the origin is not recognized.
 */
export function isRedirectAllowed(
  url: string,
  requestOrigin?: string,
): boolean {
  try {
    const parsed = new URL(url);

    if (requestOrigin) {
      const { hostname } = new URL(requestOrigin);
      if (parsed.hostname === hostname && isPrivateHost(hostname)) {
        return true;
      }
    }

    return ALLOWLIST.some((allowed) => parsed.origin === allowed);
  } catch {
    return false;
  }
}

/**
 * True for hostnames that can only refer to the local machine or the local
 * network: loopback, `localhost` (and its subdomains), and the RFC 1918
 * private IPv4 ranges.
 */
function isPrivateHost(hostname: string): boolean {
  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    return true;
  }
  // WHATWG URL keeps the brackets on IPv6 hostnames.
  if (hostname === "[::1]") {
    return true;
  }

  const ipv4 = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4) return false;

  const octets = ipv4.slice(1).map(Number);
  if (octets.some((octet) => octet > 255)) return false;

  const [a, b] = octets as [number, number, number, number];
  return (
    a === 127 || // 127.0.0.0/8   loopback
    a === 10 || // 10.0.0.0/8    private
    (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12 private
    (a === 192 && b === 168) // 192.168.0.0/16 private
  );
}

export type Env = "local" | "production";

/**
 * Per-environment registrable domain.
 *
 * Every frontend and the backend live under subdomains of this domain,
 * making them same-site for `crossSubDomainCookies` and `sameSite: "lax"`.
 *
 * - **local**: `*.alysonvilela.local` — resolved via local DNS (Caddy handles
 *   wildcard resolution locally). A locally-trusted CA (Caddy `tls internal`
 *   or mkcert) provides TLS so Safari and iOS testing work.
 * - **production**: `*.alysonvilela.com` — the real public domain.
 */
export const HOSTS = {
  local: "alysonvilela.local",
  production: "alysonvilela.com",
} as const satisfies Record<Env, string>;

export type Presentation = "tab" | "modal" | "fullscreen";

export type AppEntry = {
  /** Unique app identifier matching the subdomain. */
  id: string;
  /** Human-readable display name. */
  name: string;
  /** Fully-qualified entry URL for the current env (e.g. `https://clube.alysonvilela.local`). */
  entry: string;
  /** Minimum native app version that can see this entry. Semver-comparable. */
  minAppVersion: string;
  /** How the WebView should present this app. */
  presentation: Presentation;
  /** Bridge capabilities this app requires. */
  bridge: string[];
  /** Fallback URL if the app is unreachable. */
  fallback: string;
};

export type Manifest = {
  /** Monotonic version number (timestamp-based). */
  version: number;
  /** How many seconds the client should cache this manifest. */
  ttl: number;
  /** Which environment resolved this manifest. */
  env: Env;
  /** Resolved app entries. */
  apps: AppEntry[];
};

export type ResolveManifestOptions = {
  env: Env;
  /** The caller's native-app version (e.g. `1.2.3`). */
  appVersion: string;
  /**
   * Feature flags active for this caller.
   * An app gated behind a flag that is absent or `false` is omitted.
   */
  flags?: Record<string, boolean>;
};

// ---------------------------------------------------------------------------
// Internal app registry — the single source of truth for every known app.
// ---------------------------------------------------------------------------

type AppDefinition = {
  id: string;
  name: string;
  /** Subdomain portion of the entry URL (e.g. `"clube"` → `clube.alysonvilela.com`). */
  subdomain: string;
  minAppVersion: string;
  presentation: Presentation;
  bridge: string[];
  fallback: string;
  /** Optional feature-flag key. When set, the app is only visible if the flag is truthy. */
  flag?: string;
};

const APP_DEFINITIONS: AppDefinition[] = [
  {
    id: "clube",
    name: "Clube",
    subdomain: "clube",
    minAppVersion: "1.0.0",
    presentation: "tab",
    bridge: ["auth", "navigation"],
    fallback: "/offline",
  },
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolves the per-user, per-environment manifest.
 *
 * Filtering (version gating, feature flags) happens entirely server-side
 * inside this function — the client receives only the entries it should see.
 */
export function resolveManifest(options: ResolveManifestOptions): Manifest {
  const { env, appVersion, flags = {} } = options;
  const domain = HOSTS[env];
  const protocol = "https"; // Caddy provides TLS even in local dev

  const apps: AppEntry[] = APP_DEFINITIONS.filter((app) => {
    // Feature-flag gate
    if (app.flag !== undefined && !flags[app.flag]) {
      return false;
    }
    // Version gate: hide if the caller's app is too old
    return compareVersions(appVersion, app.minAppVersion) >= 0;
  }).map((app) => ({
    id: app.id,
    name: app.name,
    entry: `${protocol}://${app.subdomain}.${domain}`,
    minAppVersion: app.minAppVersion,
    presentation: app.presentation,
    bridge: [...app.bridge],
    fallback: app.fallback,
  }));

  return {
    version: Date.now(),
    ttl: 300,
    env,
    apps,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Simple semver-like comparison.
 *
 * Returns a negative number if `a < b`, positive if `a > b`, zero if equal.
 * Works for the spike — a full semver library should replace this before
 * production, but the contract (return value sign) won't change.
 */
function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);

  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

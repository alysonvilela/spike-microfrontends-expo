import type { Manifest } from "manifest";
import { API_BASE_URL, APP_VERSION } from "../constants";
import { saveManifestCache, getManifestCache } from "./storage";
import bundledData from "./manifest.bundled.json";

/**
 * The manifest compiled into the app binary.
 *
 * It carries **production** entries, because that is what is true for a
 * shipped build at the moment it first launches offline. It is a cold-start
 * placeholder, not a routing source of truth — the remote manifest resolves
 * entries against the host the backend was actually reached on, so in local
 * dev these production URLs are replaced within milliseconds of reaching the
 * home screen, before any of them can be opened.
 */
const BUNDLED_MANIFEST = bundledData as Manifest;

/**
 * Start loading the best available manifest.
 *
 * Returns the bundled manifest immediately so the shell never blocks on
 * cold start. In the background, checks the persistent cache and fetches
 * the remote manifest. If a newer version is found, calls onUpdate with it.
 *
 * The remote manifest is already filtered server-side (X-App-Version header).
 * Bundled and cached manifests get client-side min_app_version filtering.
 */
export function startManifestLoad(
  bearerToken: string,
  onUpdate: (manifest: Manifest) => void,
): Manifest {
  const filtered = filterByVersion(BUNDLED_MANIFEST, APP_VERSION);

  refreshManifest(bearerToken, onUpdate);

  return filtered;
}

async function refreshManifest(
  bearerToken: string,
  onUpdate: (manifest: Manifest) => void,
): Promise<void> {
  try {
    const [cachedJson, remote] = await Promise.all([
      getManifestCache(),
      fetchRemoteManifest(bearerToken).catch(() => null),
    ]);

    const cached: Manifest | null = cachedJson
      ? (JSON.parse(cachedJson) as Manifest)
      : null;

    if (remote) {
      const cachedVersion = cached?.version ?? BUNDLED_MANIFEST.version;
      if (remote.version > cachedVersion) {
        onUpdate(filterByVersion(remote, APP_VERSION));
        await saveManifestCache(JSON.stringify(remote)).catch(() => {});
        return;
      }
    }

    if (cached && cached.version > BUNDLED_MANIFEST.version) {
      onUpdate(filterByVersion(cached, APP_VERSION));
    }
  } catch {
    // Best effort — bundled manifest is already displayed
  }
}

async function fetchRemoteManifest(bearerToken: string): Promise<Manifest> {
  const res = await fetch(`${API_BASE_URL}/api/manifest`, {
    headers: {
      authorization: `Bearer ${bearerToken}`,
      "X-App-Version": APP_VERSION,
      "X-Env": __DEV__ ? "local" : "production",
    },
  });

  if (!res.ok) {
    throw new Error(`Manifest fetch failed: ${res.status}`);
  }

  return res.json() as Promise<Manifest>;
}

/**
 * Client-side min_app_version filtering.
 * The remote manifest is already filtered server-side, but bundled and
 * cached manifests may contain entries gated behind a newer app version.
 */
function filterByVersion(manifest: Manifest, appVersion: string): Manifest {
  return {
    ...manifest,
    apps: manifest.apps.filter(
      (app) => compareVersions(appVersion, app.minAppVersion) >= 0,
    ),
  };
}

/**
 * Simple semver-like comparison.
 * Returns a negative number if a < b, positive if a > b, zero if equal.
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

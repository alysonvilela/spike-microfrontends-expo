import { auth } from "auth";
import { resolveManifest, type Env } from "manifest";

/**
 * GET /api/manifest — server-resolved app routing data.
 *
 * Returns per-user, per-environment manifest filtered by the caller's
 * app version and feature flags. The client never evaluates filtering.
 *
 * Request headers:
 *   X-App-Version — the caller's native app version (default "1.0.0")
 *   X-Env         — target environment: "local" or "production" (default "production")
 *
 * Authentication: bearer token or session cookie.
 */
export async function handleManifest(request: Request): Promise<Response> {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const appVersion = request.headers.get("X-App-Version") ?? "1.0.0";

  const rawEnv = request.headers.get("X-Env") ?? "production";
  const env: Env = rawEnv === "local" ? "local" : "production";

  // Entries are built on the host this request arrived at, so a device that
  // reached the backend over the LAN gets frontend URLs it can also reach.
  const manifest = resolveManifest({
    env,
    appVersion,
    host: new URL(request.url).hostname,
  });

  return new Response(JSON.stringify(manifest), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "cache-control": `public, max-age=${manifest.ttl}`,
    },
  });
}

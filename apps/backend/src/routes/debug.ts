import { auth } from "auth";

export async function handleDebug(request: Request): Promise<Response> {
  const session = await getSessionOrNull(request);

  if (!session) {
    return new Response(
      "<html><body><h1>401 Unauthorized</h1><p>Please log in first.</p></body></html>",
      {
        status: 401,
        headers: { "content-type": "text/html; charset=utf-8" },
      },
    );
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Debug — Authenticated</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 2rem; max-width: 40rem; margin: 0 auto; }
    .card { border: 1px solid #ccc; border-radius: 8px; padding: 1.5rem; }
    .label { color: #666; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; }
    .value { font-size: 1.1rem; margin: 0.25rem 0 1rem; }
    .badge { display: inline-block; background: #e0f2e0; color: #2e7d32; padding: 0.25rem 0.75rem; border-radius: 99px; font-size: 0.85rem; font-weight: 600; }
  </style>
</head>
<body>
  <h1>Debug Page</h1>
  <div class="card">
    <span class="badge">Authenticated</span>
    <p class="label">User ID</p>
    <p class="value">${escapeHtml(session.user.id)}</p>
    <p class="label">Name</p>
    <p class="value">${escapeHtml(session.user.name)}</p>
    <p class="label">Email</p>
    <p class="value">${escapeHtml(session.user.email)}</p>
  </div>
  <p style="margin-top: 1.5rem; color: #888; font-size: 0.9rem;">
    This page is served directly by the backend and requires a valid session.
    It is the WebView test target for the OTT handshake flow.
  </p>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

/**
 * Extract the session from a request, supporting both:
 * - Authorization: Bearer <token> (via auth.api.getSession)
 * - Cookie: better-auth.session_token=<signed> (manually extracted, then
 *   re-queried as bearer token because getSignedCookie isn't available
 *   when calling auth.api.getSession from outside the request pipeline)
 */
async function getSessionOrNull(
  request: Request,
): Promise<{ session: { id: string }; user: { id: string; name: string; email: string } } | null> {
  // Try direct getSession first (catches Authorization header)
  const direct = await auth.api
    .getSession({ headers: request.headers })
    .catch(() => null);
  if (direct) return direct;

  // Fallback: extract session token from cookie
  const cookie = request.headers.get("cookie");
  if (!cookie) return null;

  const sessionCookie = cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("better-auth.session_token="));
  if (!sessionCookie) return null;

  const rawValue = decodeURIComponent(sessionCookie.split("=")[1]);
  const sessionToken = rawValue.split(".")[0];

  return auth.api
    .getSession({
      headers: new Headers({ authorization: `Bearer ${sessionToken}` }),
    })
    .catch(() => null);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

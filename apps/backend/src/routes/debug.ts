import { auth } from "auth";

/**
 * GET /debug — a minimal authenticated HTML page served directly by the
 * backend.
 *
 * This is the WebView test target for ticket 04 (Expo shell handshake).
 * It renders "you are logged in as {user}" and is only reachable with a
 * valid session (bearer token or cookie).
 */
export async function handleDebug(request: Request): Promise<Response> {
  const session = await auth.api.getSession({ headers: request.headers });

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

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

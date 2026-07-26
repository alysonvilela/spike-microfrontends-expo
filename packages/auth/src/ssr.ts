const BACKEND_URL =
  process.env.AUTH_BASE_URL ?? "http://auth.localhost:3001";

/**
 * Retrieve the session by forwarding the request headers to the backend.
 *
 * Supports both:
 * - `Authorization: Bearer <token>` — forwarded directly.
 * - `Cookie` containing `better-auth.session_token` — the token is
 *   extracted from the unprefixed cookie (the `__Secure-` prefix is
 *   stripped by the backend's `/webview/enter` handler for local dev)
 *   and re-sent as a Bearer token. Better Auth's `getSession` handler
 *   with `useSecureCookies: true` expects the prefixed cookie name,
 *   so a direct cookie forward would fail for tokens issued via OTT.
 */
export async function getSession(
  headers: Headers,
): Promise<{ user: { id: string; name: string; email: string } } | null> {
  try {
    const backendHeaders = extractSessionHeaders(headers);
    const response = await fetch(
      `${BACKEND_URL}/api/auth/get-session`,
      { headers: backendHeaders, cache: "no-store" },
    );

    if (!response.ok) return null;

    return await response.json();
  } catch {
    return null;
  }
}

function extractSessionHeaders(headers: Headers): Headers {
  const authHeader = headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return headers;
  }

  const cookie = headers.get("cookie");
  if (!cookie) return headers;

  const sessionCookie = cookie
    .split(";")
    .map((c) => c.trim())
    .find(
      (c) =>
        c.startsWith("better-auth.session_token=") ||
        c.startsWith("__Secure-better-auth.session_token="),
    );

  if (!sessionCookie) return headers;

  const rawValue = decodeURIComponent(sessionCookie.split("=", 2)[1]);
  const sessionToken = rawValue.split(".")[0];

  return new Headers({ authorization: `Bearer ${sessionToken}` });
}

import { auth } from "auth";
import { isRedirectAllowed } from "../allowlist";

/**
 * GET /webview/enter — the OTT handshake endpoint.
 *
 * Accepts `token` and `to` query params:
 *   - `token`: a short-lived, single-use one-time token
 *   - `to`:    the allowlisted redirect destination (origin-gated)
 *
 * On success, the OTT is verified server-side, a session cookie is set
 * via the `set-cookie` header from better-auth, and the client is
 * 302-redirected to the `to` URL.
 *
 * A used token is rejected on replay because `verifyOneTimeToken`
 * marks it consumed server-side.
 */
export async function handleWebviewEnter(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const to = url.searchParams.get("to");

  if (!token) {
    return new Response(JSON.stringify({ error: "Missing 'token' query parameter" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  if (!to) {
    return new Response(JSON.stringify({ error: "Missing 'to' query parameter" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  // Check allowlist before consuming the token
  if (!isRedirectAllowed(to)) {
    return new Response(JSON.stringify({ error: "Redirect destination not allowed" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  // Verify the OTT and get a response that includes set-cookie headers
  let ottResponse: Response;
  try {
    ottResponse = await auth.api.verifyOneTimeToken({
      body: { token },
      asResponse: true,
    });
  } catch {
    // Token invalid, expired, or already used — better-auth throws when
    // asResponse is false, but the catch covers both paths.
    return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  // When asResponse is true, an invalid token returns a Response with an
  // error status rather than throwing — check it here.
  if (!ottResponse.ok) {
    return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  // Extract the set-cookie header from the OTT response
  const setCookieHeader = ottResponse.headers.get("set-cookie");
  if (!setCookieHeader) {
    return new Response(JSON.stringify({ error: "Failed to create session" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  // 302 redirect with the session cookie attached
  return new Response(null, {
    status: 302,
    headers: {
      location: to,
      "set-cookie": setCookieHeader,
    },
  });
}

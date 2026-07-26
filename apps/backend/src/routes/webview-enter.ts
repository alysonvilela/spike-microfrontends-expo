import { auth } from "auth";
import { isRedirectAllowed } from "../allowlist";

export async function handleWebviewEnter(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const to = url.searchParams.get("to");
  const requestOrigin = url.origin;

  console.log("[webview-enter] request_url=%s origin=%s", request.url, requestOrigin);
  console.log("[webview-enter] token=%.8s to=%s", token ?? "", to);

  if (!token) {
    return new Response(JSON.stringify({ error: "Missing token" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  if (!to) {
    return new Response(JSON.stringify({ error: "Missing redirect target" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const allowed = isRedirectAllowed(to, requestOrigin);
  console.log("[webview-enter] allowlist_check=%s", allowed);
  if (!allowed) {
    return new Response(JSON.stringify({ error: "Redirect not allowed" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const verifyEndpoint = new URL("/api/auth/one-time-token/verify", request.url);
  const verifyResponse = await auth.handler(
    new Request(verifyEndpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
    }),
  );

  console.log("[webview-enter] verify_status=%d", verifyResponse.status);

  if (!verifyResponse.ok) {
    const body = await verifyResponse.text().catch(() => "");
    console.log("[webview-enter] verify_fail body=%s", body);
    return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const rawCookie = verifyResponse.headers.get("set-cookie");
  console.log("[webview-enter] raw_cookie=%.60s", rawCookie ?? "");

  if (!rawCookie) {
    return new Response(JSON.stringify({ error: "Failed to create session" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  const safeCookie = rawCookie
    .replace(/;\s*Domain\s*=\s*[^;]+/gi, "")
    .replace(/;\s*Secure\s*/gi, "")
    .replace(/^__Secure-/gi, "")
    .trim();

  console.log("[webview-enter] SUCCESS redirect to=%s", to);

  return new Response(null, {
    status: 302,
    headers: {
      location: to,
      "set-cookie": safeCookie,
    },
  });
}

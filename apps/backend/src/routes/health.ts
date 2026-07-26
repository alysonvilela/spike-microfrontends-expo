import { auth } from "auth";

/**
 * GET /api/health — a minimal authenticated endpoint that proves
 * bearer-only auth works with no cookie present.
 *
 * Returns JSON with the authenticated user's info, or 401 if
 * unauthenticated.
 */
export async function handleHealth(request: Request): Promise<Response> {
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({
      status: "ok",
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      },
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

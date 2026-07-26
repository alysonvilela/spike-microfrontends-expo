import { API_BASE_URL } from "../constants";

/**
 * The shape returned by the backend's sign-in endpoint.
 */
export type SignInResult =
  | { ok: true; token: string; user: { id: string; email: string; name: string } }
  | { ok: false; error: string };

/**
 * Sign up with email, password, and name via the backend's Better Auth API.
 *
 * On success auto-sign-in returns a bearer token (autoSignIn: true in auth config).
 */
export async function signUp(
  name: string,
  email: string,
  password: string,
): Promise<SignInResult> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/sign-up/email`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const body = await res.json();

    if (res.ok) {
      return {
        ok: true,
        token: body.token,
        user: body.user,
      };
    }

    return {
      ok: false,
      error: body.error?.message ?? body.error ?? "Sign up failed",
    };
  } catch (err) {
    const message = err instanceof TypeError ? "Network error — check your connection" : "An unexpected error occurred";
    return { ok: false, error: message };
  }
}

/**
 * Sign in with email and password via the backend's Better Auth sign-in API.
 *
 * Sends credentials as JSON. On success the response includes a bearer token
 * that the shell stores securely and uses for subsequent OTT generation.
 */
export async function signIn(email: string, password: string): Promise<SignInResult> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/sign-in/email`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const body = await res.json();

    if (res.ok) {
      return {
        ok: true,
        token: body.token,
        user: body.user,
      };
    }

    return {
      ok: false,
      error: body.error?.message ?? body.error ?? "Sign in failed",
    };
  } catch (err) {
    const message = err instanceof TypeError ? "Network error — check your connection" : "An unexpected error occurred";
    return { ok: false, error: message };
  }
}

/**
 * Generate a one-time token (OTT) using the stored bearer token.
 * The OTT is used by the shell to perform the WebView handshake.
 */
export async function generateOtt(bearerToken: string): Promise<
  | { ok: true; token: string }
  | { ok: false; error: string }
> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/one-time-token`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${bearerToken}`,
        "content-type": "application/json",
      },
    });

    const body = await res.json();

    if (res.ok) {
      return { ok: true, token: body.token };
    }

    return {
      ok: false,
      error: body.error?.message ?? body.error ?? "Failed to generate one-time token",
    };
  } catch (err) {
    const message = err instanceof TypeError ? "Network error — check your connection" : "An unexpected error occurred";
    return { ok: false, error: message };
  }
}

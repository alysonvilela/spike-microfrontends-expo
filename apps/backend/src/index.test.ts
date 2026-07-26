import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { copyFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// Test DB setup
// ---------------------------------------------------------------------------
// Create a temp directory and seed it with the existing dev database (which
// already has the schema from `drizzle-kit push`). This avoids running
// drizzle-kit in every test run while keeping tests isolated from the dev DB.
const TEST_DB_DIR = mkdtempSync(join(tmpdir(), "backend-test-"));
const TEST_DB_PATH = join(TEST_DB_DIR, "auth.db");

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE_DB = join(__dirname, "..", "..", "..", "packages", "auth", "data", "auth.db");
if (existsSync(SOURCE_DB)) {
  copyFileSync(SOURCE_DB, TEST_DB_PATH);
}

process.env.DB_PATH = TEST_DB_PATH;
process.env.AUTH_BASE_URL = "http://auth.localhost:3001";

// ---------------------------------------------------------------------------
// Imports — must come after env vars are set
// ---------------------------------------------------------------------------
const { app } = await import("./index");
const { auth } = await import("auth");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type TestSession = {
  userId: string;
  token: string;
};

async function createTestUser(): Promise<TestSession> {
  const signUpRes = await auth.api.signUpEmail({
    body: {
      name: "Test User",
      email: `test-${Date.now()}@example.com`,
      password: "TestPass123!",
    },
    asResponse: false,
  });

  const signInRes = await auth.api.signInEmail({
    body: {
      email: signUpRes.user.email,
      password: "TestPass123!",
    },
    asResponse: false,
  });

  return {
    userId: signInRes.user.id,
    token: signInRes.token,
  };
}

async function generateOot(token: string): Promise<string> {
  const ottRes = await auth.api.generateOneTimeToken({
    headers: new Headers({ authorization: `Bearer ${token}` }),
  });
  return ottRes.token;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("backend", () => {
  let session: TestSession;

  afterAll(() => {
    try {
      rmSync(TEST_DB_DIR, { recursive: true, force: true });
    } catch {}
  });

  describe("GET /api/health", () => {
    it("returns 401 when no auth is provided", async () => {
      const res = await app.fetch(new Request("http://auth.localhost:3001/api/health"));
      expect(res.status).toBe(401);

      const body = await res.json();
      expect(body.error).toBe("Unauthorized");
    });

    it("returns 401 with an invalid bearer token", async () => {
      const res = await app.fetch(
        new Request("http://auth.localhost:3001/api/health", {
          headers: { authorization: "Bearer invalid-token-here" },
        }),
      );
      expect(res.status).toBe(401);
    });

    it("returns 200 with user info when authenticated via bearer", async () => {
      session = await createTestUser();

      const res = await app.fetch(
        new Request("http://auth.localhost:3001/api/health", {
          headers: { authorization: `Bearer ${session.token}` },
        }),
      );
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.status).toBe("ok");
      expect(body.user.id).toBe(session.userId);
      expect(body.user.name).toBe("Test User");
    });
  });

  describe("GET /webview/enter", () => {
    let ottToken: string;

    beforeAll(async () => {
      if (!session) {
        session = await createTestUser();
      }
    });

    it("returns 400 when token is missing", async () => {
      const res = await app.fetch(
        new Request("http://auth.localhost:3001/webview/enter?to=http://localhost:3000"),
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("token");
    });

    it("returns 400 when to is missing", async () => {
      ottToken = await generateOot(session.token);
      const res = await app.fetch(
        new Request(`http://auth.localhost:3001/webview/enter?token=${ottToken}`),
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("to");
    });

    it("returns 400 when to is not allowlisted", async () => {
      ottToken = await generateOot(session.token);
      const res = await app.fetch(
        new Request(
          `http://auth.localhost:3001/webview/enter?token=${ottToken}&to=https://evil.com`,
        ),
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("not allowed");
    });

    it("returns 302 with set-cookie for valid token and allowlisted to", async () => {
      ottToken = await generateOot(session.token);
      const res = await app.fetch(
        new Request(
          `http://auth.localhost:3001/webview/enter?token=${ottToken}&to=http://localhost:3000`,
        ),
      );
      expect(res.status).toBe(302);
      expect(res.headers.get("location")).toBe("http://localhost:3000");
      expect(res.headers.get("set-cookie")).toContain("better-auth.session_token");
    });

    it("rejects replay of a used OTT", async () => {
      const res = await app.fetch(
        new Request(
          `http://auth.localhost:3001/webview/enter?token=${ottToken}&to=http://localhost:3000`,
        ),
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("Invalid or expired");
    });
  });

  describe("GET /debug", () => {
    it("returns 401 when no auth is provided", async () => {
      const res = await app.fetch(new Request("http://auth.localhost:3001/debug"));
      expect(res.status).toBe(401);
    });

    it("returns 200 with HTML containing user info when authenticated", async () => {
      const res = await app.fetch(
        new Request("http://auth.localhost:3001/debug", {
          headers: { authorization: `Bearer ${session.token}` },
        }),
      );
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/html");

      const html = await res.text();
      expect(html).toContain("Test User");
      expect(html).toContain("Authenticated");
      expect(html).toContain(session.userId);
    });
  });

  describe("better-auth API forwarding", () => {
    it("forwards to better-auth handler for /api/auth/get-session", async () => {
      const res = await app.fetch(
        new Request("http://auth.localhost:3001/api/auth/get-session", {
          headers: { authorization: `Bearer ${session.token}` },
        }),
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.user).toBeDefined();
      expect(body.user.id).toBe(session.userId);
    });
  });
});

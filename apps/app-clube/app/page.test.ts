import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { copyFileSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const TEST_DB_DIR = mkdtempSync(join(tmpdir(), "app-clube-test-"));
const TEST_DB_PATH = join(TEST_DB_DIR, "auth.db");

const SOURCE_DB = join(
  import.meta.dir,
  "..",
  "..",
  "..",
  "packages",
  "auth",
  "data",
  "auth.db",
);
if (existsSync(SOURCE_DB)) {
  copyFileSync(SOURCE_DB, TEST_DB_PATH);
}

process.env.DB_PATH = TEST_DB_PATH;

const { app: backendApp } = await import("../../backend/src/index");
const { auth } = await import("auth");

type TestSession = {
  userId: string;
  token: string;
};

async function createTestUser(): Promise<TestSession> {
  const signUpRes = await auth.api.signUpEmail({
    body: {
      name: "Clube Test User",
      email: `clube-test-${Date.now()}@example.com`,
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

function startBackendServer(): {
  url: string;
  stop: () => void;
} {
  const server = Bun.serve({
    port: 0,
    fetch: (request) => backendApp.fetch(request),
  });

  return {
    url: server.url.origin,
    stop: () => server.stop(),
  };
}

describe("app-clube SSR auth", () => {
  let session: TestSession;
  let backend: { url: string; stop: () => void };

  beforeAll(async () => {
    session = await createTestUser();
    backend = startBackendServer();
    process.env.AUTH_BASE_URL = backend.url;
  });

  afterAll(() => {
    try {
      rmSync(TEST_DB_DIR, { recursive: true, force: true });
    } catch {}
    backend.stop();
  });

  describe("getSession", () => {
    it("returns null when no auth headers are provided", async () => {
      const { getSession } = await import("auth/ssr");
      const result = await getSession(new Headers());
      expect(result).toBeNull();
    });

    it("returns null with an invalid session cookie", async () => {
      const { getSession } = await import("auth/ssr");
      const headers = new Headers({
        cookie: "better-auth.session_token=invalid-token",
      });
      const result = await getSession(headers);
      expect(result).toBeNull();
    });

    it("returns the user when a valid bearer token is forwarded", async () => {
      const { getSession } = await import("auth/ssr");
      const headers = new Headers({
        authorization: `Bearer ${session.token}`,
      });
      const result = await getSession(headers);
      expect(result).not.toBeNull();
      expect(result!.user.id).toBe(session.userId);
      expect(result!.user.name).toBe("Clube Test User");
    });

    it("returns the user when a valid session cookie is set via OTT", async () => {
      const ottRes = await auth.api.generateOneTimeToken({
        headers: new Headers({ authorization: `Bearer ${session.token}` }),
      });

      const enterUrl = `${backend.url}/webview/enter?token=${ottRes.token}&to=http://localhost:3000`;
      const enterRes = await fetch(enterUrl, { redirect: "manual" });
      expect(enterRes.status).toBe(302);

      const setCookie = enterRes.headers.get("set-cookie");
      expect(setCookie).not.toBeNull();
      const cookieNameValueOnly = setCookie!.split(";")[0];

      const { getSession } = await import("auth/ssr");
      const headers = new Headers({ cookie: cookieNameValueOnly });
      const result = await getSession(headers);
      expect(result).not.toBeNull();
      expect(result!.user.id).toBe(session.userId);
      expect(result!.user.name).toBe("Clube Test User");
    });
  });
});

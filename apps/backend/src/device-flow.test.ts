import { describe, expect, it } from "bun:test";
import { copyFileSync, existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const TEST_DB_DIR = mkdtempSync(join(tmpdir(), "device-flow-"));
const TEST_DB_PATH = join(TEST_DB_DIR, "auth.db");
const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE_DB = join(__dirname, "..", "..", "..", "packages", "auth", "data", "auth.db");
if (existsSync(SOURCE_DB)) copyFileSync(SOURCE_DB, TEST_DB_PATH);

process.env.DB_PATH = TEST_DB_PATH;
process.env.AUTH_BASE_URL = "http://auth.localhost:3001";

const { app } = await import("./index");
const { auth } = await import("auth");

// The dev machine's LAN IP, as a phone on the same network sees it.
const LAN = "192.168.18.125";

describe("physical-device flow over the LAN", () => {
  it("hands the device a reachable entry URL and accepts it as a redirect", async () => {
    const signUp = await auth.api.signUpEmail({
      body: {
        name: "Device User",
        email: `device-${Date.now()}@example.com`,
        password: "TestPass123!",
      },
      asResponse: false,
    });
    const signIn = await auth.api.signInEmail({
      body: { email: signUp.user.email, password: "TestPass123!" },
      asResponse: false,
    });

    // 1. Shell fetches the manifest at the LAN address it reached the backend on.
    const manifestRes = await app.fetch(
      new Request(`http://${LAN}:3001/api/manifest`, {
        headers: {
          authorization: `Bearer ${signIn.token}`,
          "X-App-Version": "1.0.0",
          "X-Env": "local",
        },
      }),
    );
    expect(manifestRes.status).toBe(200);

    const manifest = await manifestRes.json();
    const entry = manifest.apps[0].entry;

    // The entry must be on the same host the device already reached — not a
    // .local name it cannot resolve.
    expect(entry).toBe(`http://${LAN}:3000`);

    // 2. Shell mints an OTT and opens the handshake with that entry as `to`.
    const ott = await auth.api.generateOneTimeToken({
      headers: new Headers({ authorization: `Bearer ${signIn.token}` }),
    });

    const enterRes = await app.fetch(
      new Request(
        `http://${LAN}:3001/webview/enter?token=${ott.token}&to=${encodeURIComponent(entry)}`,
      ),
    );

    // 3. The handshake must accept it and hand back a session cookie.
    expect(enterRes.status).toBe(302);
    expect(enterRes.headers.get("location")).toBe(entry);

    const cookie = enterRes.headers.get("set-cookie") ?? "";
    expect(cookie).toContain("better-auth.session_token");
    // Host-only and non-Secure, so it survives plain http on the LAN and is
    // sent to port 3000 as well as 3001.
    expect(cookie).not.toContain("Domain=");
    expect(cookie).not.toContain("Secure");
  });

  it("still refuses an off-host redirect from the same LAN request", async () => {
    const res = await app.fetch(
      new Request(
        `http://${LAN}:3001/webview/enter?token=whatever&to=https://evil.com`,
      ),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("not allowed");
  });
});

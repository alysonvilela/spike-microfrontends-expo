import { describe, expect, it } from "bun:test";
import { resolveManifest } from "./index";

describe("resolveManifest", () => {
  it("returns the expected manifest shape", () => {
    const result = resolveManifest({
      env: "production",
      appVersion: "1.0.0",
    });

    expect(result).toHaveProperty("version");
    expect(typeof result.version).toBe("number");
    expect(result.ttl).toBe(300);
    expect(result.env).toBe("production");
    expect(Array.isArray(result.apps)).toBe(true);
  });

  it("returns apps when app version meets minAppVersion", () => {
    const result = resolveManifest({
      env: "production",
      appVersion: "1.0.0",
    });

    expect(result.apps).toHaveLength(1);
    expect(result.apps[0].id).toBe("clube");
  });

  it("returns apps when app version exceeds minAppVersion", () => {
    const result = resolveManifest({
      env: "production",
      appVersion: "2.0.0",
    });

    expect(result.apps).toHaveLength(1);
  });

  it("filters out apps below the caller's app version", () => {
    const result = resolveManifest({
      env: "production",
      appVersion: "0.9.0",
    });

    expect(result.apps).toHaveLength(0);
  });

  it("filters out apps gated behind an absent flag", () => {
    // clube has no flag, so it should still appear
    const result = resolveManifest({
      env: "production",
      appVersion: "1.0.0",
      flags: {},
    });

    expect(result.apps).toHaveLength(1);
  });

  it("includes apps when gate flag is explicitly true", () => {
    const result = resolveManifest({
      env: "production",
      appVersion: "1.0.0",
      flags: { someFlag: true },
    });

    expect(result.apps).toHaveLength(1);
  });

  it("local env without a host targets Caddy on the registrable domain", () => {
    // Caddy terminates TLS on 443 and proxies to the dev server, so the
    // client never names localPort.
    const result = resolveManifest({
      env: "local",
      appVersion: "1.0.0",
    });

    expect(result.apps[0].entry).toBe("https://clube.alysonvilela.local");
  });

  it("local env keeps the Caddy shape when reached on the registrable domain", () => {
    const result = resolveManifest({
      env: "local",
      appVersion: "1.0.0",
      host: "auth.alysonvilela.local",
    });

    expect(result.apps[0].entry).toBe("https://clube.alysonvilela.local");
  });

  it("local env builds entries on the LAN IP the backend was reached on", () => {
    // The physical-device case: no DNS for *.alysonvilela.local, no trust for
    // Caddy's internal CA, so the device must talk to the dev server directly.
    const result = resolveManifest({
      env: "local",
      appVersion: "1.0.0",
      host: "192.168.18.125",
    });

    expect(result.apps[0].entry).toBe("http://192.168.18.125:3000");
  });

  it("local env builds entries on localhost when reached on localhost", () => {
    const result = resolveManifest({
      env: "local",
      appVersion: "1.0.0",
      host: "localhost",
    });

    expect(result.apps[0].entry).toBe("http://localhost:3000");
  });

  it("production env ignores the request host", () => {
    const result = resolveManifest({
      env: "production",
      appVersion: "1.0.0",
      host: "192.168.18.125",
    });

    expect(result.apps[0].entry).toBe("https://clube.alysonvilela.com");
  });

  it("production env does not include port in entry URL", () => {
    const result = resolveManifest({
      env: "production",
      appVersion: "1.0.0",
    });

    expect(result.apps[0].entry).toBe("https://clube.alysonvilela.com");
  });

  it("copies bridge array (does not share reference)", () => {
    const result = resolveManifest({
      env: "production",
      appVersion: "1.0.0",
    });

    expect(result.apps[0].bridge).toEqual(["auth", "navigation"]);
  });
});

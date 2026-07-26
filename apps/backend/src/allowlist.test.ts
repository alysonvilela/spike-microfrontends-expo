import { describe, expect, it } from "bun:test";
import { isRedirectAllowed } from "./allowlist";

describe("isRedirectAllowed", () => {
  describe("static allowlist", () => {
    it("allows an allowlisted origin", () => {
      expect(isRedirectAllowed("http://localhost:3000")).toBe(true);
    });

    it("allows an allowlisted origin with a path", () => {
      expect(isRedirectAllowed("http://localhost:3000/clube/home")).toBe(true);
    });

    it("allows the production app-clube origin", () => {
      expect(isRedirectAllowed("https://clube.alysonvilela.com")).toBe(true);
    });

    it("rejects an unknown origin", () => {
      expect(isRedirectAllowed("https://evil.com")).toBe(false);
    });

    it("rejects a matching host on a non-allowlisted port", () => {
      expect(isRedirectAllowed("http://localhost:9999")).toBe(false);
    });

    it("rejects a malformed URL", () => {
      expect(isRedirectAllowed("not-a-url")).toBe(false);
    });
  });

  describe("same private host, any port", () => {
    it("allows app-clube on the LAN IP the backend was reached on", () => {
      expect(
        isRedirectAllowed(
          "http://192.168.18.125:3000",
          "http://192.168.18.125:3001",
        ),
      ).toBe(true);
    });

    it("allows the 10.0.0.0/8 range", () => {
      expect(
        isRedirectAllowed("http://10.1.2.3:3000", "http://10.1.2.3:3001"),
      ).toBe(true);
    });

    it("allows the 172.16.0.0/12 range", () => {
      expect(
        isRedirectAllowed("http://172.20.0.5:3000", "http://172.20.0.5:3001"),
      ).toBe(true);
    });

    it("allows loopback", () => {
      expect(
        isRedirectAllowed("http://127.0.0.1:3000", "http://127.0.0.1:3001"),
      ).toBe(true);
    });

    it("allows IPv6 loopback", () => {
      expect(
        isRedirectAllowed("http://[::1]:3000", "http://[::1]:3001"),
      ).toBe(true);
    });

    it("allows a .localhost subdomain", () => {
      expect(
        isRedirectAllowed(
          "http://auth.localhost:3000",
          "http://auth.localhost:3001",
        ),
      ).toBe(true);
    });

    it("rejects a different private host", () => {
      expect(
        isRedirectAllowed(
          "http://192.168.18.200:3000",
          "http://192.168.18.125:3001",
        ),
      ).toBe(false);
    });

    it("rejects 172.15.x.x — just below the private range", () => {
      expect(
        isRedirectAllowed("http://172.15.0.5:3000", "http://172.15.0.5:3001"),
      ).toBe(false);
    });

    it("rejects 172.32.x.x — just above the private range", () => {
      expect(
        isRedirectAllowed("http://172.32.0.5:3000", "http://172.32.0.5:3001"),
      ).toBe(false);
    });

    it("rejects an octet above 255", () => {
      expect(
        isRedirectAllowed("http://192.168.1.999", "http://192.168.1.999"),
      ).toBe(false);
    });
  });

  describe("Host header spoofing", () => {
    // requestOrigin comes from the Host header, which the caller controls.
    // Only private/loopback hosts may use the same-host rule, so a spoofed
    // public host falls back to the static allowlist and is rejected.
    it("rejects a spoofed public host matching the redirect target", () => {
      expect(isRedirectAllowed("https://evil.com", "https://evil.com")).toBe(
        false,
      );
    });

    it("rejects a spoofed public host on another port", () => {
      expect(
        isRedirectAllowed("https://evil.com:8443", "https://evil.com"),
      ).toBe(false);
    });

    it("still rejects an unrelated target under a private request host", () => {
      expect(
        isRedirectAllowed("https://evil.com", "http://192.168.18.125:3001"),
      ).toBe(false);
    });
  });
});

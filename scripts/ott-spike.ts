#!/usr/bin/env bun
/**
 * OTT → Set-Cookie spike
 *
 * Proves the one-time-token primitive works: create a user, sign in,
 * generate an OTT, verify it, and capture the Set-Cookie header.
 *
 * Run from the repo root:
 *   DB_PATH=./data/auth.db bun run scripts/ott-spike.ts
 *
 * (Make sure tables exist first: see "Setup" below.)
 *
 * Setup (run once):
 *   mkdir -p data
 *   cd packages/auth && bunx drizzle-kit push && cd ../..
 *   DB_PATH=./data/auth.db bun run scripts/ott-spike.ts
 *
 * This script is THROWAWAY — not wired into the app, no test coverage.
 * Its result determines whether ticket 03's /webview/enter handler
 * uses the direct helper path or the session-reissue fallback.
 */

import { auth } from "../packages/auth/src/auth";

const TEST_EMAIL = "ott-spike@test.local";
const TEST_PASSWORD = "TestPass123!";
const TEST_NAME = "OTT Spike User";

function fmt(s: string | undefined, max = 40): string {
  if (!s) return "<missing>";
  return s.length > max ? `${s.slice(0, max)}...` : s;
}

async function ensureUser(): Promise<void> {
  try {
    await auth.api.signUpEmail({
      body: { email: TEST_EMAIL, password: TEST_PASSWORD, name: TEST_NAME },
    });
    console.log(`   ✓ Created user\n`);
  } catch {
    // User likely already exists — that's fine
    console.log(`   ✓ User already exists\n`);
  }
}

async function getSessionHeaders(): Promise<Headers> {
  // Sign in and capture the Set-Cookie header to get the real session cookie
  const signIn = await auth.api.signInEmail({
    body: { email: TEST_EMAIL, password: TEST_PASSWORD },
    asResponse: true,
  });

  const cookies = signIn.headers.get("set-cookie");
  if (!cookies) {
    // Try reading all headers for debugging
    const allHeaders: string[] = [];
    signIn.headers.forEach((v, k) => allHeaders.push(`${k}: ${v}`));
    throw new Error(
      `No Set-Cookie from signIn. Headers: ${allHeaders.join(", ")}`,
    );
  }

  // Log cookie for debugging
  console.log(`   ✓ Signed in`);
  console.log(`   Raw Set-Cookie: ${cookies}\n`);

  return new Headers({ Cookie: cookies.split(";")[0] });
}

async function main() {
  console.log("═══════════════════════════════════════════════");
  console.log("  OTT → Set-Cookie spike");
  console.log("═══════════════════════════════════════════════\n");

  console.log(`📁 DB: ${process.env.DB_PATH ?? "./data/auth.db"}\n`);

  // ── Step 1: Get an authenticated session ──────────────
  console.log("── Step 1: Create user & sign in ─────────────");
  const headers = await getSessionHeaders();

  // ── Step 2: Generate a one-time token ─────────────────
  console.log("── Step 2: Generate OTT ──────────────────────");
  const ott = await auth.api.generateOneTimeToken({ headers });
  console.log(`   ✓ OTT: ${ott.token}\n`);

  // ── Step 3: Verify OTT → capture Set-Cookie ───────────
  console.log("── Step 3: Verify OTT → capture Set-Cookie ───");
  const verified = await auth.api.verifyOneTimeToken({
    body: { token: ott.token },
    asResponse: true,
  });

  const setCookie = verified.headers.get("set-cookie");

  if (setCookie) {
    console.log(`   ✅ Set-Cookie DETECTED`);
    console.log(`      ${setCookie}\n`);
    console.log(`   ✅ DIRECT HELPER PATH WORKS`);
    console.log(`      verifyOneTimeToken() with asResponse:true`);
    console.log(`      produces a valid Set-Cookie header directly.\n`);
    console.log(`   → Ticket 03's /webview/enter can use the DIRECT helper`);
    console.log(`     (call verifyOneTimeToken and forward the Set-Cookie).`);
  } else {
    console.log(`   ❌ No Set-Cookie from verifyOneTimeToken\n`);
    console.log(`   → FALLBACK PATH: reissue a session for the returned userId.`);
  }

  // asResponse:true returns a Response — the JSON body isn't auto-parsed,
  // but the Set-Cookie header is what we need to prove.

  // ── Step 4: Confirm OTT is single-use ─────────────────
  console.log("── Step 4: Confirm single-use ────────────────");
  try {
    await auth.api.verifyOneTimeToken({ body: { token: ott.token } });
    console.log("   ❌ Second verify SUCCEEDED — NOT single-use!");
  } catch {
    console.log("   ✅ Second verify REJECTED — single-use confirmed.");
  }

  console.log("\n═══════════════════════════════════════════════");
  console.log("  Spike complete.");
  console.log("═══════════════════════════════════════════════");
}

main().catch((err) => {
  console.error(`\n❌ Spike failed:`, err instanceof Error ? err.message : err);
  process.exit(1);
});

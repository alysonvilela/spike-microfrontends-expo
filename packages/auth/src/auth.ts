import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { bearer } from "better-auth/plugins/bearer";
import { oneTimeToken } from "better-auth/plugins/one-time-token";
import { db } from "./db";
import * as schema from "./schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema,
  }),
  baseURL: process.env.AUTH_BASE_URL ?? "http://auth.localhost:3001",
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
  },
  plugins: [
    bearer(),
    oneTimeToken({
      expiresIn: 1,
      storeToken: "hashed",
    }),
  ],
  advanced: {
    crossSubDomainCookies: {
      enabled: true,
      domain: ".localhost",
    },
    defaultCookieAttributes: {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
    },
    useSecureCookies: true,
  },
  trustedOrigins: ["*"],
});

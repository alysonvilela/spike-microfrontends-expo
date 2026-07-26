import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
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
    oneTimeToken({
      expiresIn: 1,
    }),
  ],
  advanced: {
    crossSubDomainCookies: {
      enabled: false,
    },
    defaultCookieAttributes: {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    },
    useSecureCookies: false,
  },
  trustedOrigins: ["*"],
});

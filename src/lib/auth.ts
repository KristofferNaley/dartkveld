import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { appUrl as baseUrl } from "./url";

const appUrl = baseUrl();

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? appUrl,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: [appUrl],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user: schema.user, session: schema.session, account: schema.account, verification: schema.verification },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    autoSignIn: true,
    disableSignUp: process.env.DISABLE_SIGNUP === "true",
  },
  session: {
    expiresIn: 60 * 60 * 24 * 90, // 90 dager: man vil ikke logge inn midt i en dartkveld
    updateAge: 60 * 60 * 24,
  },
  plugins: [nextCookies()],
});

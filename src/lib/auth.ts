import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { findInvite, joinByInvite } from "./groups";
import { appUrl as baseUrl } from "./url";

const appUrl = baseUrl();

/** Finnes det noen brukere ennå? */
export async function hasUsers(): Promise<boolean> {
  const rows = await db.select({ id: schema.user.id }).from(schema.user).limit(1);
  return rows.length > 0;
}

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
  hooks: {
    // Registrering krever en invitasjonskode (header x-invite-code fra /bli-med-lenken).
    // Den aller første brukeren kan registrere seg uten, så en ny installasjon kan komme i gang.
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-up/email") return;
      if (!(await hasUsers())) return;
      const code = ctx.headers?.get("x-invite-code") ?? "";
      if (!(await findInvite(code))) {
        throw new APIError("FORBIDDEN", { message: "Du trenger en gyldig invitasjonslenke for å lage konto", code: "INVITE_REQUIRED" });
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-up/email") return;
      const userId = ctx.context.newSession?.user.id;
      const code = ctx.headers?.get("x-invite-code");
      if (userId && code) await joinByInvite(userId, code).catch(() => undefined);
    }),
  },
  plugins: [nextCookies()],
});

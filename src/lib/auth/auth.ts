import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { bearer } from "better-auth/plugins/bearer";

import { getDb } from "@/src/db";
import { account, session, user, verification } from "@/src/db/schema/auth";
import { sendAuthEmail } from "@/src/lib/email";

const authSchema = { user, session, account, verification };

function getRequiredAuthSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET;

  if (!secret) {
    throw new Error("BETTER_AUTH_SECRET must be configured before using authentication.");
  }

  return secret;
}

export function createAuth() {
  const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

  return betterAuth({
    secret: getRequiredAuthSecret(),
    baseURL,
    basePath: "/api/auth",
    trustedOrigins: [baseURL],
    database: drizzleAdapter(getDb(), {
      provider: "mysql",
      schema: authSchema,
    }),
    user: {
      additionalFields: {
        status: {
          type: "string",
          required: true,
          defaultValue: "ACTIVE",
          input: false,
        },
      },
    },
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      requireEmailVerification: true,
      sendResetPassword: async ({ user: authUser, url }) => {
        await sendAuthEmail({
          to: authUser.email,
          subject: "Reset your SATGAS DESA SEJOLI password",
          text: `Open this link to reset your password: ${url}`,
          url,
        });
      },
    },
    emailVerification: {
      sendVerificationEmail: async ({ user: authUser, url }) => {
        await sendAuthEmail({
          to: authUser.email,
          subject: "Verify your SATGAS DESA SEJOLI email",
          text: `Open this link to verify your email: ${url}`,
          url,
        });
      },
    },
    plugins: [bearer(), nextCookies()],
  });
}

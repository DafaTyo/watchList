import { betterAuth } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { db } from "./db";

export function isRegistrationAllowed(): boolean {
  return process.env.ALLOW_REGISTRATION?.toLowerCase() === "true";
}

export const auth = betterAuth({
  appName: "Nixtio Watch",
  database: prismaAdapter(db, {
    provider: "mysql",
  }),
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (
        (ctx.path === "/sign-up/email" || ctx.path === "/sign-in/email") &&
        ctx.body &&
        typeof ctx.body === "object"
      ) {
        const body = ctx.body as Record<string, unknown>;
        if (typeof body.email === "string") {
          body.email = body.email.trim().toLowerCase();
        }
        if (typeof body.name === "string") {
          body.name = body.name.trim();
        }
      }
    }),
  },
  emailAndPassword: {
    enabled: true,
    get disableSignUp() {
      return !isRegistrationAllowed();
    },
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
    revokeSessionsOnPasswordReset: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": {
        window: 60,
        max: 5,
      },
      "/sign-up/email": {
        window: 60,
        max: 5,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          return {
            data: {
              ...user,
              email: user.email.trim().toLowerCase(),
              name: user.name.trim(),
            },
          };
        },
      },
    },
  },
  plugins: [nextCookies()],
});


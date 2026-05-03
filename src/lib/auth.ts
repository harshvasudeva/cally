import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { organization, twoFactor } from "better-auth/plugins";
import prisma from "./prisma";

// ----- Conditionally enable each social provider only if configured -----
function socialProviders() {
  const sp: Record<string, { clientId: string; clientSecret: string }> = {};
  const providers = [
    ["google", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
    ["github", "GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"],
    ["discord", "DISCORD_CLIENT_ID", "DISCORD_CLIENT_SECRET"],
    ["microsoft", "MICROSOFT_CLIENT_ID", "MICROSOFT_CLIENT_SECRET"],
    ["apple", "APPLE_CLIENT_ID", "APPLE_CLIENT_SECRET"],
    ["facebook", "FACEBOOK_CLIENT_ID", "FACEBOOK_CLIENT_SECRET"],
    ["twitter", "TWITTER_CLIENT_ID", "TWITTER_CLIENT_SECRET"],
    ["linkedin", "LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET"],
  ] as const;

  for (const [name, idEnv, secretEnv] of providers) {
    const id = process.env[idEnv];
    const secret = process.env[secretEnv];
    if (id && secret) sp[name] = { clientId: id, clientSecret: secret };
  }
  return sp;
}

export const auth = betterAuth({
  appName: "Cally",
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET ?? "dev-only-secret-change-me",
  database: prismaAdapter(prisma, { provider: "postgresql" }),

  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    requireEmailVerification: false, // togglable via Settings later
  },

  socialProviders: socialProviders(),

  user: {
    additionalFields: {
      slug: { type: "string", required: false, input: false },
      role: { type: "string", defaultValue: "USER", input: false },
      timezone: { type: "string", defaultValue: "UTC" },
      theme: { type: "string", defaultValue: "dark" },
      country: { type: "string", required: false },
      onboardingCompleted: { type: "boolean", defaultValue: false, input: false },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh once per day
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },

  advanced: {
    cookiePrefix: "cally",
    useSecureCookies: process.env.NODE_ENV === "production",
    crossSubDomainCookies: { enabled: false },
  },

  plugins: [
    organization({
      allowUserToCreateOrganization: true,
      organizationLimit: 10,
      membershipLimit: 100,
      invitationExpiresIn: 60 * 60 * 24 * 7,
    }),
    twoFactor({
      issuer: "Cally",
    }),
  ],

  trustedOrigins: [
    process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
    "http://localhost:3000",
  ],
});

export type Session = typeof auth.$Infer.Session;

// Compat: legacy pages still `import { authOptions } from "@/lib/auth"`.
// authOptions is a NextAuth construct; with better-auth it's no longer used.
// Export an empty stub so those imports keep compiling.
export const authOptions = {} as const;

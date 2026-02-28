// Environment variable validation (#25) - Fail fast on startup

function getEnv(key: string, fallback?: string): string {
  const value = process.env[key]
  if (value !== undefined) return value
  if (fallback !== undefined) return fallback
  throw new Error(`Missing required environment variable: ${key}`)
}

function getEnvOptional(key: string): string | undefined {
  return process.env[key]
}

function getEnvInt(key: string, fallback: number): number {
  const value = process.env[key]
  if (!value) return fallback
  const parsed = parseInt(value, 10)
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a valid integer, got: ${value}`)
  }
  return parsed
}

function getEnvBool(key: string, fallback: boolean): boolean {
  const value = process.env[key]
  if (!value) return fallback
  return value === "true" || value === "1"
}

export const env = {
  // NextAuth (required in production, safe fallback in dev only)
  get NEXTAUTH_SECRET() {
    const secret = process.env.NEXTAUTH_SECRET
    if (secret) return secret
    if (this.NODE_ENV === "production") {
      throw new Error("NEXTAUTH_SECRET is required in production. Generate one with: openssl rand -base64 32")
    }
    // Dev-only fallback - never used in production
    return "dev-only-unsafe-secret-" + (process.env.HOSTNAME || "localhost")
  },
  get NEXTAUTH_URL() { return getEnv("NEXTAUTH_URL", "http://localhost:3000") },

  // Database
  get DATABASE_URL() { return getEnv("DATABASE_URL", "file:./prisma/dev.db") },

  // Google OAuth (optional)
  get GOOGLE_CLIENT_ID() { return getEnvOptional("GOOGLE_CLIENT_ID") },
  get GOOGLE_CLIENT_SECRET() { return getEnvOptional("GOOGLE_CLIENT_SECRET") },

  // Discord OAuth (optional)
  get DISCORD_CLIENT_ID() { return getEnvOptional("DISCORD_CLIENT_ID") },
  get DISCORD_CLIENT_SECRET() { return getEnvOptional("DISCORD_CLIENT_SECRET") },

  // Twitter OAuth (optional)
  get TWITTER_CLIENT_ID() { return getEnvOptional("TWITTER_CLIENT_ID") },
  get TWITTER_CLIENT_SECRET() { return getEnvOptional("TWITTER_CLIENT_SECRET") },

  // Facebook OAuth (optional)
  get FACEBOOK_CLIENT_ID() { return getEnvOptional("FACEBOOK_CLIENT_ID") },
  get FACEBOOK_CLIENT_SECRET() { return getEnvOptional("FACEBOOK_CLIENT_SECRET") },

  // Apple OAuth (optional)
  get APPLE_ID() { return getEnvOptional("APPLE_ID") },
  get APPLE_SECRET() { return getEnvOptional("APPLE_SECRET") },

  // Discord Bot (optional)
  get DISCORD_BOT_TOKEN() { return getEnvOptional("DISCORD_BOT_TOKEN") },

  // App settings
  get NODE_ENV() { return getEnv("NODE_ENV", "development") },
  get PORT() { return getEnvInt("PORT", 3000) },

  // Feature flags
  get ENABLE_REGISTRATION() { return getEnvBool("ENABLE_REGISTRATION", true) },
} as const

// Validate on import (will throw if required vars are missing)
export function validateEnv(): void {
  try {
    // Access required variables to trigger validation
    void env.NEXTAUTH_SECRET
    void env.NEXTAUTH_URL
    console.log("[env] Environment variables validated successfully")
  } catch (error) {
    console.error("[env] Environment validation failed:", error)
    if (env.NODE_ENV === "production") {
      process.exit(1)
    }
  }
}

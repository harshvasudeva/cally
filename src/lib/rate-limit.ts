// In-memory rate limiter (#3, #18)
// Uses a sliding window approach

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Clean up expired entries every 5 minutes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store) {
      if (now > entry.resetAt) {
        store.delete(key)
      }
    }
  }, 5 * 60 * 1000)
}

export interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

// Default limits — can be overridden via admin settings
const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  api: { maxRequests: 100, windowMs: 60 * 1000 },           // 100 req/min for general API
  auth: { maxRequests: 10, windowMs: 15 * 60 * 1000 },      // 10 attempts per 15 min
  booking: { maxRequests: 20, windowMs: 60 * 1000 },         // 20 bookings/min per IP
  admin: { maxRequests: 30, windowMs: 60 * 1000 },           // 30 req/min for admin endpoints
  events: { maxRequests: 60, windowMs: 60 * 1000 },          // 60 req/min for event CRUD
}

// Mutable copy of rate limits — updated when admin changes settings
let RATE_LIMITS = { ...DEFAULT_RATE_LIMITS }

/**
 * Update rate limit configuration at runtime (called from admin settings API).
 */
export function updateRateLimits(overrides: Record<string, Partial<RateLimitConfig>>) {
  for (const [key, config] of Object.entries(overrides)) {
    if (RATE_LIMITS[key]) {
      RATE_LIMITS[key] = {
        maxRequests: config.maxRequests ?? RATE_LIMITS[key].maxRequests,
        windowMs: config.windowMs ?? RATE_LIMITS[key].windowMs,
      }
    }
  }
}

/**
 * Get current rate limit configuration (for admin UI).
 */
export function getRateLimitConfig(): Record<string, RateLimitConfig> {
  return { ...RATE_LIMITS }
}

/**
 * Get current rate limit stats for monitoring.
 */
export function getRateLimitStats() {
  const stats = {
    totalEntries: store.size,
    activeByType: {} as Record<string, number>,
  }
  for (const key of store.keys()) {
    const type = key.split(":")[0]
    stats.activeByType[type] = (stats.activeByType[type] || 0) + 1
  }
  return stats
}

export function rateLimit(
  identifier: string,
  type: keyof typeof RATE_LIMITS = "api"
): { success: boolean; remaining: number; resetAt: number } {
  const config = RATE_LIMITS[type]
  const key = `${type}:${identifier}`
  const now = Date.now()

  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + config.windowMs })
    return { success: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs }
  }

  if (entry.count >= config.maxRequests) {
    return { success: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count++
  return { success: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt }
}

export function getRateLimitHeaders(result: { remaining: number; resetAt: number }) {
  return {
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": new Date(result.resetAt).toISOString(),
  }
}

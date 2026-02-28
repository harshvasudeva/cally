// In-memory rate limiter (#3, #18)
// Uses a sliding window approach

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key)
    }
  }
}, 5 * 60 * 1000)

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  api: { maxRequests: 100, windowMs: 60 * 1000 },           // 100 req/min for general API
  auth: { maxRequests: 10, windowMs: 15 * 60 * 1000 },      // 10 attempts per 15 min
  booking: { maxRequests: 20, windowMs: 60 * 1000 },         // 20 bookings/min per IP
  admin: { maxRequests: 30, windowMs: 60 * 1000 },           // 30 req/min for admin endpoints
  events: { maxRequests: 60, windowMs: 60 * 1000 },          // 60 req/min for event CRUD
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

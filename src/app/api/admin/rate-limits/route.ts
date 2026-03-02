import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getRateLimitConfig, getRateLimitStats, updateRateLimits, RateLimitConfig } from "@/lib/rate-limit"

/**
 * GET - Get current rate limit configuration and stats
 * PUT - Update rate limit configuration
 */
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user || (session.user as { role: string }).role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        return NextResponse.json({
            config: getRateLimitConfig(),
            stats: getRateLimitStats(),
        })
    } catch (error) {
        console.error("Error fetching rate limits:", error)
        return NextResponse.json({ error: "Failed to fetch rate limits" }, { status: 500 })
    }
}

export async function PUT(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user || (session.user as { role: string }).role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const body = await request.json()
        const overrides: Record<string, Partial<RateLimitConfig>> = {}

        // Validate and sanitize input
        const allowedTypes = ["api", "auth", "booking", "admin", "events"]
        for (const type of allowedTypes) {
            if (body[type]) {
                const max = parseInt(body[type].maxRequests)
                const windowMs = parseInt(body[type].windowMs)
                if (!isNaN(max) && max > 0 && max <= 10000) {
                    overrides[type] = overrides[type] || {}
                    overrides[type].maxRequests = max
                }
                if (!isNaN(windowMs) && windowMs >= 1000 && windowMs <= 3600000) {
                    overrides[type] = overrides[type] || {}
                    overrides[type].windowMs = windowMs
                }
            }
        }

        updateRateLimits(overrides)

        return NextResponse.json({
            message: "Rate limits updated",
            config: getRateLimitConfig(),
        })
    } catch (error) {
        console.error("Error updating rate limits:", error)
        return NextResponse.json({ error: "Failed to update rate limits" }, { status: 500 })
    }
}

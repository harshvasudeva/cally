import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

/**
 * GET - Retrieve notification preferences
 * PUT - Update notification preferences
 */
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const userId = (session.user as { id: string }).id
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { notificationPrefs: true },
        })

        const prefs = user?.notificationPrefs ? JSON.parse(user.notificationPrefs) : null

        return NextResponse.json({ prefs })
    } catch (error) {
        console.error("Error fetching notification prefs:", error)
        return NextResponse.json({ error: "Failed to fetch preferences" }, { status: 500 })
    }
}

export async function PUT(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const userId = (session.user as { id: string }).id
        const body = await request.json()

        // Validate/whitelist the preference keys
        const allowedKeys = [
            "emailBookingNew", "emailBookingConfirmed", "emailBookingCancelled",
            "emailReminder", "emailDailyDigest",
            "discordBookingNew", "discordBookingConfirmed", "discordBookingCancelled",
            "discordReminder", "reminderMinutes",
        ]

        const sanitized: Record<string, boolean | number> = {}
        for (const key of allowedKeys) {
            if (key in body) {
                if (key === "reminderMinutes") {
                    const val = parseInt(body[key])
                    sanitized[key] = [10, 15, 30, 60, 120, 1440].includes(val) ? val : 30
                } else {
                    sanitized[key] = !!body[key]
                }
            }
        }

        await prisma.user.update({
            where: { id: userId },
            data: { notificationPrefs: JSON.stringify(sanitized) },
        })

        return NextResponse.json({ message: "Preferences saved", prefs: sanitized })
    } catch (error) {
        console.error("Error saving notification prefs:", error)
        return NextResponse.json({ error: "Failed to save preferences" }, { status: 500 })
    }
}

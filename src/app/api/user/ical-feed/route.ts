import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { randomBytes } from "crypto"

/**
 * GET - Retrieve current iCal subscription info
 * POST - Generate or regenerate iCal token
 * DELETE - Revoke iCal token (disables feed)
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
            select: { icalToken: true },
        })

        return NextResponse.json({
            hasToken: !!user?.icalToken,
            feedUrl: user?.icalToken ? `/api/ical/${user.icalToken}` : null,
        })
    } catch (error) {
        console.error("Error fetching iCal info:", error)
        return NextResponse.json({ error: "Failed to fetch iCal info" }, { status: 500 })
    }
}

export async function POST() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const userId = (session.user as { id: string }).id
        const token = randomBytes(32).toString("hex")

        await prisma.user.update({
            where: { id: userId },
            data: { icalToken: token },
        })

        return NextResponse.json({
            feedUrl: `/api/ical/${token}`,
            message: "iCal feed URL generated. Add this URL to your calendar app.",
        })
    } catch (error) {
        console.error("Error generating iCal token:", error)
        return NextResponse.json({ error: "Failed to generate token" }, { status: 500 })
    }
}

export async function DELETE() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const userId = (session.user as { id: string }).id

        await prisma.user.update({
            where: { id: userId },
            data: { icalToken: null },
        })

        return NextResponse.json({ message: "iCal feed disabled" })
    } catch (error) {
        console.error("Error revoking iCal token:", error)
        return NextResponse.json({ error: "Failed to revoke token" }, { status: 500 })
    }
}

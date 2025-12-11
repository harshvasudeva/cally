import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

// GET user's availability
export async function GET() {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const userId = (session.user as { id: string }).id

        const availability = await prisma.availability.findMany({
            where: { userId },
            orderBy: { dayOfWeek: "asc" }
        })

        return NextResponse.json(availability)
    } catch (error) {
        console.error("Error fetching availability:", error)
        return NextResponse.json({ error: "Failed to fetch availability" }, { status: 500 })
    }
}

// POST/PUT update availability (replaces all)
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const userId = (session.user as { id: string }).id
        const body = await request.json()
        const { availability } = body

        if (!Array.isArray(availability)) {
            return NextResponse.json({ error: "Invalid availability format" }, { status: 400 })
        }

        // Delete existing availability
        await prisma.availability.deleteMany({
            where: { userId }
        })

        // Create new availability
        const newAvailability = await prisma.availability.createMany({
            data: availability.map((slot: { dayOfWeek: number; startTime: string; endTime: string; isActive?: boolean }) => ({
                dayOfWeek: slot.dayOfWeek,
                startTime: slot.startTime,
                endTime: slot.endTime,
                isActive: slot.isActive !== false,
                userId
            }))
        })

        const updatedAvailability = await prisma.availability.findMany({
            where: { userId },
            orderBy: { dayOfWeek: "asc" }
        })

        return NextResponse.json(updatedAvailability)
    } catch (error) {
        console.error("Error updating availability:", error)
        return NextResponse.json({ error: "Failed to update availability" }, { status: 500 })
    }
}

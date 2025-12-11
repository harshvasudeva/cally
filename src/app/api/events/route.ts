import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

// GET all events for the current user
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const start = searchParams.get("start")
        const end = searchParams.get("end")

        const userId = (session.user as { id: string }).id

        const whereClause: { userId: string; start?: { gte: Date }; end?: { lte: Date } } = { userId }

        if (start) {
            whereClause.start = { gte: new Date(start) }
        }
        if (end) {
            whereClause.end = { lte: new Date(end) }
        }

        const events = await prisma.event.findMany({
            where: whereClause,
            orderBy: { start: "asc" }
        })

        return NextResponse.json(events)
    } catch (error) {
        console.error("Error fetching events:", error)
        return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 })
    }
}

// POST create new event
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await request.json()
        const { title, description, start, end, allDay, color, category, location, recurrence } = body

        if (!title || !start || !end) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        const userId = (session.user as { id: string }).id

        const event = await prisma.event.create({
            data: {
                title,
                description,
                start: new Date(start),
                end: new Date(end),
                allDay: allDay || false,
                color: color || "#3b82f6",
                category,
                location,
                recurrence,
                userId
            }
        })

        return NextResponse.json(event, { status: 201 })
    } catch (error) {
        console.error("Error creating event:", error)
        return NextResponse.json({ error: "Failed to create event" }, { status: 500 })
    }
}

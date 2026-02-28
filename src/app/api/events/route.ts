import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { sanitizeEventInput } from "@/lib/sanitize"
import { createAuditLog } from "@/lib/audit"

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

        // (#41) Use select to only fetch needed fields
        const events = await prisma.event.findMany({
            where: whereClause,
            select: {
                id: true,
                title: true,
                description: true,
                start: true,
                end: true,
                allDay: true,
                color: true,
                category: true,
                location: true,
                recurrence: true,
                userId: true,
                createdAt: true,
                updatedAt: true,
            },
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
        const { start, end, allDay, color, category, recurrence } = body

        // (#16) Sanitize user inputs
        const sanitized = sanitizeEventInput({
            title: body.title,
            description: body.description,
            location: body.location,
        })

        if (!sanitized.title || !start || !end) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        const userId = (session.user as { id: string }).id

        const event = await prisma.event.create({
            data: {
                title: sanitized.title,
                description: sanitized.description || null,
                start: new Date(start),
                end: new Date(end),
                allDay: allDay || false,
                color: color || "#3b82f6",
                category,
                location: sanitized.location || null,
                recurrence,
                userId
            }
        })

        // (#4) Audit log
        await createAuditLog({
            action: "EVENT_CREATE",
            entity: "Event",
            entityId: event.id,
            details: { title: sanitized.title },
            userId,
        })

        return NextResponse.json(event, { status: 201 })
    } catch (error) {
        console.error("Error creating event:", error)
        return NextResponse.json({ error: "Failed to create event" }, { status: 500 })
    }
}

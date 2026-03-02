import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { sanitizeEventInput } from "@/lib/sanitize"
import { createAuditLog } from "@/lib/audit"
import { RRule } from "rrule"

// GET all events for the current user (with RRULE expansion)
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

        // For recurring events, fetch a wider range since the base event may be outside the window
        const whereClause: { userId: string; OR?: Array<Record<string, unknown>> } = { userId }

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

        // Expand recurring events into individual occurrences
        const rangeStart = start ? new Date(start) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        const rangeEnd = end ? new Date(end) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)

        const expandedEvents: typeof events = []

        for (const event of events) {
            if (!event.recurrence) {
                // Non-recurring: include if in range (or if no range specified)
                const eventStart = new Date(event.start)
                const eventEnd = new Date(event.end)
                if (eventStart <= rangeEnd && eventEnd >= rangeStart) {
                    expandedEvents.push(event)
                }
                continue
            }

            // Recurring: expand with RRULE
            try {
                const duration = new Date(event.end).getTime() - new Date(event.start).getTime()
                const rule = new RRule({
                    ...RRule.parseString(event.recurrence),
                    dtstart: new Date(event.start),
                })

                const occurrences = rule.between(rangeStart, rangeEnd, true)

                for (const occurrence of occurrences) {
                    expandedEvents.push({
                        ...event,
                        id: `${event.id}_${occurrence.getTime()}`, // Unique ID per occurrence
                        start: occurrence,
                        end: new Date(occurrence.getTime() + duration),
                    })
                }
            } catch (err) {
                // If RRULE parsing fails, just include the base event
                console.error(`Failed to parse RRULE for event ${event.id}:`, err)
                expandedEvents.push(event)
            }
        }

        // Sort by start time
        expandedEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())

        return NextResponse.json(expandedEvents)
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

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { sanitizeEventInput } from "@/lib/sanitize"
import { createAuditLog } from "@/lib/audit"

// GET single event
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id } = await params
        const userId = (session.user as { id: string }).id

        const event = await prisma.event.findFirst({
            where: { id, userId }
        })

        if (!event) {
            return NextResponse.json({ error: "Event not found" }, { status: 404 })
        }

        return NextResponse.json(event)
    } catch (error) {
        console.error("Error fetching event:", error)
        return NextResponse.json({ error: "Failed to fetch event" }, { status: 500 })
    }
}

// PUT update event
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id } = await params
        const userId = (session.user as { id: string }).id
        const body = await request.json()
        const { start, end, allDay, color, category, recurrence } = body

        // (#16) Sanitize inputs
        const sanitized = sanitizeEventInput({
            title: body.title,
            description: body.description,
            location: body.location,
        })

        const existingEvent = await prisma.event.findFirst({
            where: { id, userId }
        })

        if (!existingEvent) {
            return NextResponse.json({ error: "Event not found" }, { status: 404 })
        }

        const event = await prisma.event.update({
            where: { id },
            data: {
                title: sanitized.title || undefined,
                description: sanitized.description || undefined,
                start: start ? new Date(start) : undefined,
                end: end ? new Date(end) : undefined,
                allDay,
                color,
                category,
                location: sanitized.location || undefined,
                recurrence
            }
        })

        // (#4) Audit log
        await createAuditLog({
            action: "EVENT_UPDATE",
            entity: "Event",
            entityId: id,
            details: { title: event.title },
            userId,
        })

        return NextResponse.json(event)
    } catch (error) {
        console.error("Error updating event:", error)
        return NextResponse.json({ error: "Failed to update event" }, { status: 500 })
    }
}

// DELETE event
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id } = await params
        const userId = (session.user as { id: string }).id

        const existingEvent = await prisma.event.findFirst({
            where: { id, userId }
        })

        if (!existingEvent) {
            return NextResponse.json({ error: "Event not found" }, { status: 404 })
        }

        await prisma.event.delete({
            where: { id }
        })

        // (#4) Audit log
        await createAuditLog({
            action: "EVENT_DELETE",
            entity: "Event",
            entityId: id,
            details: { title: existingEvent.title },
            userId,
        })

        return NextResponse.json({ message: "Event deleted" })
    } catch (error) {
        console.error("Error deleting event:", error)
        return NextResponse.json({ error: "Failed to delete event" }, { status: 500 })
    }
}

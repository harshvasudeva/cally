import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import ical, { ICalCalendarMethod } from "ical-generator"
import * as ICAL from "ical"

// GET export calendar as ICS
export async function GET() {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const userId = (session.user as { id: string }).id
        const userName = (session.user as { name: string }).name

        // Get all events and appointments
        const events = await prisma.event.findMany({
            where: { userId }
        })

        const appointments = await prisma.appointment.findMany({
            where: { userId, status: { not: "CANCELLED" } }
        })

        // Create calendar
        const calendar = ical({
            name: `${userName}'s Calendar`,
            method: ICalCalendarMethod.PUBLISH
        })

        // Add events
        events.forEach(event => {
            calendar.createEvent({
                id: event.id,
                start: event.start,
                end: event.end,
                summary: event.title,
                description: event.description || undefined,
                location: event.location || undefined,
                allDay: event.allDay
            })
        })

        // Add appointments
        appointments.forEach(apt => {
            calendar.createEvent({
                id: apt.id,
                start: apt.start,
                end: apt.end,
                summary: apt.title,
                description: `Guest: ${apt.guestName}\nEmail: ${apt.guestEmail}${apt.guestNotes ? `\nNotes: ${apt.guestNotes}` : ""}`,
                attendees: [{ email: apt.guestEmail, name: apt.guestName }]
            })
        })

        const icsContent = calendar.toString()

        return new NextResponse(icsContent, {
            status: 200,
            headers: {
                "Content-Type": "text/calendar",
                "Content-Disposition": `attachment; filename="${userName.replace(/\s+/g, "_")}_calendar.ics"`
            }
        })
    } catch (error) {
        console.error("Error exporting calendar:", error)
        return NextResponse.json({ error: "Failed to export calendar" }, { status: 500 })
    }
}

// POST import ICS file
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const userId = (session.user as { id: string }).id

        const formData = await request.formData()
        const file = formData.get("file") as File

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 })
        }

        const content = await file.text()
        const parsed = ICAL.parseICS(content)

        const importedEvents: { title: string; start: Date; end: Date }[] = []

        for (const key in parsed) {
            const event = parsed[key]
            if (event.type === "VEVENT") {
                const start = event.start as Date
                const end = event.end as Date || new Date(start.getTime() + 60 * 60 * 1000) // Default 1 hour

                await prisma.event.create({
                    data: {
                        title: (event.summary as string) || "Imported Event",
                        description: event.description as string || null,
                        start,
                        end,
                        allDay: !!(event.start as { dateOnly?: boolean })?.dateOnly,
                        location: event.location as string || null,
                        color: "#10b981",
                        category: "imported",
                        userId
                    }
                })

                importedEvents.push({
                    title: (event.summary as string) || "Imported Event",
                    start,
                    end
                })
            }
        }

        return NextResponse.json({
            message: `Successfully imported ${importedEvents.length} events`,
            events: importedEvents
        })
    } catch (error) {
        console.error("Error importing calendar:", error)
        return NextResponse.json({ error: "Failed to import calendar" }, { status: 500 })
    }
}

import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import ical, { ICalCalendarMethod } from "ical-generator"

/**
 * Public iCal subscription feed.
 * URL: /api/ical/[token]
 *
 * Calendar apps (Apple Calendar, Google Calendar, Thunderbird, etc.)
 * can subscribe to this URL and poll it periodically.
 * No authentication needed — the token in the URL acts as the credential.
 */
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) {
    try {
        const { token } = await params

        // Find user by their private iCal token
        const user = await prisma.user.findUnique({
            where: { icalToken: token },
            select: {
                id: true,
                name: true,
                timezone: true,
            },
        })

        if (!user) {
            return new NextResponse("Calendar not found", { status: 404 })
        }

        // Fetch events + confirmed appointments
        const [events, appointments] = await Promise.all([
            prisma.event.findMany({
                where: { userId: user.id },
            }),
            prisma.appointment.findMany({
                where: {
                    userId: user.id,
                    status: { in: ["CONFIRMED", "PENDING"] },
                },
                include: { appointmentType: true },
            }),
        ])

        // Build iCal calendar
        const calendar = ical({
            name: `${user.name || "User"}'s Calendar`,
            timezone: user.timezone || "UTC",
            method: ICalCalendarMethod.PUBLISH,
            ttl: 900, // Suggest 15-minute refresh interval
        })

        // Add personal events
        for (const event of events) {
            calendar.createEvent({
                id: event.id,
                start: event.start,
                end: event.end,
                summary: event.title,
                description: event.description || undefined,
                location: event.location || undefined,
                allDay: event.allDay,
                ...(event.recurrence ? { repeating: event.recurrence } : {}),
            })
        }

        // Add appointments
        for (const apt of appointments) {
            const statusPrefix = apt.status === "PENDING" ? "[Pending] " : ""
            calendar.createEvent({
                id: apt.id,
                start: apt.start,
                end: apt.end,
                summary: `${statusPrefix}${apt.title}`,
                description: [
                    `Guest: ${apt.guestName}`,
                    `Email: ${apt.guestEmail}`,
                    apt.guestPhone ? `Phone: ${apt.guestPhone}` : null,
                    apt.guestNotes ? `Notes: ${apt.guestNotes}` : null,
                    apt.meetingLink ? `Meeting: ${apt.meetingLink}` : null,
                    apt.appointmentType ? `Type: ${apt.appointmentType.name}` : null,
                ].filter(Boolean).join("\n"),
                attendees: [{ email: apt.guestEmail, name: apt.guestName }],
            })
        }

        const icsContent = calendar.toString()

        return new NextResponse(icsContent, {
            status: 200,
            headers: {
                "Content-Type": "text/calendar; charset=utf-8",
                "Content-Disposition": `inline; filename="calendar.ics"`,
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "X-Content-Type-Options": "nosniff",
            },
        })
    } catch (error) {
        console.error("Error generating iCal feed:", error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}

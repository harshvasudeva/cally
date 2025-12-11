import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { addMinutes, format, startOfDay, endOfDay, parseISO, isBefore, isAfter } from "date-fns"

// GET available slots for booking
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params
        const { searchParams } = new URL(request.url)
        const date = searchParams.get("date")
        const typeSlug = searchParams.get("type")

        if (!date) {
            return NextResponse.json({ error: "Date is required" }, { status: 400 })
        }

        // Find user by slug
        const user = await prisma.user.findUnique({
            where: { slug },
            include: {
                availability: { where: { isActive: true } },
                appointmentTypes: { where: { isActive: true } }
            }
        })

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        // Get appointment type
        const appointmentType = typeSlug
            ? user.appointmentTypes.find(t => t.slug === typeSlug)
            : user.appointmentTypes[0]

        if (!appointmentType) {
            return NextResponse.json({ error: "No appointment types available" }, { status: 404 })
        }

        const selectedDate = parseISO(date)
        const dayOfWeek = selectedDate.getDay()

        // Get availability for this day
        const dayAvailability = user.availability.filter(a => a.dayOfWeek === dayOfWeek)

        if (dayAvailability.length === 0) {
            return NextResponse.json({ slots: [], appointmentType })
        }

        // Get existing appointments and events for this day
        const dayStart = startOfDay(selectedDate)
        const dayEnd = endOfDay(selectedDate)

        const existingAppointments = await prisma.appointment.findMany({
            where: {
                userId: user.id,
                status: { not: "CANCELLED" },
                start: { gte: dayStart },
                end: { lte: dayEnd }
            }
        })

        const existingEvents = await prisma.event.findMany({
            where: {
                userId: user.id,
                start: { lte: dayEnd },
                end: { gte: dayStart }
            }
        })

        // Calculate available slots
        const slots: { start: string; end: string }[] = []
        const slotDuration = appointmentType.duration
        const bufferBefore = appointmentType.bufferBefore
        const bufferAfter = appointmentType.bufferAfter

        for (const avail of dayAvailability) {
            const [startHour, startMin] = avail.startTime.split(":").map(Number)
            const [endHour, endMin] = avail.endTime.split(":").map(Number)

            let slotStart = new Date(selectedDate)
            slotStart.setHours(startHour, startMin, 0, 0)

            const availEnd = new Date(selectedDate)
            availEnd.setHours(endHour, endMin, 0, 0)

            while (addMinutes(slotStart, slotDuration) <= availEnd) {
                const slotEnd = addMinutes(slotStart, slotDuration)
                const bufferStart = addMinutes(slotStart, -bufferBefore)
                const bufferEnd = addMinutes(slotEnd, bufferAfter)

                // Check if slot conflicts with existing appointments or events
                const hasConflict = [...existingAppointments, ...existingEvents].some(item => {
                    const itemStart = new Date(item.start)
                    const itemEnd = new Date(item.end)
                    return (
                        (isAfter(bufferStart, itemStart) && isBefore(bufferStart, itemEnd)) ||
                        (isAfter(bufferEnd, itemStart) && isBefore(bufferEnd, itemEnd)) ||
                        (isBefore(bufferStart, itemStart) && isAfter(bufferEnd, itemEnd)) ||
                        (bufferStart.getTime() === itemStart.getTime())
                    )
                })

                // Only add future slots
                const now = new Date()
                if (!hasConflict && isAfter(slotStart, now)) {
                    slots.push({
                        start: slotStart.toISOString(),
                        end: slotEnd.toISOString()
                    })
                }

                slotStart = addMinutes(slotStart, 15) // 15-minute increments
            }
        }

        return NextResponse.json({ slots, appointmentType, user: { name: user.name, slug: user.slug } })
    } catch (error) {
        console.error("Error fetching slots:", error)
        return NextResponse.json({ error: "Failed to fetch slots" }, { status: 500 })
    }
}

// POST book an appointment
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params
        const body = await request.json()
        const { start, end, guestName, guestEmail, guestPhone, guestNotes, appointmentTypeId, formData } = body

        if (!start || !end || !guestName || !guestEmail) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        // Find user
        const user = await prisma.user.findUnique({
            where: { slug }
        })

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        // Get appointment type
        const appointmentType = appointmentTypeId
            ? await prisma.appointmentType.findUnique({ where: { id: appointmentTypeId } })
            : await prisma.appointmentType.findFirst({ where: { userId: user.id, isActive: true } })

        if (!appointmentType) {
            return NextResponse.json({ error: "Appointment type not found" }, { status: 404 })
        }

        // Check for conflicts
        const startDate = new Date(start)
        const endDate = new Date(end)

        const conflictingAppointment = await prisma.appointment.findFirst({
            where: {
                userId: user.id,
                status: { not: "CANCELLED" },
                OR: [
                    { AND: [{ start: { lte: startDate } }, { end: { gt: startDate } }] },
                    { AND: [{ start: { lt: endDate } }, { end: { gte: endDate } }] },
                    { AND: [{ start: { gte: startDate } }, { end: { lte: endDate } }] }
                ]
            }
        })

        if (conflictingAppointment) {
            return NextResponse.json({ error: "Time slot is no longer available" }, { status: 409 })
        }

        // Create appointment
        const appointment = await prisma.appointment.create({
            data: {
                title: `${appointmentType.name} with ${guestName}`,
                start: startDate,
                end: endDate,
                guestName,
                guestEmail,
                guestPhone,
                guestNotes,
                formData: formData ? JSON.stringify(formData) : null,
                userId: user.id,
                appointmentTypeId: appointmentType.id
            },
            include: { appointmentType: true }
        })

        // TODO: Send confirmation email

        return NextResponse.json(appointment, { status: 201 })
    } catch (error) {
        console.error("Error booking appointment:", error)
        return NextResponse.json({ error: "Failed to book appointment" }, { status: 500 })
    }
}

import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { addMinutes, format, startOfDay, endOfDay, parseISO, isBefore, isAfter } from "date-fns"
import { rateLimit, getRateLimitHeaders } from "@/lib/rate-limit"
import { sanitizeBookingInput } from "@/lib/sanitize"
import { createAuditLog, getClientIp } from "@/lib/audit"

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
                appointmentTypes: { where: { isActive: true } },
                dateOverrides: true // (#75) Load date overrides
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

        // (#75) Check date overrides first
        const dateStr = format(selectedDate, "yyyy-MM-dd")
        const override = user.dateOverrides.find(
            o => format(new Date(o.date), "yyyy-MM-dd") === dateStr
        )

        if (override?.isBlocked) {
            return NextResponse.json({
                slots: [],
                appointmentType,
                user: { name: user.name, slug: user.slug },
                blocked: true,
                blockReason: override.reason || "This date is unavailable"
            })
        }

        // Use override hours if available, otherwise use regular availability
        let dayAvailability: { startTime: string; endTime: string }[]
        if (override && !override.isBlocked && override.startTime && override.endTime) {
            dayAvailability = [{ startTime: override.startTime, endTime: override.endTime }]
        } else {
            dayAvailability = user.availability.filter(a => a.dayOfWeek === dayOfWeek)
        }

        if (dayAvailability.length === 0) {
            return NextResponse.json({
                slots: [],
                appointmentType,
                user: { name: user.name, slug: user.slug }
            })
        }

        // Get existing appointments and events for this day
        const dayStart = startOfDay(selectedDate)
        const dayEnd = endOfDay(selectedDate)

        const [existingAppointments, existingEvents] = await Promise.all([
            prisma.appointment.findMany({
                where: {
                    userId: user.id,
                    status: { not: "CANCELLED" },
                    start: { gte: dayStart },
                    end: { lte: dayEnd }
                }
            }),
            prisma.event.findMany({
                where: {
                    userId: user.id,
                    start: { lte: dayEnd },
                    end: { gte: dayStart }
                }
            })
        ])

        // (#64) Check max bookings per day
        const confirmedToday = existingAppointments.filter(
            a => a.status !== "CANCELLED"
        ).length
        const maxPerDay = appointmentType.maxPerDay
        if (maxPerDay > 0 && confirmedToday >= maxPerDay) {
            return NextResponse.json({
                slots: [],
                appointmentType,
                user: { name: user.name, slug: user.slug },
                maxReached: true
            })
        }

        // Calculate available slots
        const slots: { start: string; end: string }[] = []
        const slotDuration = appointmentType.duration
        const bufferBefore = appointmentType.bufferBefore
        const bufferAfter = appointmentType.bufferAfter
        const minNotice = appointmentType.minNotice // (#63) minutes

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

                // (#63) Check minimum notice period
                const now = new Date()
                const earliestAllowed = addMinutes(now, minNotice)
                const meetsNotice = isAfter(slotStart, earliestAllowed)

                if (!hasConflict && meetsNotice) {
                    slots.push({
                        start: slotStart.toISOString(),
                        end: slotEnd.toISOString()
                    })
                }

                slotStart = addMinutes(slotStart, 15) // 15-minute increments
            }
        }

        return NextResponse.json({
            slots,
            appointmentType,
            user: { name: user.name, slug: user.slug }
        })
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
        const ip = getClientIp(request)

        // (#18) Rate limit booking attempts per IP
        const rl = rateLimit(ip, "booking")
        if (!rl.success) {
            return NextResponse.json(
                { error: "Too many booking attempts. Please try again later." },
                { status: 429, headers: getRateLimitHeaders(rl) }
            )
        }

        const body = await request.json()

        // (#16) Sanitize all user inputs
        const sanitized = sanitizeBookingInput({
            guestName: body.guestName,
            guestEmail: body.guestEmail,
            guestPhone: body.guestPhone,
            guestNotes: body.guestNotes,
            negotiationNote: body.negotiationNote,
        })

        const { start, end, appointmentTypeId, formData } = body

        if (!start || !end || !sanitized.guestName || !sanitized.guestEmail) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(sanitized.guestEmail)) {
            return NextResponse.json({ error: "Invalid email address" }, { status: 400 })
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

        const startDate = new Date(start)
        const endDate = new Date(end)

        // (#63) Enforce minimum notice period
        const now = new Date()
        const earliestAllowed = addMinutes(now, appointmentType.minNotice)
        if (isBefore(startDate, earliestAllowed)) {
            return NextResponse.json({
                error: `Appointments must be booked at least ${appointmentType.minNotice} minutes in advance`
            }, { status: 400 })
        }

        // (#64) Enforce max bookings per day
        if (appointmentType.maxPerDay > 0) {
            const dayStart = startOfDay(startDate)
            const dayEnd = endOfDay(startDate)
            const dayCount = await prisma.appointment.count({
                where: {
                    userId: user.id,
                    status: { not: "CANCELLED" },
                    start: { gte: dayStart },
                    end: { lte: dayEnd }
                }
            })
            if (dayCount >= appointmentType.maxPerDay) {
                return NextResponse.json({
                    error: "Maximum bookings for this day has been reached"
                }, { status: 409 })
            }
        }

        // (#75) Check date override blocking
        const dateStr = format(startDate, "yyyy-MM-dd")
        const override = await prisma.dateOverride.findFirst({
            where: {
                userId: user.id,
                date: startOfDay(startDate),
                isBlocked: true
            }
        })
        if (override) {
            return NextResponse.json({
                error: "This date is not available for bookings"
            }, { status: 409 })
        }

        // Check for conflicts
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
                title: `${appointmentType.name} with ${sanitized.guestName}`,
                start: startDate,
                end: endDate,
                guestName: sanitized.guestName,
                guestEmail: sanitized.guestEmail,
                guestPhone: sanitized.guestPhone || null,
                guestNotes: sanitized.guestNotes || null,
                formData: formData ? JSON.stringify(formData) : null,
                negotiationNote: body.isNegotiation ? sanitized.negotiationNote : null,
                userId: user.id,
                appointmentTypeId: appointmentType.id
            },
            include: { appointmentType: true }
        })

        // (#4) Audit log
        await createAuditLog({
            action: "APPOINTMENT_CREATE",
            entity: "Appointment",
            entityId: appointment.id,
            details: {
                guestName: sanitized.guestName,
                guestEmail: sanitized.guestEmail,
                start: startDate.toISOString(),
                type: appointmentType.name,
            },
            ipAddress: ip,
            userId: user.id,
        })

        return NextResponse.json(appointment, { status: 201 })
    } catch (error) {
        console.error("Error booking appointment:", error)
        return NextResponse.json({ error: "Failed to book appointment" }, { status: 500 })
    }
}

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { createAuditLog } from "@/lib/audit"

// GET all appointments for the current user (#88 - search/filter support)
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const status = searchParams.get("status")
        const start = searchParams.get("start")
        const end = searchParams.get("end")
        const search = searchParams.get("search")

        const userId = (session.user as { id: string }).id

        const whereClause: any = { userId }

        if (status) {
            whereClause.status = status
        }
        if (start) {
            whereClause.start = { gte: new Date(start) }
        }
        if (end) {
            whereClause.end = { ...whereClause.end, lte: new Date(end) }
        }

        // (#88) Search by guest name or email
        if (search) {
            whereClause.OR = [
                { guestName: { contains: search } },
                { guestEmail: { contains: search } },
                { title: { contains: search } },
            ]
        }

        const appointments = await prisma.appointment.findMany({
            where: whereClause,
            include: {
                appointmentType: {
                    select: {
                        id: true,
                        name: true,
                        color: true,
                        duration: true,
                    }
                }
            },
            orderBy: { start: "desc" }
        })

        return NextResponse.json(appointments)
    } catch (error) {
        console.error("Error fetching appointments:", error)
        return NextResponse.json({ error: "Failed to fetch appointments" }, { status: 500 })
    }
}

// (#90) PATCH - Bulk actions on appointments
export async function PATCH(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const userId = (session.user as { id: string }).id
        const body = await request.json()
        const { ids, action } = body as { ids: string[]; action: "CONFIRMED" | "CANCELLED" | "DELETE" }

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: "No appointments selected" }, { status: 400 })
        }

        if (!["CONFIRMED", "CANCELLED", "DELETE"].includes(action)) {
            return NextResponse.json({ error: "Invalid action" }, { status: 400 })
        }

        // Verify all appointments belong to the user
        const appointments = await prisma.appointment.findMany({
            where: { id: { in: ids }, userId }
        })

        if (appointments.length !== ids.length) {
            return NextResponse.json({ error: "Some appointments not found" }, { status: 404 })
        }

        if (action === "DELETE") {
            await prisma.appointment.deleteMany({
                where: { id: { in: ids }, userId }
            })
        } else {
            await prisma.appointment.updateMany({
                where: { id: { in: ids }, userId },
                data: { status: action }
            })
        }

        // (#4) Audit log
        await createAuditLog({
            action: action === "DELETE"
                ? "APPOINTMENT_DELETE"
                : action === "CONFIRMED"
                    ? "APPOINTMENT_CONFIRM"
                    : "APPOINTMENT_CANCEL",
            entity: "Appointment",
            details: {
                bulkAction: true,
                count: ids.length,
                appointmentIds: ids,
            },
            userId,
        })

        return NextResponse.json({
            message: `${ids.length} appointment(s) ${action === "DELETE" ? "deleted" : "updated"}`,
            count: ids.length
        })
    } catch (error) {
        console.error("Error bulk updating appointments:", error)
        return NextResponse.json({ error: "Failed to update appointments" }, { status: 500 })
    }
}

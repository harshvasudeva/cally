import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { format, parseISO } from "date-fns"
import { createAuditLog } from "@/lib/audit"

export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const userId = (session.user as { id: string }).id
        const { searchParams } = new URL(request.url)
        const type = searchParams.get("type") || "appointments" // appointments | events
        const status = searchParams.get("status")
        const startDate = searchParams.get("start")
        const endDate = searchParams.get("end")

        let csv = ""

        if (type === "appointments") {
            const where: any = { userId }
            if (status) where.status = status
            if (startDate) where.start = { gte: new Date(startDate) }
            if (endDate) where.end = { ...where.end, lte: new Date(endDate) }

            const appointments = await prisma.appointment.findMany({
                where,
                include: { appointmentType: { select: { name: true } } },
                orderBy: { start: "desc" },
            })

            csv = "Title,Guest Name,Guest Email,Guest Phone,Start,End,Status,Type,Notes,Created\n"
            csv += appointments
                .map((a) =>
                    [
                        csvEscape(a.title),
                        csvEscape(a.guestName),
                        csvEscape(a.guestEmail),
                        csvEscape(a.guestPhone || ""),
                        format(new Date(a.start), "yyyy-MM-dd HH:mm"),
                        format(new Date(a.end), "yyyy-MM-dd HH:mm"),
                        a.status,
                        csvEscape(a.appointmentType?.name || ""),
                        csvEscape(a.guestNotes || ""),
                        format(new Date(a.createdAt), "yyyy-MM-dd HH:mm"),
                    ].join(",")
                )
                .join("\n")
        } else if (type === "events") {
            const where: any = { userId }
            if (startDate) where.start = { gte: new Date(startDate) }
            if (endDate) where.end = { ...where.end, lte: new Date(endDate) }

            const events = await prisma.event.findMany({
                where,
                orderBy: { start: "desc" },
            })

            csv = "Title,Description,Start,End,All Day,Category,Location,Color,Created\n"
            csv += events
                .map((e) =>
                    [
                        csvEscape(e.title),
                        csvEscape(e.description || ""),
                        format(new Date(e.start), "yyyy-MM-dd HH:mm"),
                        format(new Date(e.end), "yyyy-MM-dd HH:mm"),
                        e.allDay ? "Yes" : "No",
                        csvEscape(e.category || ""),
                        csvEscape(e.location || ""),
                        e.color,
                        format(new Date(e.createdAt), "yyyy-MM-dd HH:mm"),
                    ].join(",")
                )
                .join("\n")
        } else {
            return NextResponse.json({ error: "Invalid export type" }, { status: 400 })
        }

        await createAuditLog({
            action: "DATA_EXPORT",
            entity: type,
            details: { type, format: "csv" },
            userId,
        })

        const filename = `cally-${type}-${format(new Date(), "yyyy-MM-dd")}.csv`

        return new NextResponse(csv, {
            headers: {
                "Content-Type": "text/csv; charset=utf-8",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        })
    } catch (error) {
        console.error("Export error:", error)
        return NextResponse.json({ error: "Failed to export data" }, { status: 500 })
    }
}

function csvEscape(value: string): string {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`
    }
    return value
}

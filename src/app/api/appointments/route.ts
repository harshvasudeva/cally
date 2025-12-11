import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

// GET all appointments for the current user
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

        const userId = (session.user as { id: string }).id

        const whereClause: {
            userId: string
            status?: string
            start?: { gte: Date }
            end?: { lte: Date }
        } = { userId }

        if (status) {
            whereClause.status = status
        }
        if (start) {
            whereClause.start = { gte: new Date(start) }
        }
        if (end) {
            whereClause.end = { lte: new Date(end) }
        }

        const appointments = await prisma.appointment.findMany({
            where: whereClause,
            include: {
                appointmentType: true
            },
            orderBy: { start: "asc" }
        })

        return NextResponse.json(appointments)
    } catch (error) {
        console.error("Error fetching appointments:", error)
        return NextResponse.json({ error: "Failed to fetch appointments" }, { status: 500 })
    }
}

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

// GET single appointment
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

        const appointment = await prisma.appointment.findFirst({
            where: { id, userId },
            include: { appointmentType: true }
        })

        if (!appointment) {
            return NextResponse.json({ error: "Appointment not found" }, { status: 404 })
        }

        return NextResponse.json(appointment)
    } catch (error) {
        console.error("Error fetching appointment:", error)
        return NextResponse.json({ error: "Failed to fetch appointment" }, { status: 500 })
    }
}

// PUT update appointment status
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
        const { status, meetingLink } = body

        const existingAppointment = await prisma.appointment.findFirst({
            where: { id, userId }
        })

        if (!existingAppointment) {
            return NextResponse.json({ error: "Appointment not found" }, { status: 404 })
        }

        const appointment = await prisma.appointment.update({
            where: { id },
            data: {
                status,
                meetingLink
            },
            include: { appointmentType: true }
        })

        return NextResponse.json(appointment)
    } catch (error) {
        console.error("Error updating appointment:", error)
        return NextResponse.json({ error: "Failed to update appointment" }, { status: 500 })
    }
}

// DELETE appointment
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

        const existingAppointment = await prisma.appointment.findFirst({
            where: { id, userId }
        })

        if (!existingAppointment) {
            return NextResponse.json({ error: "Appointment not found" }, { status: 404 })
        }

        await prisma.appointment.delete({
            where: { id }
        })

        return NextResponse.json({ message: "Appointment deleted" })
    } catch (error) {
        console.error("Error deleting appointment:", error)
        return NextResponse.json({ error: "Failed to delete appointment" }, { status: 500 })
    }
}

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { createAuditLog } from "@/lib/audit"
import { appointmentCancelledEmail, sendEmail } from "@/lib/email"
import { sendWebhook } from "@/lib/webhook"
import { format } from "date-fns"

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

        // (#4) Audit log
        const auditAction = status === "CONFIRMED"
            ? "APPOINTMENT_CONFIRM" as const
            : status === "CANCELLED"
                ? "APPOINTMENT_CANCEL" as const
                : "APPOINTMENT_UPDATE" as const

        await createAuditLog({
            action: auditAction,
            entity: "Appointment",
            entityId: id,
            details: {
                title: appointment.title,
                previousStatus: existingAppointment.status,
                newStatus: status,
            },
            userId,
        })

        // Send email & webhook notifications based on status change (non-blocking)
        if (status === "CONFIRMED") {
            // Notify guest that appointment is confirmed
            sendEmail({
                to: appointment.guestEmail,
                subject: `Appointment Confirmed: ${appointment.title}`,
                html: `<div style="font-family:sans-serif;color:#e2e8f0;background:#0f172a;padding:32px;border-radius:12px;">
                    <h2 style="color:#818cf8;">✅ Appointment Confirmed</h2>
                    <p>Your appointment <strong>${appointment.title}</strong> has been confirmed.</p>
                    <p><strong>When:</strong> ${new Date(appointment.start).toLocaleString()}</p>
                    ${appointment.meetingLink ? `<p><strong>Meeting Link:</strong> <a href="${appointment.meetingLink}" style="color:#818cf8;">${appointment.meetingLink}</a></p>` : ""}
                    <p style="color:#64748b;margin-top:24px;font-size:12px;">This is an automated message.</p>
                </div>`,
            }).catch(err => console.error("Failed to send confirmation email:", err))

            sendWebhook("appointment.confirmed", {
                id: appointment.id,
                title: appointment.title,
                start: appointment.start,
                end: appointment.end,
                guestEmail: appointment.guestEmail,
                guestName: appointment.guestName,
                status: "CONFIRMED",
            }).catch(err => console.error("Failed to send webhook:", err))
        } else if (status === "CANCELLED") {
            const cancelEmail = appointmentCancelledEmail({
                recipientName: appointment.guestName,
                title: appointment.title,
                date: format(new Date(appointment.start), "MMMM d, yyyy"),
                time: format(new Date(appointment.start), "h:mm a"),
                cancelledBy: "the host",
            })
            sendEmail({
                to: appointment.guestEmail,
                subject: cancelEmail.subject,
                html: cancelEmail.html,
            }).catch(err => console.error("Failed to send cancellation email:", err))

            sendWebhook("appointment.cancelled", {
                id: appointment.id,
                title: appointment.title,
                start: appointment.start,
                end: appointment.end,
                guestEmail: appointment.guestEmail,
                guestName: appointment.guestName,
                status: "CANCELLED",
            }).catch(err => console.error("Failed to send webhook:", err))
        }

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

        // (#4) Audit log
        await createAuditLog({
            action: "APPOINTMENT_DELETE",
            entity: "Appointment",
            entityId: id,
            details: {
                title: existingAppointment.title,
                guestEmail: existingAppointment.guestEmail,
            },
            userId,
        })

        return NextResponse.json({ message: "Appointment deleted" })
    } catch (error) {
        console.error("Error deleting appointment:", error)
        return NextResponse.json({ error: "Failed to delete appointment" }, { status: 500 })
    }
}

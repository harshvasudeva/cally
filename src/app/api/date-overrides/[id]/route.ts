import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { createAuditLog, getClientIp } from "@/lib/audit"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const userId = (session.user as { id: string }).id

    const { id } = await params

    const override = await prisma.dateOverride.findUnique({
      where: { id },
    })

    if (!override) {
      return NextResponse.json({ error: "Date override not found" }, { status: 404 })
    }

    if (override.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    await prisma.dateOverride.delete({
      where: { id },
    })

    await createAuditLog({
      action: "DATE_OVERRIDE_DELETE",
      entity: "DateOverride",
      entityId: id,
      details: { date: override.date.toISOString(), reason: override.reason },
      ipAddress: getClientIp(request),
      userAgent: request.headers.get("user-agent") || undefined,
      userId,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting date override:", error)
    return NextResponse.json({ error: "Failed to delete date override" }, { status: 500 })
  }
}

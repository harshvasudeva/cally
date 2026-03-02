import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { createAuditLog, getClientIp } from "@/lib/audit"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const userId = (session.user as { id: string }).id
    const { id } = await params

    const body = await request.json()
    const { name, color, isActive } = body

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (color !== undefined) updateData.color = color
    if (isActive !== undefined) updateData.isActive = isActive

    const stream = await prisma.calendarStream.updateMany({
      where: { id, userId },
      data: updateData,
    })

    if (stream.count === 0) {
      return NextResponse.json({ error: "Stream not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating stream:", error)
    return NextResponse.json({ error: "Failed to update stream" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const userId = (session.user as { id: string }).id
    const { id } = await params

    const result = await prisma.calendarStream.deleteMany({
      where: { id, userId },
    })

    if (result.count === 0) {
      return NextResponse.json({ error: "Stream not found" }, { status: 404 })
    }

    await createAuditLog({
      action: "STREAM_DELETE",
      entity: "CalendarStream",
      entityId: id,
      details: {},
      ipAddress: getClientIp(request),
      userAgent: request.headers.get("user-agent") || undefined,
      userId,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting stream:", error)
    return NextResponse.json({ error: "Failed to delete stream" }, { status: 500 })
  }
}

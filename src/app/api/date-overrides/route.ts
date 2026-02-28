import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { createAuditLog, getClientIp } from "@/lib/audit"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const userId = (session.user as { id: string }).id

    const overrides = await prisma.dateOverride.findMany({
      where: { userId },
      orderBy: { date: "asc" },
    })

    return NextResponse.json(overrides)
  } catch (error) {
    console.error("Error fetching date overrides:", error)
    return NextResponse.json({ error: "Failed to fetch date overrides" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const userId = (session.user as { id: string }).id

    const body = await request.json()
    const { date, isBlocked, startTime, endTime, reason } = body

    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 })
    }

    const parsedDate = new Date(date)
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: "Invalid date string" }, { status: 400 })
    }

    // If not blocked, start and end times should be provided
    if (isBlocked === false && (!startTime || !endTime)) {
      return NextResponse.json(
        { error: "startTime and endTime are required for custom hours" },
        { status: 400 }
      )
    }

    const override = await prisma.dateOverride.create({
      data: {
        date: parsedDate,
        isBlocked: isBlocked ?? true,
        startTime: startTime || null,
        endTime: endTime || null,
        reason: reason || null,
        userId,
      },
    })

    await createAuditLog({
      action: "DATE_OVERRIDE_CREATE",
      entity: "DateOverride",
      entityId: override.id,
      details: { date, isBlocked: isBlocked ?? true, reason },
      ipAddress: getClientIp(request),
      userAgent: request.headers.get("user-agent") || undefined,
      userId,
    })

    return NextResponse.json(override, { status: 201 })
  } catch (error) {
    console.error("Error creating date override:", error)

    // Handle unique constraint violation (duplicate date for same user)
    if (
      error instanceof Error &&
      error.message.includes("Unique constraint")
    ) {
      return NextResponse.json(
        { error: "A date override already exists for this date" },
        { status: 409 }
      )
    }

    return NextResponse.json({ error: "Failed to create date override" }, { status: 500 })
  }
}

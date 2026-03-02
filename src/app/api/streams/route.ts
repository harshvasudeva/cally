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

    const streams = await prisma.calendarStream.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(streams)
  } catch (error) {
    console.error("Error fetching streams:", error)
    return NextResponse.json({ error: "Failed to fetch streams" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const userId = (session.user as { id: string }).id

    const body = await request.json()
    const { name, url, color, category } = body

    if (!name || !url) {
      return NextResponse.json({ error: "Name and URL are required" }, { status: 400 })
    }

    // Basic URL validation
    try {
      new URL(url)
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 })
    }

    // Validate category
    const validCategories = ["sports", "holidays", "other"]
    const cat = validCategories.includes(category) ? category : "other"

    const stream = await prisma.calendarStream.create({
      data: {
        name,
        url,
        color: color || "#6366f1",
        category: cat,
        userId,
      },
    })

    await createAuditLog({
      action: "STREAM_CREATE",
      entity: "CalendarStream",
      entityId: stream.id,
      details: { name, url, category: cat },
      ipAddress: getClientIp(request),
      userAgent: request.headers.get("user-agent") || undefined,
      userId,
    })

    return NextResponse.json(stream, { status: 201 })
  } catch (error) {
    console.error("Error creating stream:", error)

    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "You've already added this calendar URL" },
        { status: 409 }
      )
    }

    return NextResponse.json({ error: "Failed to create stream" }, { status: 500 })
  }
}

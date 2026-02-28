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

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        timezone: true,
        slug: true,
        avatarUrl: true,
        image: true,
        theme: true,
        onboardingCompleted: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error("Error fetching profile:", error)
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
  }
}

// Support both PUT and PATCH
async function handleUpdate(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const userId = (session.user as { id: string }).id

    const body = await request.json()
    const { name, timezone, theme, onboardingCompleted } = body

    // Validate timezone if provided
    if (timezone !== undefined) {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: timezone })
      } catch {
        return NextResponse.json({ error: "Invalid IANA timezone string" }, { status: 400 })
      }
    }

    // Validate theme if provided
    if (theme !== undefined && !["light", "dark", "system"].includes(theme)) {
      return NextResponse.json(
        { error: "Invalid theme. Must be one of: light, dark, system" },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (timezone !== undefined) updateData.timezone = timezone
    if (theme !== undefined) updateData.theme = theme
    if (onboardingCompleted !== undefined) updateData.onboardingCompleted = onboardingCompleted

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        timezone: true,
        slug: true,
        avatarUrl: true,
        image: true,
        theme: true,
        onboardingCompleted: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    await createAuditLog({
      action: "SETTING_CHANGE",
      entity: "User",
      entityId: userId,
      details: { changedFields: Object.keys(updateData) },
      ipAddress: getClientIp(request),
      userAgent: request.headers.get("user-agent") || undefined,
      userId,
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error("Error updating profile:", error)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}

export const PUT = handleUpdate
export const PATCH = handleUpdate

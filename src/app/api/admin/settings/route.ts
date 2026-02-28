import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { createAuditLog, getClientIp } from "@/lib/audit"
import { rateLimit, getRateLimitHeaders } from "@/lib/rate-limit"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const role = (session.user as { role: string }).role
    if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const rl = rateLimit((session.user as { id: string }).id, "admin")
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: getRateLimitHeaders(rl) }
      )
    }

    let settings = await prisma.settings.findFirst()

    if (!settings) {
      settings = await prisma.settings.create({ data: {} })
    }

    // Mask sensitive fields
    const masked = {
      ...settings,
      smtpPass: settings.smtpPass ? "••••••••" : null,
      discordBotToken: settings.discordBotToken ? "••••••••" : null,
    }

    return NextResponse.json(masked)
  } catch (error) {
    console.error("Error fetching settings:", error)
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const role = (session.user as { role: string }).role
    if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const userId = (session.user as { id: string }).id

    const rl = rateLimit(userId, "admin")
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: getRateLimitHeaders(rl) }
      )
    }

    const body = await request.json()

    let settings = await prisma.settings.findFirst()
    if (!settings) {
      settings = await prisma.settings.create({ data: {} })
    }

    // Build update data, excluding masked values that haven't changed
    const updateData: Record<string, unknown> = {}
    const allowedFields = [
      "siteName",
      "siteDescription",
      "primaryColor",
      "emailFrom",
      "smtpHost",
      "smtpPort",
      "smtpUser",
      "smtpPass",
      "discordBotToken",
      "discordClientId",
      "allowRegistration",
      "maxLoginAttempts",
      "lockoutDuration",
      "maintenanceMode",
    ]

    for (const field of allowedFields) {
      if (field in body) {
        // Skip masked values being sent back unchanged
        if ((field === "smtpPass" || field === "discordBotToken") && body[field] === "••••••••") {
          continue
        }
        updateData[field] = body[field]
      }
    }

    const updated = await prisma.settings.update({
      where: { id: settings.id },
      data: updateData,
    })

    await createAuditLog({
      action: "SETTING_CHANGE",
      entity: "Settings",
      entityId: settings.id,
      details: { changedFields: Object.keys(updateData) },
      ipAddress: getClientIp(request),
      userAgent: request.headers.get("user-agent") || undefined,
      userId,
    })

    // Mask sensitive fields in the response
    const masked = {
      ...updated,
      smtpPass: updated.smtpPass ? "••••••••" : null,
      discordBotToken: updated.discordBotToken ? "••••••••" : null,
    }

    return NextResponse.json(masked)
  } catch (error) {
    console.error("Error updating settings:", error)
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 })
  }
}

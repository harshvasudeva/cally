import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { createAuditLog } from "@/lib/audit"
import { format } from "date-fns"
import fs from "fs/promises"
import path from "path"

// POST - Create a backup of the database
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const role = (session.user as { role?: string }).role
        if (role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const userId = (session.user as { id: string }).id
        const backupDir = path.join(process.cwd(), "backups")
        await fs.mkdir(backupDir, { recursive: true })

        const timestamp = format(new Date(), "yyyy-MM-dd_HH-mm-ss")
        const backupPath = path.join(backupDir, `cally-backup-${timestamp}.json`)

        // Export all data
        const [users, appointments, events, appointmentTypes, availability, dateOverrides, settings, auditLogs] =
            await Promise.all([
                prisma.user.findMany({
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        role: true,
                        slug: true,
                        timezone: true,
                        theme: true,
                        onboardingCompleted: true,
                        createdAt: true,
                    },
                }),
                prisma.appointment.findMany({ include: { appointmentType: { select: { name: true } } } }),
                prisma.event.findMany(),
                prisma.appointmentType.findMany(),
                prisma.availability.findMany(),
                prisma.dateOverride.findMany(),
                prisma.settings.findMany(),
                prisma.auditLog.findMany({ take: 1000, orderBy: { createdAt: "desc" } }),
            ])

        const backup = {
            version: "1.0.0",
            createdAt: new Date().toISOString(),
            createdBy: session.user.email,
            data: {
                users,
                appointments,
                events,
                appointmentTypes,
                availability,
                dateOverrides,
                settings,
                auditLogs,
            },
        }

        await fs.writeFile(backupPath, JSON.stringify(backup, null, 2))

        await createAuditLog({
            action: "BACKUP_CREATE",
            entity: "System",
            details: { path: backupPath, timestamp },
            userId,
        })

        return NextResponse.json({
            message: "Backup created successfully",
            path: backupPath,
            timestamp,
            size: JSON.stringify(backup).length,
        })
    } catch (error) {
        console.error("Backup error:", error)
        return NextResponse.json({ error: "Failed to create backup" }, { status: 500 })
    }
}

// GET - List available backups
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const role = (session.user as { role?: string }).role
        if (role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const backupDir = path.join(process.cwd(), "backups")

        try {
            const files = await fs.readdir(backupDir)
            const backups = await Promise.all(
                files
                    .filter((f) => f.endsWith(".json"))
                    .map(async (f) => {
                        const stat = await fs.stat(path.join(backupDir, f))
                        return {
                            filename: f,
                            size: stat.size,
                            createdAt: stat.birthtime.toISOString(),
                        }
                    })
            )

            return NextResponse.json(
                backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            )
        } catch {
            return NextResponse.json([])
        }
    } catch (error) {
        console.error("Error listing backups:", error)
        return NextResponse.json({ error: "Failed to list backups" }, { status: 500 })
    }
}

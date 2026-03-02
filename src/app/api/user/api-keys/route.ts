import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { createAuditLog } from "@/lib/audit"
import bcrypt from "bcryptjs"
import crypto from "crypto"

// GET - List user's API keys
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const userId = (session.user as { id: string }).id

        const keys = await prisma.apiKey.findMany({
            where: { userId },
            select: {
                id: true,
                name: true,
                keyPrefix: true,
                permissions: true,
                lastUsedAt: true,
                expiresAt: true,
                createdAt: true,
            },
            orderBy: { createdAt: "desc" },
        })

        return NextResponse.json(keys)
    } catch (error) {
        console.error("Error listing API keys:", error)
        return NextResponse.json({ error: "Failed to list API keys" }, { status: 500 })
    }
}

// POST - Create a new API key
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const userId = (session.user as { id: string }).id
        const body = await request.json()
        const { name, permissions = "read", expiresIn } = body

        if (!name || name.length < 2 || name.length > 50) {
            return NextResponse.json({ error: "Name must be 2-50 characters" }, { status: 400 })
        }

        if (!["read", "write", "admin"].includes(permissions)) {
            return NextResponse.json({ error: "Invalid permissions" }, { status: 400 })
        }

        // Check if admin permissions require admin role
        if (permissions === "admin") {
            const role = (session.user as { role?: string }).role
            if (role !== "ADMIN") {
                return NextResponse.json({ error: "Only admins can create admin keys" }, { status: 403 })
            }
        }

        // Generate the API key
        const rawKey = `cally_${crypto.randomBytes(32).toString("hex")}`
        const keyPrefix = rawKey.substring(0, 14) // "cally_" + 8 hex chars
        const keyHash = await bcrypt.hash(rawKey, 10)

        let expiresAt = null
        if (expiresIn) {
            expiresAt = new Date()
            expiresAt.setDate(expiresAt.getDate() + parseInt(expiresIn))
        }

        const apiKey = await prisma.apiKey.create({
            data: {
                name,
                keyHash,
                keyPrefix,
                permissions,
                expiresAt,
                userId,
            },
        })

        await createAuditLog({
            action: "API_KEY_CREATE",
            entity: "ApiKey",
            entityId: apiKey.id,
            details: { name, permissions, expiresAt },
            userId,
        })

        // Return the raw key ONCE - it cannot be retrieved again
        return NextResponse.json({
            id: apiKey.id,
            name: apiKey.name,
            key: rawKey,
            keyPrefix,
            permissions,
            expiresAt,
            message: "Save this key securely. It cannot be shown again.",
        }, { status: 201 })
    } catch (error) {
        console.error("Error creating API key:", error)
        return NextResponse.json({ error: "Failed to create API key" }, { status: 500 })
    }
}

// DELETE - Revoke an API key
export async function DELETE(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const userId = (session.user as { id: string }).id
        const { searchParams } = new URL(request.url)
        const keyId = searchParams.get("id")

        if (!keyId) {
            return NextResponse.json({ error: "Key ID required" }, { status: 400 })
        }

        const key = await prisma.apiKey.findFirst({
            where: { id: keyId, userId },
        })

        if (!key) {
            return NextResponse.json({ error: "API key not found" }, { status: 404 })
        }

        await prisma.apiKey.delete({ where: { id: keyId } })

        await createAuditLog({
            action: "API_KEY_REVOKE",
            entity: "ApiKey",
            entityId: keyId,
            details: { name: key.name },
            userId,
        })

        return NextResponse.json({ message: "API key revoked" })
    } catch (error) {
        console.error("Error revoking API key:", error)
        return NextResponse.json({ error: "Failed to revoke API key" }, { status: 500 })
    }
}

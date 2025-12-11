import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"

// GET all appointment types for the current user
export async function GET() {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const userId = (session.user as { id: string }).id

        const appointmentTypes = await prisma.appointmentType.findMany({
            where: { userId },
            orderBy: { createdAt: "asc" }
        })

        return NextResponse.json(appointmentTypes)
    } catch (error) {
        console.error("Error fetching appointment types:", error)
        return NextResponse.json({ error: "Failed to fetch appointment types" }, { status: 500 })
    }
}

// POST create new appointment type
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions)

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const userId = (session.user as { id: string }).id
        const body = await request.json()
        const { name, duration, bufferBefore, bufferAfter, color, description, location, formFields } = body

        if (!name || !duration) {
            return NextResponse.json({ error: "Name and duration are required" }, { status: 400 })
        }

        // Generate unique slug
        const baseSlug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
        let slug = baseSlug
        let counter = 1

        while (await prisma.appointmentType.findFirst({ where: { userId, slug } })) {
            slug = `${baseSlug}-${counter}`
            counter++
        }

        const appointmentType = await prisma.appointmentType.create({
            data: {
                name,
                slug,
                duration,
                bufferBefore: bufferBefore || 0,
                bufferAfter: bufferAfter || 0,
                color: color || "#8b5cf6",
                description,
                location,
                formFields: formFields ? JSON.stringify(formFields) : null,
                userId
            }
        })

        return NextResponse.json(appointmentType, { status: 201 })
    } catch (error) {
        console.error("Error creating appointment type:", error)
        return NextResponse.json({ error: "Failed to create appointment type" }, { status: 500 })
    }
}

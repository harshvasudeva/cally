import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import prisma from "@/lib/prisma"
import { v4 as uuidv4 } from "uuid"

export async function POST(request: NextRequest) {
    try {
        const { email, password, name } = await request.json()

        if (!email || !password || !name) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            )
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        })

        if (existingUser) {
            return NextResponse.json(
                { error: "User already exists" },
                { status: 400 }
            )
        }

        // Check if registration is allowed
        const settings = await prisma.settings.findFirst()
        if (settings && !settings.allowRegistration) {
            return NextResponse.json(
                { error: "Registration is currently disabled" },
                { status: 403 }
            )
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12)

        // Generate unique slug from name
        const baseSlug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
        let slug = baseSlug
        let counter = 1

        while (await prisma.user.findUnique({ where: { slug } })) {
            slug = `${baseSlug}-${counter}`
            counter++
        }

        // Check if this is the first user (make them admin)
        const userCount = await prisma.user.count()
        const role = userCount === 0 ? "ADMIN" : "USER"

        // Create user
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                slug,
                role,
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
            }
        })

        // Create default availability (Mon-Fri 9am-5pm)
        const defaultAvailability = [1, 2, 3, 4, 5].map((day) => ({
            dayOfWeek: day,
            startTime: "09:00",
            endTime: "17:00",
            userId: user.id
        }))

        await prisma.availability.createMany({
            data: defaultAvailability
        })

        // Create default appointment type
        await prisma.appointmentType.create({
            data: {
                name: "30 Minute Meeting",
                slug: "30min",
                duration: 30,
                color: "#3b82f6",
                description: "A 30 minute meeting",
                userId: user.id
            }
        })

        // Create settings if first user
        if (userCount === 0) {
            await prisma.settings.create({
                data: {}
            })
        }

        return NextResponse.json(
            { message: "User created successfully", userId: user.id },
            { status: 201 }
        )
    } catch (error) {
        console.error("Registration error:", error)
        return NextResponse.json(
            { error: "Something went wrong" },
            { status: 500 }
        )
    }
}

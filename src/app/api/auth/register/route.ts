import { NextRequest, NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { rateLimit, getRateLimitHeaders } from "@/lib/rate-limit"
import { createAuditLog, getClientIp } from "@/lib/audit"
import { sanitizeString } from "@/lib/sanitize"

// Password policy: min 8 chars, uppercase, lowercase, number
function validatePassword(password: string): { valid: boolean; message: string } {
  if (password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters long" }
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: "Password must contain at least one uppercase letter" }
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: "Password must contain at least one lowercase letter" }
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: "Password must contain at least one number" }
  }
  if (password.length > 128) {
    return { valid: false, message: "Password must be 128 characters or fewer" }
  }
  return { valid: true, message: "" }
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)

    // Rate limit registration attempts
    const rl = rateLimit(ip, "auth")
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many registration attempts. Please try again later." },
        { status: 429, headers: getRateLimitHeaders(rl) }
      )
    }

    // Check if registration is allowed
    const settings = await prisma.settings.findFirst()
    if (settings && !settings.allowRegistration) {
      return NextResponse.json(
        { error: "Registration is currently disabled." },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, email, password } = body

    // Validate required fields
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required." },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const cleanEmail = email.trim().toLowerCase()
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      )
    }

    // Validate password policy
    const passwordCheck = validatePassword(password)
    if (!passwordCheck.valid) {
      return NextResponse.json(
        { error: passwordCheck.message },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    })
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Generate unique slug from name
    const sanitizedName = sanitizeString(name)
    const baseSlug = sanitizedName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .substring(0, 30) || "user"

    let slug = baseSlug
    let counter = 1
    while (await prisma.user.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`
      counter++
    }

    // First user becomes admin
    const userCount = await prisma.user.count()
    const role = userCount === 0 ? "ADMIN" : "USER"

    // Create user
    const user = await prisma.user.create({
      data: {
        name: sanitizedName,
        email: cleanEmail,
        password: hashedPassword,
        slug,
        role,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      },
    })

    // Create default availability (Mon-Fri 9-17)
    await prisma.availability.createMany({
      data: [1, 2, 3, 4, 5].map((d) => ({
        userId: user.id,
        dayOfWeek: d,
        startTime: "09:00",
        endTime: "17:00",
      })),
    })

    // Create default appointment type
    await prisma.appointmentType.create({
      data: {
        name: "30 Minute Meeting",
        slug: "30min",
        duration: 30,
        userId: user.id,
      },
    })

    // Audit log
    await createAuditLog({
      action: "REGISTER",
      entity: "User",
      entityId: user.id,
      details: { email: cleanEmail, role },
      ipAddress: ip,
      userAgent: request.headers.get("user-agent") || undefined,
      userId: user.id,
    })

    return NextResponse.json(
      {
        message: "Account created successfully.",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          slug: user.slug,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    )
  }
}

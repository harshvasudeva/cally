// Register endpoint — delegates to better-auth's sign-up under the hood
// while preserving Cally's existing post-signup setup (slug, default
// availability, default appointment type, audit log).
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { rateLimit, getRateLimitHeaders } from "@/lib/rate-limit";
import { createAuditLog, getClientIp } from "@/lib/audit";
import { sanitizeString } from "@/lib/sanitize";

function validatePassword(password: string): { valid: boolean; message: string } {
  if (password.length < 8) return { valid: false, message: "Password must be at least 8 characters long" };
  if (!/[A-Z]/.test(password)) return { valid: false, message: "Password must contain at least one uppercase letter" };
  if (!/[a-z]/.test(password)) return { valid: false, message: "Password must contain at least one lowercase letter" };
  if (!/[0-9]/.test(password)) return { valid: false, message: "Password must contain at least one number" };
  if (password.length > 128) return { valid: false, message: "Password must be 128 characters or fewer" };
  return { valid: true, message: "" };
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);

    const rl = rateLimit(ip, "auth");
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many registration attempts. Please try again later." },
        { status: 429, headers: getRateLimitHeaders(rl) },
      );
    }

    const settings = await prisma.settings.findFirst();
    if (settings && !settings.allowRegistration) {
      return NextResponse.json({ error: "Registration is currently disabled." }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, password } = body as { name?: string; email?: string; password?: string };

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email, and password are required." }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      return NextResponse.json({ error: passwordCheck.message }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existingUser) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    const sanitizedName = sanitizeString(name);

    // Delegate to better-auth (handles password hashing + Account row)
    const signupRes = await auth.api.signUpEmail({
      body: { email: cleanEmail, password, name: sanitizedName },
      headers: request.headers,
      asResponse: false,
    });

    if (!signupRes || !("user" in signupRes)) {
      return NextResponse.json({ error: "Registration failed." }, { status: 500 });
    }

    const newUser = signupRes.user as { id: string; email: string; name: string | null };

    // Generate unique slug from name
    const baseSlug =
      sanitizedName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .substring(0, 30) || "user";
    let slug = baseSlug;
    let counter = 1;
    while (await prisma.user.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // First user becomes admin
    const userCount = await prisma.user.count();
    const role = userCount === 1 ? "ADMIN" : "USER";

    // Wrap post-signup setup in a single transaction so failures don't leave
    // an inconsistent user (no slug, no availability, no appointment type).
    await prisma.$transaction([
      prisma.user.update({
        where: { id: newUser.id },
        data: { slug, role, timezone: "UTC" },
      }),
      prisma.availability.createMany({
        data: [1, 2, 3, 4, 5].map((d) => ({
          userId: newUser.id,
          dayOfWeek: d,
          startTime: "09:00",
          endTime: "17:00",
        })),
      }),
      prisma.appointmentType.create({
        data: { name: "30 Minute Meeting", slug: "30min", duration: 30, userId: newUser.id },
      }),
    ]);

    await createAuditLog({
      action: "REGISTER",
      entity: "User",
      entityId: newUser.id,
      details: { email: cleanEmail, role },
      ipAddress: ip,
      userAgent: request.headers.get("user-agent") || undefined,
      userId: newUser.id,
    });

    return NextResponse.json(
      {
        message: "Account created successfully.",
        user: { id: newUser.id, email: newUser.email, name: newUser.name, role, slug },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Registration error:", error);
    const msg = error instanceof Error ? error.message : "An unexpected error occurred.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { testSmtp, sendEmail, testEmail, invalidateEmailCache } from "@/lib/email"
import prisma from "@/lib/prisma"

// POST test SMTP configuration
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const role = (session.user as { role: string }).role
    if (role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    // Invalidate cache to pick up any new settings
    invalidateEmailCache()

    // Test SMTP connection
    const result = await testSmtp()
    if (!result.success) {
      return NextResponse.json(
        { error: `SMTP connection failed: ${result.error}` },
        { status: 400 }
      )
    }

    // Send test email to admin
    const settings = await prisma.settings.findFirst()
    const email = testEmail(settings?.siteName || "Cally")
    const adminEmail = session.user.email
    if (adminEmail) {
      await sendEmail({
        to: adminEmail,
        subject: email.subject,
        html: email.html,
      })
    }

    return NextResponse.json({ message: "Test email sent successfully" })
  } catch (error) {
    console.error("SMTP test error:", error)
    return NextResponse.json({ error: "SMTP test failed" }, { status: 500 })
  }
}

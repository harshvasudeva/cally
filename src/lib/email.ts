// Email notification system
// Sends appointment confirmations, reminders, and admin alerts

import nodemailer from "nodemailer"
import prisma from "./prisma"

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

// Create transporter from DB settings (cached per settings update)
let cachedTransporter: nodemailer.Transporter | null = null
let cachedSettingsId: string | null = null

async function getTransporter(): Promise<nodemailer.Transporter | null> {
  const settings = await prisma.settings.findFirst()
  if (!settings?.smtpHost || !settings?.smtpPort) {
    return null
  }

  // Reuse if settings haven't changed
  if (cachedTransporter && cachedSettingsId === settings.id) {
    return cachedTransporter
  }

  cachedTransporter = nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.smtpPort === 465,
    auth:
      settings.smtpUser && settings.smtpPass
        ? { user: settings.smtpUser, pass: settings.smtpPass }
        : undefined,
  })

  cachedSettingsId = settings.id
  return cachedTransporter
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const transporter = await getTransporter()
    if (!transporter) {
      console.warn("[email] SMTP not configured, skipping email to:", options.to)
      return false
    }

    const settings = await prisma.settings.findFirst()
    const from = settings?.emailFrom || "noreply@cally.local"

    await transporter.sendMail({
      from: `"${settings?.siteName || "Cally"}" <${from}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ""),
    })

    console.log("[email] Sent to:", options.to, "Subject:", options.subject)
    return true
  } catch (error) {
    console.error("[email] Failed to send:", error)
    return false
  }
}

export async function testSmtp(): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = await getTransporter()
    if (!transporter) {
      return { success: false, error: "SMTP not configured" }
    }
    await transporter.verify()
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// Invalidate cached transporter when settings change
export function invalidateEmailCache(): void {
  cachedTransporter = null
  cachedSettingsId = null
}

// ============================================================================
// Email Templates
// ============================================================================

function baseTemplate(content: string, siteName: string = "Cally"): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #0f172a; color: #e2e8f0; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .card { background: #1e293b; border-radius: 16px; padding: 32px; border: 1px solid #334155; }
    .logo { text-align: center; margin-bottom: 24px; }
    .logo span { font-size: 24px; font-weight: 700; color: #818cf8; }
    h1 { color: #f1f5f9; font-size: 20px; margin: 0 0 16px; }
    p { color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 12px; }
    .detail { display: flex; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px solid #334155; }
    .detail-label { color: #64748b; font-size: 12px; text-transform: uppercase; font-weight: 600; min-width: 80px; }
    .detail-value { color: #e2e8f0; font-size: 14px; }
    .btn { display: inline-block; padding: 12px 24px; background: #6366f1; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; margin-top: 16px; }
    .footer { text-align: center; margin-top: 24px; font-size: 12px; color: #475569; }
    .status-confirmed { color: #22c55e; font-weight: 600; }
    .status-cancelled { color: #ef4444; font-weight: 600; }
    .status-pending { color: #f59e0b; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="logo"><span>📅 ${siteName}</span></div>
      ${content}
    </div>
    <div class="footer">
      Sent by ${siteName} — Self-Hosted Scheduling
    </div>
  </div>
</body>
</html>`
}

export function appointmentConfirmationEmail(data: {
  guestName: string
  hostName: string
  title: string
  date: string
  time: string
  duration: number
  bookingLink?: string
  siteName?: string
}): { subject: string; html: string } {
  const content = `
    <h1>Appointment Confirmed ✅</h1>
    <p>Hi ${data.guestName},</p>
    <p>Your appointment with <strong>${data.hostName}</strong> has been confirmed.</p>
    <div style="margin: 20px 0;">
      <div class="detail">
        <span class="detail-label">Event</span>
        <span class="detail-value">${data.title}</span>
      </div>
      <div class="detail">
        <span class="detail-label">Date</span>
        <span class="detail-value">${data.date}</span>
      </div>
      <div class="detail">
        <span class="detail-label">Time</span>
        <span class="detail-value">${data.time}</span>
      </div>
      <div class="detail">
        <span class="detail-label">Duration</span>
        <span class="detail-value">${data.duration} minutes</span>
      </div>
    </div>
    <p>If you need to reschedule or cancel, please contact ${data.hostName}.</p>`

  return {
    subject: `Confirmed: ${data.title} with ${data.hostName}`,
    html: baseTemplate(content, data.siteName),
  }
}

export function appointmentRequestEmail(data: {
  hostName: string
  guestName: string
  guestEmail: string
  title: string
  date: string
  time: string
  dashboardLink: string
  siteName?: string
}): { subject: string; html: string } {
  const content = `
    <h1>New Booking Request 📬</h1>
    <p>Hi ${data.hostName},</p>
    <p><strong>${data.guestName}</strong> (${data.guestEmail}) requested an appointment.</p>
    <div style="margin: 20px 0;">
      <div class="detail">
        <span class="detail-label">Event</span>
        <span class="detail-value">${data.title}</span>
      </div>
      <div class="detail">
        <span class="detail-label">Date</span>
        <span class="detail-value">${data.date}</span>
      </div>
      <div class="detail">
        <span class="detail-label">Time</span>
        <span class="detail-value">${data.time}</span>
      </div>
    </div>
    <a href="${data.dashboardLink}" class="btn">Review Request</a>`

  return {
    subject: `New booking: ${data.guestName} — ${data.title}`,
    html: baseTemplate(content, data.siteName),
  }
}

export function appointmentCancelledEmail(data: {
  recipientName: string
  title: string
  date: string
  time: string
  cancelledBy: string
  siteName?: string
}): { subject: string; html: string } {
  const content = `
    <h1>Appointment Cancelled ❌</h1>
    <p>Hi ${data.recipientName},</p>
    <p>The following appointment has been cancelled by ${data.cancelledBy}:</p>
    <div style="margin: 20px 0;">
      <div class="detail">
        <span class="detail-label">Event</span>
        <span class="detail-value">${data.title}</span>
      </div>
      <div class="detail">
        <span class="detail-label">Date</span>
        <span class="detail-value">${data.date}</span>
      </div>
      <div class="detail">
        <span class="detail-label">Time</span>
        <span class="detail-value">${data.time}</span>
      </div>
    </div>`

  return {
    subject: `Cancelled: ${data.title}`,
    html: baseTemplate(content, data.siteName),
  }
}

export function appointmentReminderEmail(data: {
  recipientName: string
  title: string
  date: string
  time: string
  hoursUntil: number
  siteName?: string
}): { subject: string; html: string } {
  const content = `
    <h1>Reminder: Upcoming Appointment ⏰</h1>
    <p>Hi ${data.recipientName},</p>
    <p>You have an appointment in <strong>${data.hoursUntil} hour(s)</strong>.</p>
    <div style="margin: 20px 0;">
      <div class="detail">
        <span class="detail-label">Event</span>
        <span class="detail-value">${data.title}</span>
      </div>
      <div class="detail">
        <span class="detail-label">Date</span>
        <span class="detail-value">${data.date}</span>
      </div>
      <div class="detail">
        <span class="detail-label">Time</span>
        <span class="detail-value">${data.time}</span>
      </div>
    </div>`

  return {
    subject: `Reminder: ${data.title} in ${data.hoursUntil}h`,
    html: baseTemplate(content, data.siteName),
  }
}

export function verificationEmail(data: {
  name: string
  verifyLink: string
  siteName?: string
}): { subject: string; html: string } {
  const content = `
    <h1>Verify Your Email 📧</h1>
    <p>Hi ${data.name},</p>
    <p>Please verify your email address to complete your registration.</p>
    <a href="${data.verifyLink}" class="btn">Verify Email</a>
    <p style="margin-top: 16px;">This link expires in 24 hours. If you didn't create an account, ignore this email.</p>`

  return {
    subject: `Verify your ${data.siteName || "Cally"} account`,
    html: baseTemplate(content, data.siteName),
  }
}

export function testEmail(siteName?: string): { subject: string; html: string } {
  const content = `
    <h1>Test Email ✅</h1>
    <p>This is a test email from your ${siteName || "Cally"} instance.</p>
    <p>Your SMTP configuration is working correctly!</p>
    <p style="color: #22c55e; font-weight: 600;">All systems operational.</p>`

  return {
    subject: `[${siteName || "Cally"}] SMTP Test Successful`,
    html: baseTemplate(content, siteName),
  }
}

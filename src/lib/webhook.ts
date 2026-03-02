// Webhook notification system
// Sends HTTP POST requests to configured webhook URLs on events

import prisma from "./prisma"

export type WebhookEventType =
  | "appointment.created"
  | "appointment.confirmed"
  | "appointment.cancelled"
  | "appointment.updated"
  | "user.registered"
  | "settings.updated"

interface WebhookPayload {
  event: WebhookEventType
  timestamp: string
  data: Record<string, unknown>
}

export async function sendWebhook(
  event: WebhookEventType,
  data: Record<string, unknown>
): Promise<boolean> {
  try {
    const settings = await prisma.settings.findFirst()
    if (!settings?.webhookUrl) return false

    // Check if this event type is enabled
    if (settings.webhookEvents) {
      const enabledEvents: string[] = JSON.parse(settings.webhookEvents)
      if (!enabledEvents.includes(event)) return false
    }

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "Cally-Webhook/1.0",
    }

    // Sign payload with secret if configured
    if (settings.webhookSecret) {
      const crypto = await import("crypto")
      const signature = crypto
        .createHmac("sha256", settings.webhookSecret)
        .update(JSON.stringify(payload))
        .digest("hex")
      headers["X-Webhook-Signature"] = `sha256=${signature}`
    }

    const response = await fetch(settings.webhookUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000), // 10s timeout
    })

    if (!response.ok) {
      console.warn(`[webhook] ${event} → ${settings.webhookUrl} returned ${response.status}`)
      return false
    }

    console.log(`[webhook] ${event} sent successfully`)
    return true
  } catch (error) {
    console.error(`[webhook] Failed to send ${event}:`, error)
    return false
  }
}

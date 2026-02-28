// Audit logging (#4) - Record every administrative action

import prisma from "./prisma"

export type AuditAction =
  | "LOGIN"
  | "LOGIN_FAILED"
  | "LOGOUT"
  | "REGISTER"
  | "SETTING_CHANGE"
  | "USER_ROLE_CHANGE"
  | "USER_DELETE"
  | "APPOINTMENT_CREATE"
  | "APPOINTMENT_UPDATE"
  | "APPOINTMENT_DELETE"
  | "APPOINTMENT_CONFIRM"
  | "APPOINTMENT_CANCEL"
  | "EVENT_CREATE"
  | "EVENT_UPDATE"
  | "EVENT_DELETE"
  | "AVAILABILITY_UPDATE"
  | "APPOINTMENT_TYPE_CREATE"
  | "APPOINTMENT_TYPE_UPDATE"
  | "DATE_OVERRIDE_CREATE"
  | "DATE_OVERRIDE_DELETE"
  | "ACCOUNT_LOCKED"
  | "ACCOUNT_UNLOCKED"

interface AuditLogInput {
  action: AuditAction
  entity?: string
  entityId?: string
  details?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
  userId?: string
}

export async function createAuditLog(input: AuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        details: input.details ? JSON.stringify(input.details) : null,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        userId: input.userId,
      },
    })
  } catch (error) {
    // Never let audit logging break the main flow
    console.error("Failed to create audit log:", error)
  }
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    return forwarded.split(",")[0].trim()
  }
  return request.headers.get("x-real-ip") || "unknown"
}

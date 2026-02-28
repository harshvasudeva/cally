// Input sanitization (#16) - Prevent XSS in user-provided fields

const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;",
}

const ENTITY_REGEX = /[&<>"'/]/g

export function escapeHtml(str: string): string {
  return str.replace(ENTITY_REGEX, (char) => HTML_ENTITIES[char] || char)
}

export function sanitizeString(input: string | null | undefined): string {
  if (!input) return ""
  // Remove null bytes
  let sanitized = input.replace(/\0/g, "")
  // Escape HTML entities
  sanitized = escapeHtml(sanitized)
  // Trim excessive whitespace
  sanitized = sanitized.trim()
  return sanitized
}

export function sanitizeBookingInput(data: {
  guestName?: string
  guestEmail?: string
  guestPhone?: string
  guestNotes?: string
  negotiationNote?: string
}) {
  return {
    guestName: sanitizeString(data.guestName),
    guestEmail: data.guestEmail?.trim().toLowerCase() || "",
    guestPhone: sanitizeString(data.guestPhone),
    guestNotes: sanitizeString(data.guestNotes),
    negotiationNote: sanitizeString(data.negotiationNote),
  }
}

export function sanitizeEventInput(data: {
  title?: string
  description?: string
  location?: string
}) {
  return {
    title: sanitizeString(data.title),
    description: sanitizeString(data.description),
    location: sanitizeString(data.location),
  }
}

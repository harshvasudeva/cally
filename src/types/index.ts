export interface User {
    id: string
    email: string
    name: string
    role: "ADMIN" | "USER"
    timezone: string
    slug: string
    avatarUrl?: string
    theme?: "dark" | "light"
    onboardingCompleted?: boolean
    createdAt: string
    updatedAt: string
}

export interface Event {
    id: string
    title: string
    description?: string
    start: string
    end: string
    allDay: boolean
    color: string
    category?: string
    location?: string
    recurrence?: string
    userId: string
    createdAt: string
    updatedAt: string
}

export interface Availability {
    id: string
    dayOfWeek: number
    startTime: string
    endTime: string
    isActive: boolean
    userId: string
}

export interface Appointment {
    id: string
    title: string
    start: string
    end: string
    status: "PENDING" | "CONFIRMED" | "CANCELLED"
    guestEmail: string
    guestName: string
    guestPhone?: string
    guestNotes?: string
    formData?: string
    meetingLink?: string
    negotiationNote?: string
    originalTime?: string
    userId: string
    guestUserId?: string
    appointmentTypeId?: string
    appointmentType?: AppointmentType
    createdAt: string
    updatedAt: string
}

export interface AppointmentType {
    id: string
    name: string
    slug: string
    duration: number
    bufferBefore: number
    bufferAfter: number
    color: string
    description?: string
    location?: string
    formFields?: string
    isActive: boolean
    minNotice: number     // (#63) minutes
    maxPerDay: number     // (#64) 0 = unlimited
    userId: string
    createdAt: string
    updatedAt: string
}

export interface DateOverride {
    id: string
    date: string
    isBlocked: boolean
    startTime?: string
    endTime?: string
    reason?: string
    userId: string
    createdAt: string
}

export interface AuditLog {
    id: string
    action: string
    entity?: string
    entityId?: string
    details?: string
    ipAddress?: string
    userAgent?: string
    userId?: string
    user?: { id: string; name: string; email: string }
    createdAt: string
}

export interface TimeSlot {
    start: string
    end: string
}

export interface CalendarEvent {
    id: string
    title: string
    start: Date | string
    end: Date | string
    allDay?: boolean
    color?: string
    extendedProps?: {
        type: "event" | "appointment"
        description?: string
        status?: string
    }
}

export interface Settings {
    id: string
    siteName: string
    siteDescription: string
    primaryColor: string
    emailFrom?: string
    smtpHost?: string
    smtpPort?: number
    smtpUser?: string
    smtpPass?: string
    discordBotToken?: string
    discordClientId?: string
    allowRegistration: boolean
    maxLoginAttempts: number
    lockoutDuration: number
    maintenanceMode: boolean
}

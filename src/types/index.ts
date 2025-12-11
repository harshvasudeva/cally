export interface User {
    id: string
    email: string
    name: string
    role: "ADMIN" | "USER"
    timezone: string
    slug: string
    avatarUrl?: string
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
    userId: string
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
    userId: string
    createdAt: string
    updatedAt: string
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

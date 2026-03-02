"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import dynamic from "next/dynamic"
import { CalendarEvent, Event, Appointment } from "@/types"

// Code-split FullCalendar (~200KB) — only loaded client-side
const FullCalendar = dynamic(() => import("@fullcalendar/react"), { ssr: false, loading: () => <div className="flex items-center justify-center h-96"><div className="loading-spinner" /></div> })
import dayGridPlugin from "@fullcalendar/daygrid"
import timeGridPlugin from "@fullcalendar/timegrid"
import listPlugin from "@fullcalendar/list"
import interactionPlugin from "@fullcalendar/interaction"

interface CalendarViewProps {
    onEventClick?: (event: CalendarEvent) => void
    onDateSelect?: (start: Date, end: Date) => void
    onEventDrop?: (event: CalendarEvent, newStart: Date, newEnd: Date) => void
    refreshKey?: number
}

export default function CalendarView({
    onEventClick,
    onDateSelect,
    onEventDrop,
    refreshKey
}: CalendarViewProps) {
    const [events, setEvents] = useState<CalendarEvent[]>([])
    const [view, setView] = useState<"dayGridMonth" | "timeGridWeek" | "timeGridDay" | "listWeek">("dayGridMonth")
    const [loading, setLoading] = useState(true)

    const fetchEvents = useCallback(async () => {
        try {
            const [eventsRes, appointmentsRes, overridesRes] = await Promise.all([
                fetch("/api/events"),
                fetch("/api/appointments"),
                fetch("/api/date-overrides")
            ])

            const eventsData: Event[] = await eventsRes.json()
            const appointmentsData: Appointment[] = await appointmentsRes.json()
            const overridesData: { id: string; date: string; isBlocked: boolean; reason?: string | null; startTime?: string | null; endTime?: string | null }[] = overridesRes.ok ? await overridesRes.json() : []

            const calendarEvents: CalendarEvent[] = [
                ...eventsData.map((e) => ({
                    id: e.id,
                    title: e.title,
                    start: e.start,
                    end: e.end,
                    allDay: e.allDay,
                    color: e.color,
                    extendedProps: {
                        type: "event" as const,
                        description: e.description
                    }
                })),
                ...appointmentsData.map((a) => ({
                    id: a.id,
                    title: a.title,
                    start: a.start,
                    end: a.end,
                    color: a.status === "CANCELLED" ? "#64748b" : a.appointmentType?.color || "#8b5cf6",
                    extendedProps: {
                        type: "appointment" as const,
                        status: a.status
                    }
                })),
                ...overridesData.map((o) => ({
                    id: `override-${o.id}`,
                    title: o.isBlocked
                        ? `\uD83D\uDEAB ${o.reason || "Blocked"}`
                        : `\u23F0 ${o.reason || "Custom Hours"}${o.startTime && o.endTime ? ` (${o.startTime}–${o.endTime})` : ""}`,
                    start: o.date.split("T")[0],
                    end: o.date.split("T")[0],
                    allDay: true,
                    color: o.isBlocked ? "#ef4444" : "#f59e0b",
                    display: "block",
                    extendedProps: {
                        type: "date-override" as const,
                        description: o.reason || undefined
                    }
                }))
            ]

            setEvents(calendarEvents)
        } catch (error) {
            console.error("Error fetching events:", error)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchEvents()
    }, [fetchEvents, refreshKey])

    const handleEventClick = useCallback((info: any) => {
        // Don't open edit modal for date overrides / holidays
        if (info.event.extendedProps?.type === "date-override") return

        if (onEventClick) {
            onEventClick({
                id: info.event.id,
                title: info.event.title,
                start: info.event.start || new Date(),
                end: info.event.end || new Date(),
                allDay: info.event.allDay,
                color: info.event.backgroundColor,
                extendedProps: info.event.extendedProps
            })
        }
    }, [onEventClick])

    const handleDateSelect = useCallback((info: any) => {
        if (onDateSelect) {
            onDateSelect(info.start, info.end)
        }
    }, [onDateSelect])

    const handleEventDrop = useCallback(async (info: any) => {
        if (info.event.extendedProps.type !== "event") {
            info.revert()
            return
        }

        try {
            await fetch(`/api/events/${info.event.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    start: info.event.start?.toISOString(),
                    end: info.event.end?.toISOString()
                })
            })
            fetchEvents()
        } catch (error) {
            console.error("Error updating event:", error)
            info.revert()
        }
    }, [fetchEvents])

    // Memoize static config objects to prevent FullCalendar re-renders
    const plugins = useMemo(() => [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin], [])
    const headerToolbar = useMemo(() => ({ left: "prev,next today", center: "title", right: "" }), [])
    const eventTimeFormat = useMemo(() => ({ hour: "2-digit" as const, minute: "2-digit" as const, meridiem: "short" as const }), [])

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="loading-spinner" />
            </div>
        )
    }

    return (
        <div className="h-full">
            {/* View Switcher */}
            <div className="flex gap-2 mb-4">
                <button
                    onClick={() => setView("dayGridMonth")}
                    className={`btn ${view === "dayGridMonth" ? "btn-primary" : "btn-outline"}`}
                >
                    Month
                </button>
                <button
                    onClick={() => setView("timeGridWeek")}
                    className={`btn ${view === "timeGridWeek" ? "btn-primary" : "btn-outline"}`}
                >
                    Week
                </button>
                <button
                    onClick={() => setView("timeGridDay")}
                    className={`btn ${view === "timeGridDay" ? "btn-primary" : "btn-outline"}`}
                >
                    Day
                </button>
                <button
                    onClick={() => setView("listWeek")}
                    className={`btn ${view === "listWeek" ? "btn-primary" : "btn-outline"}`}
                >
                    Agenda
                </button>
            </div>

            {/* Calendar */}
            <div className="card">
                <FullCalendar
                    key={view}
                    plugins={plugins}
                    initialView={view}
                    events={events}
                    selectable={true}
                    editable={true}
                    eventClick={handleEventClick}
                    select={handleDateSelect}
                    eventDrop={handleEventDrop}
                    headerToolbar={headerToolbar}
                    height="auto"
                    eventTimeFormat={eventTimeFormat}
                    slotMinTime="06:00:00"
                    slotMaxTime="22:00:00"
                    nowIndicator={true}
                    dayMaxEvents={3}
                    eventDisplay="block"
                />
            </div>
        </div>
    )
}

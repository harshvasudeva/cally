"use client"

import { useEffect, useState, useCallback } from "react"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import timeGridPlugin from "@fullcalendar/timegrid"
import listPlugin from "@fullcalendar/list"
import interactionPlugin from "@fullcalendar/interaction"
import { CalendarEvent, Event, Appointment } from "@/types"

interface CalendarViewProps {
    onEventClick?: (event: CalendarEvent) => void
    onDateSelect?: (start: Date, end: Date) => void
    onEventDrop?: (event: CalendarEvent, newStart: Date, newEnd: Date) => void
}

export default function CalendarView({
    onEventClick,
    onDateSelect,
    onEventDrop
}: CalendarViewProps) {
    const [events, setEvents] = useState<CalendarEvent[]>([])
    const [view, setView] = useState<"dayGridMonth" | "timeGridWeek" | "timeGridDay" | "listWeek">("dayGridMonth")
    const [loading, setLoading] = useState(true)

    const fetchEvents = useCallback(async () => {
        try {
            const [eventsRes, appointmentsRes] = await Promise.all([
                fetch("/api/events"),
                fetch("/api/appointments")
            ])

            const eventsData: Event[] = await eventsRes.json()
            const appointmentsData: Appointment[] = await appointmentsRes.json()

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
    }, [fetchEvents])

    const handleEventClick = (info: any) => {
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
    }

    const handleDateSelect = (info: any) => {
        if (onDateSelect) {
            onDateSelect(info.start, info.end)
        }
    }

    const handleEventDrop = async (info: any) => {
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
    }

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
                    plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                    initialView={view}
                    key={view}
                    events={events}
                    selectable={true}
                    editable={true}
                    eventClick={handleEventClick}
                    select={handleDateSelect}
                    eventDrop={handleEventDrop}
                    headerToolbar={{
                        left: "prev,next today",
                        center: "title",
                        right: ""
                    }}
                    height="auto"
                    eventTimeFormat={{
                        hour: "2-digit",
                        minute: "2-digit",
                        meridiem: "short"
                    }}
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

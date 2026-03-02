"use client"

import { useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import dynamic from "next/dynamic"
import CalendarView from "@/components/calendar/CalendarView"
import EventModal from "@/components/calendar/EventModal"
import { CalendarEvent, Event } from "@/types"
import { Plus, Trash2 } from "lucide-react"

// Code-split: OnboardingWizard is only shown once per user
const OnboardingWizard = dynamic(() => import("@/components/OnboardingWizard"), { ssr: false })

export default function CalendarPage() {
    const { data: session, status } = useSession()
    const [showEventModal, setShowEventModal] = useState(false)
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
    const [selectedDates, setSelectedDates] = useState<{ start: Date; end: Date } | null>(null)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [showOnboarding, setShowOnboarding] = useState(false)
    const [refreshKey, setRefreshKey] = useState(0)

    // (#83) Check if onboarding is needed
    const onboardingCompleted = (session?.user as any)?.onboardingCompleted

    if (status === "loading") {
        return null
    }

    if (!session) {
        redirect("/login")
    }

    const handleEventClick = async (event: CalendarEvent) => {
        if (event.extendedProps?.type === "event") {
            try {
                const res = await fetch(`/api/events/${event.id}`)
                const data = await res.json()
                setSelectedEvent(data)
                setShowEventModal(true)
            } catch (error) {
                console.error("Error fetching event:", error)
            }
        }
    }

    const handleDateSelect = (start: Date, end: Date) => {
        setSelectedEvent(null)
        setSelectedDates({ start, end })
        setShowEventModal(true)
    }

    const handleSaveEvent = async (eventData: Partial<Event>) => {
        try {
            if (selectedEvent) {
                await fetch(`/api/events/${selectedEvent.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(eventData)
                })
            } else {
                await fetch("/api/events", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(eventData)
                })
            }
            setShowEventModal(false)
            setSelectedEvent(null)
            setRefreshKey(k => k + 1)
        } catch (error) {
            console.error("Error saving event:", error)
            throw error
        }
    }

    const handleDeleteEvent = async () => {
        if (!selectedEvent) return

        try {
            await fetch(`/api/events/${selectedEvent.id}`, {
                method: "DELETE"
            })
            setShowDeleteConfirm(false)
            setShowEventModal(false)
            setRefreshKey(k => k + 1)
        } catch (error) {
            console.error("Error deleting event:", error)
        }
    }

    return (
        <>
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-text">Calendar</h1>
                    <p className="text-text-secondary mt-1">Manage your events and appointments</p>
                </div>

                <button
                    onClick={() => {
                        setSelectedEvent(null)
                        setSelectedDates(null)
                        setShowEventModal(true)
                    }}
                    className="btn btn-primary flex items-center gap-2"
                >
                    <Plus size={20} />
                    New Event
                </button>
            </div>

            {/* Calendar */}
            <CalendarView
                onEventClick={handleEventClick}
                onDateSelect={handleDateSelect}
                refreshKey={refreshKey}
            />

            {/* Event Modal */}
            <EventModal
                isOpen={showEventModal}
                onClose={() => {
                    setShowEventModal(false)
                    setSelectedEvent(null)
                    setSelectedDates(null)
                }}
                onSave={handleSaveEvent}
                event={selectedEvent}
                defaultStart={selectedDates?.start}
                defaultEnd={selectedDates?.end}
            />

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && selectedEvent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
                    <div className="relative glass rounded-2xl p-6 max-w-sm w-full animate-fade-in">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                                <Trash2 className="text-red-400" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-white">Delete Event</h3>
                                <p className="text-sm text-slate-400">This action cannot be undone</p>
                            </div>
                        </div>
                        <p className="text-slate-300 mb-6">
                            Are you sure you want to delete &quot;{selectedEvent.title}&quot;?
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="btn btn-outline flex-1"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteEvent}
                                className="btn btn-danger flex-1"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* (#83) Onboarding Wizard */}
            {onboardingCompleted === false && (
                <OnboardingWizard onComplete={() => setShowOnboarding(false)} />
            )}
        </>
    )
}

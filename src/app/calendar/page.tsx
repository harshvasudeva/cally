"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import Sidebar from "@/components/Sidebar"
import CalendarView from "@/components/calendar/CalendarView"
import EventModal from "@/components/calendar/EventModal"
import OnboardingWizard from "@/components/OnboardingWizard"
import { CalendarEvent, Event } from "@/types"
import { Plus, Trash2 } from "lucide-react"

export default function CalendarPage() {
    const { data: session, status } = useSession()
    const [showEventModal, setShowEventModal] = useState(false)
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null)
    const [selectedDates, setSelectedDates] = useState<{ start: Date; end: Date } | null>(null)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [showOnboarding, setShowOnboarding] = useState(false)

    // (#83) Check if onboarding is needed
    const onboardingCompleted = (session?.user as any)?.onboardingCompleted

    if (status === "loading") {
        return (
            <div className="min-h-screen flex">
                <Sidebar />
                <main className="flex-1 p-6 md:p-8 overflow-auto">
                    <div className="max-w-7xl mx-auto">
                        <div className="mb-8">
                            <div className="h-8 w-48 bg-slate-700/50 rounded animate-pulse mb-2" />
                            <div className="h-4 w-64 bg-slate-700/50 rounded animate-pulse" />
                        </div>
                        <div className="flex gap-2 mb-4">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="h-10 w-20 bg-slate-700/50 rounded animate-pulse" />
                            ))}
                        </div>
                        <div className="card">
                            <div className="grid grid-cols-7 gap-1">
                                {Array.from({ length: 35 }).map((_, i) => (
                                    <div key={i} className="h-24 bg-slate-700/30 rounded animate-pulse" />
                                ))}
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        )
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
            window.location.reload()
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
            window.location.reload()
        } catch (error) {
            console.error("Error deleting event:", error)
        }
    }

    return (
        <div className="min-h-screen flex">
            <Sidebar />

            <main className="flex-1 p-6 md:p-8 overflow-auto">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-white">Calendar</h1>
                            <p className="text-slate-400 mt-1">Manage your events and appointments</p>
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
                    />
                </div>
            </main>

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
        </div>
    )
}

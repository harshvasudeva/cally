"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import Sidebar from "@/components/Sidebar"
import { Availability } from "@/types"
import { Clock, Save, Plus, Trash2 } from "lucide-react"

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

interface AvailabilitySlot {
    id?: string
    dayOfWeek: number
    startTime: string
    endTime: string
    isActive: boolean
}

export default function AvailabilityPage() {
    const { data: session, status } = useSession()
    const [availability, setAvailability] = useState<AvailabilitySlot[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    useEffect(() => {
        fetchAvailability()
    }, [])

    const fetchAvailability = async () => {
        try {
            const res = await fetch("/api/availability")
            const data = await res.json()

            // Create a complete weeks availability with empty slots for missing days
            const completeAvailability: AvailabilitySlot[] = []
            for (let day = 0; day < 7; day++) {
                const daySlots = (data as Availability[]).filter(a => a.dayOfWeek === day)
                if (daySlots.length > 0) {
                    daySlots.forEach(slot => {
                        completeAvailability.push({
                            id: slot.id,
                            dayOfWeek: slot.dayOfWeek,
                            startTime: slot.startTime,
                            endTime: slot.endTime,
                            isActive: slot.isActive
                        })
                    })
                } else {
                    completeAvailability.push({
                        dayOfWeek: day,
                        startTime: "09:00",
                        endTime: "17:00",
                        isActive: false
                    })
                }
            }

            setAvailability(completeAvailability)
        } catch (error) {
            console.error("Error fetching availability:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        setSaving(true)
        setSaved(false)

        try {
            const activeSlots = availability.filter(a => a.isActive)
            await fetch("/api/availability", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ availability: activeSlots })
            })
            setSaved(true)
            setTimeout(() => setSaved(false), 3000)
        } catch (error) {
            console.error("Error saving availability:", error)
        } finally {
            setSaving(false)
        }
    }

    const updateSlot = (dayOfWeek: number, field: keyof AvailabilitySlot, value: string | boolean) => {
        setAvailability(prev =>
            prev.map(slot =>
                slot.dayOfWeek === dayOfWeek ? { ...slot, [field]: value } : slot
            )
        )
    }

    const addSlot = (dayOfWeek: number) => {
        setAvailability(prev => [
            ...prev,
            {
                dayOfWeek,
                startTime: "09:00",
                endTime: "17:00",
                isActive: true
            }
        ])
    }

    const removeSlot = (dayOfWeek: number, index: number) => {
        const daySlots = availability.filter(a => a.dayOfWeek === dayOfWeek)
        if (daySlots.length <= 1) {
            // Just disable if it's the last slot
            updateSlot(dayOfWeek, "isActive", false)
        } else {
            setAvailability(prev => {
                const copy = [...prev]
                const dayIndexes = copy.map((a, i) => a.dayOfWeek === dayOfWeek ? i : -1).filter(i => i !== -1)
                copy.splice(dayIndexes[index], 1)
                return copy
            })
        }
    }

    if (status === "loading" || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="loading-spinner" />
            </div>
        )
    }

    if (!session) {
        redirect("/login")
    }

    // Group by day
    const groupedByDay = DAYS.map((day, index) => ({
        day,
        dayIndex: index,
        slots: availability.filter(a => a.dayOfWeek === index)
    }))

    return (
        <div className="min-h-screen flex">
            <Sidebar />

            <main className="flex-1 p-6 md:p-8 overflow-auto">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-white">Availability</h1>
                            <p className="text-slate-400 mt-1">Set your working hours for bookings</p>
                        </div>

                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="btn btn-primary flex items-center gap-2"
                        >
                            {saving ? (
                                <span className="loading-spinner" />
                            ) : saved ? (
                                <>
                                    <Clock size={18} className="text-emerald-400" />
                                    Saved!
                                </>
                            ) : (
                                <>
                                    <Save size={18} />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>

                    {/* Availability Grid */}
                    <div className="space-y-4">
                        {groupedByDay.map(({ day, dayIndex, slots }) => (
                            <div key={day} className="card">
                                <div className="flex items-start gap-4">
                                    {/* Day Toggle */}
                                    <div className="flex items-center gap-3 w-32">
                                        <input
                                            type="checkbox"
                                            checked={slots.some(s => s.isActive)}
                                            onChange={(e) => updateSlot(dayIndex, "isActive", e.target.checked)}
                                            className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
                                        />
                                        <span className={`font-medium ${slots.some(s => s.isActive) ? "text-white" : "text-slate-500"}`}>
                                            {day}
                                        </span>
                                    </div>

                                    {/* Time Slots */}
                                    <div className="flex-1 space-y-2">
                                        {slots.filter(s => s.isActive).length === 0 ? (
                                            <p className="text-slate-500 text-sm py-2">Unavailable</p>
                                        ) : (
                                            slots.filter(s => s.isActive).map((slot, slotIndex) => (
                                                <div key={slotIndex} className="flex items-center gap-3">
                                                    <input
                                                        type="time"
                                                        value={slot.startTime}
                                                        onChange={(e) => {
                                                            const allDaySlots = availability.filter(a => a.dayOfWeek === dayIndex)
                                                            const realIndex = availability.findIndex(a => a === allDaySlots[slotIndex])
                                                            const newAvail = [...availability]
                                                            newAvail[realIndex] = { ...newAvail[realIndex], startTime: e.target.value }
                                                            setAvailability(newAvail)
                                                        }}
                                                        className="input w-32"
                                                    />
                                                    <span className="text-slate-400">to</span>
                                                    <input
                                                        type="time"
                                                        value={slot.endTime}
                                                        onChange={(e) => {
                                                            const allDaySlots = availability.filter(a => a.dayOfWeek === dayIndex)
                                                            const realIndex = availability.findIndex(a => a === allDaySlots[slotIndex])
                                                            const newAvail = [...availability]
                                                            newAvail[realIndex] = { ...newAvail[realIndex], endTime: e.target.value }
                                                            setAvailability(newAvail)
                                                        }}
                                                        className="input w-32"
                                                    />
                                                    <button
                                                        onClick={() => removeSlot(dayIndex, slotIndex)}
                                                        className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-700"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ))
                                        )}

                                        {slots.some(s => s.isActive) && (
                                            <button
                                                onClick={() => addSlot(dayIndex)}
                                                className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300"
                                            >
                                                <Plus size={14} />
                                                Add time slot
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Tips */}
                    <div className="mt-8 p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                        <h3 className="font-medium text-indigo-400 mb-2">💡 Tips</h3>
                        <ul className="text-sm text-slate-400 space-y-1">
                            <li>• Toggle days on/off to set your working days</li>
                            <li>• Add multiple time slots per day for split schedules</li>
                            <li>• Times are shown in your local timezone</li>
                        </ul>
                    </div>
                </div>
            </main>
        </div>
    )
}

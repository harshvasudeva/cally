"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { Event } from "@/types"

interface EventModalProps {
    isOpen: boolean
    onClose: () => void
    onSave: (event: Partial<Event>) => Promise<void>
    event?: Event | null
    defaultStart?: Date
    defaultEnd?: Date
}

const colors = [
    { name: "Blue", value: "#3b82f6" },
    { name: "Purple", value: "#8b5cf6" },
    { name: "Cyan", value: "#06b6d4" },
    { name: "Green", value: "#10b981" },
    { name: "Yellow", value: "#f59e0b" },
    { name: "Red", value: "#ef4444" },
    { name: "Pink", value: "#ec4899" },
]

export default function EventModal({
    isOpen,
    onClose,
    onSave,
    event,
    defaultStart,
    defaultEnd
}: EventModalProps) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        start: "",
        end: "",
        allDay: false,
        color: "#3b82f6",
        location: "",
        category: "",
        recurrence: "",
    })

    // Reset form data when modal opens
    useEffect(() => {
        if (isOpen) {
            let startStr = ""
            let endStr = ""
            let isAllDay = event?.allDay || false

            const formatLocal = (d: Date) => {
                const pad = (n: number) => n.toString().padStart(2, '0')
                return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
            }

            if (event) {
                startStr = event.start ? formatLocal(new Date(event.start)) : ""
                endStr = event.end ? formatLocal(new Date(event.end)) : ""
            } else if (defaultStart && defaultEnd) {
                const start = new Date(defaultStart)
                const end = new Date(defaultEnd)
                
                // If it's a full day selection in Month view (midnight to midnight)
                if (start.getHours() === 0 && start.getMinutes() === 0 && end.getHours() === 0 && end.getMinutes() === 0) {
                    const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
                    
                    if (diffDays === 1) {
                        // Single day click: default to current hour + 1
                        const now = new Date()
                        start.setHours(now.getHours() + 1, 0, 0, 0)
                        end.setTime(start.getTime() + 60 * 60 * 1000) // 1 hour later
                    } else {
                        // Multi-day drag: default to all day event
                        end.setDate(end.getDate() - 1)
                        
                        const now = new Date()
                        // If the start date is today, ensure the time is at least now + 5 mins
                        if (start.toDateString() === now.toDateString()) {
                            start.setTime(now.getTime() + 5 * 60000)
                        } else {
                            start.setHours(0, 0, 0, 0)
                        }
                        
                        end.setHours(23, 59, 0, 0)
                        isAllDay = true
                    }
                }

                startStr = formatLocal(start)
                endStr = formatLocal(end)
            }

            setFormData({
                title: event?.title || "",
                description: event?.description || "",
                start: startStr,
                end: endStr,
                allDay: isAllDay,
                color: event?.color || "#3b82f6",
                location: event?.location || "",
                category: event?.category || "",
                recurrence: event?.recurrence || "",
            })
        }
    }, [isOpen, event, defaultStart, defaultEnd])

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            await onSave({
                ...formData,
                start: new Date(formData.start).toISOString(),
                end: new Date(formData.end).toISOString(),
                recurrence: formData.recurrence || undefined,
            })
            onClose()
        } catch (error) {
            console.error("Error saving event:", error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-lg glass rounded-2xl animate-fade-in">
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                    <h2 className="text-xl font-semibold text-white">
                        {event ? "Edit Event" : "New Event"}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="label">Title *</label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="input"
                            placeholder="Event title"
                            required
                        />
                    </div>

                    <div>
                        <label className="label">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="input resize-none"
                            rows={3}
                            placeholder="Add description..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label">Start *</label>
                            <input
                                type="datetime-local"
                                value={formData.start}
                                onChange={(e) => setFormData({ ...formData, start: e.target.value })}
                                className="input"
                                required
                            />
                        </div>
                        <div>
                            <label className="label">End *</label>
                            <input
                                type="datetime-local"
                                value={formData.end}
                                onChange={(e) => setFormData({ ...formData, end: e.target.value })}
                                className="input"
                                required
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <input
                            type="checkbox"
                            id="allDay"
                            checked={formData.allDay}
                            onChange={(e) => setFormData({ ...formData, allDay: e.target.checked })}
                            className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
                        />
                        <label htmlFor="allDay" className="text-sm text-slate-300">
                            All day event
                        </label>
                    </div>

                    {/* Recurrence */}
                    <div>
                        <label className="label">Repeat</label>
                        <select
                            value={formData.recurrence}
                            onChange={(e) => setFormData({ ...formData, recurrence: e.target.value })}
                            className="input"
                        >
                            <option value="">Does not repeat</option>
                            <option value="FREQ=DAILY">Daily</option>
                            <option value="FREQ=DAILY;INTERVAL=2">Every other day</option>
                            <option value="FREQ=WEEKLY">Weekly</option>
                            <option value="FREQ=WEEKLY;INTERVAL=2">Every 2 weeks</option>
                            <option value="FREQ=MONTHLY">Monthly</option>
                            <option value="FREQ=YEARLY">Yearly</option>
                            <option value="FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR">Weekdays (Mon–Fri)</option>
                        </select>
                        {formData.recurrence && (
                            <p className="text-xs text-slate-400 mt-1">
                                This event will repeat based on the selected pattern.
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="label">Location</label>
                        <input
                            type="text"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                            className="input"
                            placeholder="Add location..."
                        />
                    </div>

                    <div>
                        <label className="label">Color</label>
                        <div className="flex gap-2">
                            {colors.map((color) => (
                                <button
                                    key={color.value}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, color: color.value })}
                                    className={`w-8 h-8 rounded-full transition-transform ${formData.color === color.value ? "ring-2 ring-white ring-offset-2 ring-offset-slate-800 scale-110" : ""
                                        }`}
                                    style={{ backgroundColor: color.value }}
                                    title={color.name}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn btn-outline flex-1"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary flex-1"
                        >
                            {loading ? (
                                <span className="loading-spinner mx-auto" />
                            ) : (
                                event ? "Update" : "Create"
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

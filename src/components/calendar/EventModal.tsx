"use client"

import { useState } from "react"
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
        title: event?.title || "",
        description: event?.description || "",
        start: event?.start
            ? new Date(event.start).toISOString().slice(0, 16)
            : defaultStart?.toISOString().slice(0, 16) || "",
        end: event?.end
            ? new Date(event.end).toISOString().slice(0, 16)
            : defaultEnd?.toISOString().slice(0, 16) || "",
        allDay: event?.allDay || false,
        color: event?.color || "#3b82f6",
        location: event?.location || "",
        category: event?.category || ""
    })

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            await onSave({
                ...formData,
                start: new Date(formData.start).toISOString(),
                end: new Date(formData.end).toISOString()
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

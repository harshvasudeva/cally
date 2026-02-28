"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import Sidebar from "@/components/Sidebar"
import { AppointmentType } from "@/types"
import { Clock, Plus, Edit2, Trash2, Link2, X, AlertCircle, Hash } from "lucide-react"

const colors = [
    "#6366f1", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#ec4899"
]

export default function AppointmentTypesPage() {
    const { data: session, status } = useSession()
    const [types, setTypes] = useState<AppointmentType[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingType, setEditingType] = useState<AppointmentType | null>(null)
    const [saving, setSaving] = useState(false)
    const [formData, setFormData] = useState({
        name: "",
        duration: 30,
        bufferBefore: 0,
        bufferAfter: 0,
        description: "",
        location: "",
        color: "#8b5cf6",
        minNotice: 0,
        maxPerDay: 0
    })

    useEffect(() => {
        fetchTypes()
    }, [])

    const fetchTypes = async () => {
        try {
            const res = await fetch("/api/appointment-types")
            const data = await res.json()
            setTypes(data)
        } catch (error) {
            console.error("Error fetching types:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        try {
            if (editingType) {
                await fetch(`/api/appointment-types/${editingType.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(formData)
                })
            } else {
                await fetch("/api/appointment-types", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(formData)
                })
            }
            setShowModal(false)
            setEditingType(null)
            resetForm()
            fetchTypes()
        } catch (error) {
            console.error("Error saving type:", error)
        } finally {
            setSaving(false)
        }
    }

    const resetForm = () => {
        setFormData({
            name: "",
            duration: 30,
            bufferBefore: 0,
            bufferAfter: 0,
            description: "",
            location: "",
            color: "#8b5cf6",
            minNotice: 0,
            maxPerDay: 0
        })
    }

    const openEdit = (type: AppointmentType) => {
        setEditingType(type)
        setFormData({
            name: type.name,
            duration: type.duration,
            bufferBefore: type.bufferBefore,
            bufferAfter: type.bufferAfter,
            description: type.description || "",
            location: type.location || "",
            color: type.color,
            minNotice: (type as AppointmentType & { minNotice?: number }).minNotice || 0,
            maxPerDay: (type as AppointmentType & { maxPerDay?: number }).maxPerDay || 0
        })
        setShowModal(true)
    }

    const userSlug = (session?.user as { slug?: string })?.slug

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

    return (
        <div className="min-h-screen flex">
            <Sidebar />

            <main className="flex-1 p-6 md:p-8 overflow-auto">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-white">Event Types</h1>
                            <p className="text-slate-400 mt-1">Create different appointment types for booking</p>
                        </div>

                        <button
                            onClick={() => {
                                resetForm()
                                setEditingType(null)
                                setShowModal(true)
                            }}
                            className="btn btn-primary flex items-center gap-2"
                        >
                            <Plus size={18} />
                            New Event Type
                        </button>
                    </div>

                    {/* Types List */}
                    {types.length === 0 ? (
                        <div className="card text-center py-12">
                            <Clock size={48} className="mx-auto text-slate-600 mb-4" />
                            <p className="text-slate-400 mb-4">No event types created yet</p>
                            <button
                                onClick={() => setShowModal(true)}
                                className="btn btn-primary"
                            >
                                Create your first event type
                            </button>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {types.map((type) => {
                                const minNotice = (type as AppointmentType & { minNotice?: number }).minNotice || 0
                                const maxPerDay = (type as AppointmentType & { maxPerDay?: number }).maxPerDay || 0

                                return (
                                    <div key={type.id} className="card card-hover flex items-center gap-4">
                                        <div
                                            className="w-2 h-16 rounded-full"
                                            style={{ backgroundColor: type.color }}
                                        />

                                        <div className="flex-1">
                                            <h3 className="text-lg font-semibold text-white">{type.name}</h3>
                                            <div className="flex items-center gap-4 mt-1 text-sm text-slate-400 flex-wrap">
                                                <span className="flex items-center gap-1">
                                                    <Clock size={14} />
                                                    {type.duration} min
                                                </span>
                                                {(type.bufferBefore > 0 || type.bufferAfter > 0) && (
                                                    <span>
                                                        Buffer: {type.bufferBefore}min before, {type.bufferAfter}min after
                                                    </span>
                                                )}
                                                {minNotice > 0 && (
                                                    <span className="flex items-center gap-1">
                                                        <AlertCircle size={14} />
                                                        {minNotice}min notice
                                                    </span>
                                                )}
                                                {maxPerDay > 0 && (
                                                    <span className="flex items-center gap-1">
                                                        <Hash size={14} />
                                                        Max {maxPerDay}/day
                                                    </span>
                                                )}
                                            </div>
                                            {type.description && (
                                                <p className="text-sm text-slate-500 mt-2">{type.description}</p>
                                            )}
                                        </div>

                                        {/* Booking Link */}
                                        <div className="hidden md:block text-sm">
                                            <p className="text-slate-500 mb-1">Booking Link</p>
                                            <code className="text-xs text-indigo-400 bg-slate-800 px-2 py-1 rounded">
                                                /book/{userSlug}?type={type.slug}
                                            </code>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => openEdit(type)}
                                                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700"
                                            >
                                                <Edit2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </main>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
                    <div className="relative w-full max-w-lg glass rounded-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b border-slate-700">
                            <h2 className="text-xl font-semibold text-white">
                                {editingType ? "Edit Event Type" : "New Event Type"}
                            </h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="label">Name *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="input"
                                    placeholder="30 Minute Meeting"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="label">Duration (min) *</label>
                                    <input
                                        type="number"
                                        value={formData.duration}
                                        onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                                        className="input"
                                        min={5}
                                        step={5}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="label">Buffer Before</label>
                                    <input
                                        type="number"
                                        value={formData.bufferBefore}
                                        onChange={(e) => setFormData({ ...formData, bufferBefore: parseInt(e.target.value) })}
                                        className="input"
                                        min={0}
                                        step={5}
                                    />
                                </div>
                                <div>
                                    <label className="label">Buffer After</label>
                                    <input
                                        type="number"
                                        value={formData.bufferAfter}
                                        onChange={(e) => setFormData({ ...formData, bufferAfter: parseInt(e.target.value) })}
                                        className="input"
                                        min={0}
                                        step={5}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Minimum Notice (minutes)</label>
                                    <input
                                        type="number"
                                        value={formData.minNotice}
                                        onChange={(e) => setFormData({ ...formData, minNotice: parseInt(e.target.value) || 0 })}
                                        className="input"
                                        min={0}
                                        step={15}
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="label">Max Bookings per Day</label>
                                    <input
                                        type="number"
                                        value={formData.maxPerDay}
                                        onChange={(e) => setFormData({ ...formData, maxPerDay: parseInt(e.target.value) || 0 })}
                                        className="input"
                                        min={0}
                                        placeholder="0"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">0 = unlimited</p>
                                </div>
                            </div>

                            <div>
                                <label className="label">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="input resize-none"
                                    rows={2}
                                    placeholder="Brief description of the meeting..."
                                />
                            </div>

                            <div>
                                <label className="label">Location</label>
                                <input
                                    type="text"
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    className="input"
                                    placeholder="Zoom, Google Meet, or physical address..."
                                />
                            </div>

                            <div>
                                <label className="label">Color</label>
                                <div className="flex gap-2">
                                    {colors.map((color) => (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, color })}
                                            className={`w-8 h-8 rounded-full transition-transform ${formData.color === color ? "ring-2 ring-white ring-offset-2 ring-offset-slate-800 scale-110" : ""
                                                }`}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline flex-1">
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving} className="btn btn-primary flex-1">
                                    {saving ? <span className="loading-spinner mx-auto" /> : editingType ? "Save Changes" : "Create"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

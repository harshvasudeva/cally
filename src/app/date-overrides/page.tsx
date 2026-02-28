"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import Sidebar from "@/components/Sidebar"
import { CalendarOff, Plus, Trash2, Clock, X } from "lucide-react"
import { format, parseISO } from "date-fns"

interface DateOverride {
    id: string
    date: string
    isBlocked: boolean
    startTime?: string | null
    endTime?: string | null
    reason?: string | null
}

export default function DateOverridesPage() {
    const { data: session, status } = useSession()
    const [overrides, setOverrides] = useState<DateOverride[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState<string | null>(null)
    const [formData, setFormData] = useState({
        date: "",
        isBlocked: true,
        startTime: "09:00",
        endTime: "17:00",
        reason: ""
    })

    useEffect(() => {
        fetchOverrides()
    }, [])

    const fetchOverrides = async () => {
        try {
            const res = await fetch("/api/date-overrides")
            const data = await res.json()
            setOverrides(data)
        } catch (error) {
            console.error("Error fetching date overrides:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        try {
            const body: Record<string, unknown> = {
                date: formData.date,
                isBlocked: formData.isBlocked,
                reason: formData.reason || null
            }

            if (!formData.isBlocked) {
                body.startTime = formData.startTime
                body.endTime = formData.endTime
            }

            await fetch("/api/date-overrides", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            })

            setShowModal(false)
            resetForm()
            fetchOverrides()
        } catch (error) {
            console.error("Error saving date override:", error)
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: string) => {
        setDeleting(id)
        try {
            await fetch(`/api/date-overrides/${id}`, { method: "DELETE" })
            fetchOverrides()
        } catch (error) {
            console.error("Error deleting date override:", error)
        } finally {
            setDeleting(null)
        }
    }

    const resetForm = () => {
        setFormData({
            date: "",
            isBlocked: true,
            startTime: "09:00",
            endTime: "17:00",
            reason: ""
        })
    }

    if (status === "loading" || loading) {
        return (
            <div className="min-h-screen flex">
                <Sidebar />
                <main className="flex-1 p-6 md:p-8 overflow-auto">
                    <div className="max-w-4xl mx-auto">
                        <div className="h-10 w-48 bg-slate-700 rounded animate-pulse mb-2" />
                        <div className="h-5 w-72 bg-slate-800 rounded animate-pulse mb-8" />
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="card h-20 animate-pulse bg-slate-800/50" />
                            ))}
                        </div>
                    </div>
                </main>
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
                            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                                <CalendarOff className="text-indigo-400" />
                                Date Overrides
                            </h1>
                            <p className="text-slate-400 mt-1">Block dates or set custom hours for specific days</p>
                        </div>

                        <button
                            onClick={() => {
                                resetForm()
                                setShowModal(true)
                            }}
                            className="btn btn-primary flex items-center gap-2"
                        >
                            <Plus size={18} />
                            Add Override
                        </button>
                    </div>

                    {/* Overrides List */}
                    {overrides.length === 0 ? (
                        <div className="card text-center py-12">
                            <CalendarOff size={48} className="mx-auto text-slate-600 mb-4" />
                            <p className="text-slate-400 mb-4">No date overrides yet</p>
                            <button
                                onClick={() => setShowModal(true)}
                                className="btn btn-primary"
                            >
                                Add your first override
                            </button>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {overrides.map((override) => (
                                <div key={override.id} className="card flex items-center gap-4">
                                    <div className={`w-2 h-16 rounded-full ${override.isBlocked ? "bg-red-500" : "bg-amber-500"}`} />

                                    <div className="flex-1">
                                        <h3 className="text-lg font-semibold text-white">
                                            {format(parseISO(override.date), "EEEE, MMMM d, yyyy")}
                                        </h3>
                                        <div className="flex items-center gap-4 mt-1 text-sm text-slate-400">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                                override.isBlocked
                                                    ? "bg-red-500/20 text-red-400"
                                                    : "bg-amber-500/20 text-amber-400"
                                            }`}>
                                                {override.isBlocked ? "Blocked" : "Custom Hours"}
                                            </span>
                                            {!override.isBlocked && override.startTime && override.endTime && (
                                                <span className="flex items-center gap-1">
                                                    <Clock size={14} />
                                                    {override.startTime} - {override.endTime}
                                                </span>
                                            )}
                                            {override.reason && (
                                                <span className="text-slate-500">{override.reason}</span>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleDelete(override.id)}
                                        disabled={deleting === override.id}
                                        className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                        title="Delete override"
                                    >
                                        {deleting === override.id ? (
                                            <span className="loading-spinner" />
                                        ) : (
                                            <Trash2 size={18} />
                                        )}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* Add Override Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
                    <div className="relative w-full max-w-lg glass rounded-2xl animate-fade-in">
                        <div className="flex items-center justify-between p-6 border-b border-slate-700">
                            <h2 className="text-xl font-semibold text-white">Add Date Override</h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="label">Date *</label>
                                <input
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    className="input"
                                    required
                                />
                            </div>

                            <div>
                                <label className="label">Override Type</label>
                                <div className="flex gap-4 mt-2">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, isBlocked: true })}
                                        className={`flex-1 p-3 rounded-lg border text-sm font-medium transition-colors ${
                                            formData.isBlocked
                                                ? "border-red-500/50 bg-red-500/20 text-red-400"
                                                : "border-slate-700 text-slate-400 hover:border-slate-600"
                                        }`}
                                    >
                                        Block Entire Day
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, isBlocked: false })}
                                        className={`flex-1 p-3 rounded-lg border text-sm font-medium transition-colors ${
                                            !formData.isBlocked
                                                ? "border-amber-500/50 bg-amber-500/20 text-amber-400"
                                                : "border-slate-700 text-slate-400 hover:border-slate-600"
                                        }`}
                                    >
                                        Custom Hours
                                    </button>
                                </div>
                            </div>

                            {!formData.isBlocked && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="label">Start Time *</label>
                                        <input
                                            type="time"
                                            value={formData.startTime}
                                            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                            className="input"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="label">End Time *</label>
                                        <input
                                            type="time"
                                            value={formData.endTime}
                                            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                            className="input"
                                            required
                                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="label">Reason (optional)</label>
                                <input
                                    type="text"
                                    value={formData.reason}
                                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                    className="input"
                                    placeholder="e.g., Holiday, Doctor's appointment..."
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline flex-1">
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving} className="btn btn-primary flex-1">
                                    {saving ? <span className="loading-spinner mx-auto" /> : "Save Override"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

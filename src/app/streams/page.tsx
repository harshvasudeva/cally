"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import {
    Radio, Plus, Trash2, X, Check, ExternalLink,
    Trophy, Flag, Bike, Car, Swords
} from "lucide-react"

interface CalendarStream {
    id: string
    name: string
    url: string
    color: string
    category: string
    isActive: boolean
    lastSyncAt: string | null
    createdAt: string
}

interface Preset {
    name: string
    url: string
    category: string
    color: string
    icon: typeof Trophy
    description: string
}

const SPORT_PRESETS: Preset[] = [
    {
        name: "Formula 1 — All Races",
        url: "https://files-f1.motorsportcalendars.com/f1-calendar_gp.ics",
        category: "sports",
        color: "#e10600",
        icon: Car,
        description: "All Grand Prix race sessions"
    },
    {
        name: "Formula 1 — Full Schedule",
        url: "https://files-f1.motorsportcalendars.com/f1-calendar_p1_p2_p3_q_s_gp.ics",
        category: "sports",
        color: "#e10600",
        icon: Car,
        description: "Practice, qualifying, sprint, and race sessions"
    },
    {
        name: "MotoGP — All Races",
        url: "https://files-motogp.motorsportcalendars.com/motogp-calendar_gp.ics",
        category: "sports",
        color: "#be0a14",
        icon: Bike,
        description: "All MotoGP race events"
    },
    {
        name: "FIFA World Cup 2026",
        url: "https://fixturedownload.com/download/ical/fifa-world-cup-2026",
        category: "sports",
        color: "#326295",
        icon: Trophy,
        description: "All FIFA World Cup 2026 matches"
    },
    {
        name: "Premier League 2025/26",
        url: "https://fixturedownload.com/download/ical/epl-2025",
        category: "sports",
        color: "#37003c",
        icon: Trophy,
        description: "English Premier League fixtures"
    },
    {
        name: "Champions League 2025/26",
        url: "https://fixturedownload.com/download/ical/uefa-champions-league-2025",
        category: "sports",
        color: "#00194e",
        icon: Trophy,
        description: "UEFA Champions League fixtures"
    },
    {
        name: "La Liga 2025/26",
        url: "https://fixturedownload.com/download/ical/la-liga-2025",
        category: "sports",
        color: "#ee8707",
        icon: Trophy,
        description: "Spanish La Liga fixtures"
    },
    {
        name: "IPL Cricket 2026",
        url: "https://fixturedownload.com/download/ical/ipl-2026",
        category: "sports",
        color: "#1a237e",
        icon: Swords,
        description: "Indian Premier League matches"
    },
    {
        name: "ICC Cricket World Cup",
        url: "https://fixturedownload.com/download/ical/cricket-world-cup-2027",
        category: "sports",
        color: "#0b3d2e",
        icon: Swords,
        description: "ICC Cricket World Cup matches"
    },
    {
        name: "NASCAR Cup Series 2026",
        url: "https://fixturedownload.com/download/ical/nascar-2026",
        category: "sports",
        color: "#ffd659",
        icon: Flag,
        description: "NASCAR Cup Series race schedule"
    },
]

export default function StreamsPage() {
    const { data: session, status } = useSession()
    const [streams, setStreams] = useState<CalendarStream[]>([])
    const [loading, setLoading] = useState(true)
    const [showAddModal, setShowAddModal] = useState(false)
    const [showPresets, setShowPresets] = useState(false)
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState<string | null>(null)
    const [addResult, setAddResult] = useState<{ success: boolean; message: string } | null>(null)
    const [formData, setFormData] = useState({
        name: "",
        url: "",
        color: "#6366f1",
        category: "other" as string,
    })

    const fetchStreams = useCallback(async () => {
        try {
            const res = await fetch("/api/streams")
            if (res.ok) {
                const data = await res.json()
                setStreams(data)
            }
        } catch (error) {
            console.error("Error fetching streams:", error)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchStreams()
    }, [fetchStreams])

    const handleAddStream = useCallback(async (name: string, url: string, color: string, category: string) => {
        setSaving(true)
        setAddResult(null)
        try {
            const res = await fetch("/api/streams", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, url, color, category }),
            })
            if (res.ok) {
                setAddResult({ success: true, message: `"${name}" added successfully` })
                fetchStreams()
                setFormData({ name: "", url: "", color: "#6366f1", category: "other" })
            } else {
                const data = await res.json()
                setAddResult({ success: false, message: data.error || "Failed to add stream" })
            }
        } catch {
            setAddResult({ success: false, message: "Network error" })
        } finally {
            setSaving(false)
        }
    }, [fetchStreams])

    const handleSubmitCustom = useCallback(async (e: React.FormEvent) => {
        e.preventDefault()
        await handleAddStream(formData.name, formData.url, formData.color, formData.category)
    }, [formData, handleAddStream])

    const handleToggle = useCallback(async (id: string, isActive: boolean) => {
        try {
            await fetch(`/api/streams/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: !isActive }),
            })
            fetchStreams()
        } catch (error) {
            console.error("Error toggling stream:", error)
        }
    }, [fetchStreams])

    const handleDelete = useCallback(async (id: string) => {
        setDeleting(id)
        try {
            await fetch(`/api/streams/${id}`, { method: "DELETE" })
            fetchStreams()
        } catch (error) {
            console.error("Error deleting stream:", error)
        } finally {
            setDeleting(null)
        }
    }, [fetchStreams])

    const isPresetAdded = useCallback((presetUrl: string) => {
        return streams.some(s => s.url === presetUrl)
    }, [streams])

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
        <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-text flex items-center gap-3">
                        <Radio className="text-indigo-400" />
                        Calendar Streams
                    </h1>
                    <p className="text-text-secondary mt-1">Subscribe to external calendars — sports, events, and more</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => { setShowPresets(true); setAddResult(null) }}
                        className="btn btn-outline flex items-center gap-2"
                    >
                        <Trophy size={18} />
                        Sports Presets
                    </button>
                    <button
                        onClick={() => { setShowAddModal(true); setAddResult(null) }}
                        className="btn btn-primary flex items-center gap-2"
                    >
                        <Plus size={18} />
                        Add Custom
                    </button>
                </div>
            </div>

            {/* Active Streams */}
            {streams.length === 0 ? (
                <div className="card text-center py-12">
                    <Radio size={48} className="mx-auto text-slate-600 mb-4" />
                    <h2 className="text-lg font-semibold text-text mb-2">No calendar streams yet</h2>
                    <p className="text-text-secondary text-sm mb-4">
                        Add sports calendars, holiday feeds, or any iCal URL to overlay on your calendar.
                    </p>
                    <div className="flex items-center justify-center gap-3">
                        <button
                            onClick={() => setShowPresets(true)}
                            className="btn btn-outline"
                        >
                            Browse Presets
                        </button>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="btn btn-primary"
                        >
                            Add Custom URL
                        </button>
                    </div>
                </div>
            ) : (
                <div className="grid gap-4">
                    {streams.map((stream) => (
                        <div key={stream.id} className="card flex items-center gap-4">
                            <div
                                className="w-3 h-12 rounded-full shrink-0"
                                style={{ backgroundColor: stream.color }}
                            />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-white font-medium truncate">{stream.name}</h3>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                        stream.category === "sports"
                                            ? "bg-emerald-500/20 text-emerald-400"
                                            : stream.category === "holidays"
                                            ? "bg-amber-500/20 text-amber-400"
                                            : "bg-slate-700 text-slate-400"
                                    }`}>
                                        {stream.category}
                                    </span>
                                </div>
                                <p className="text-slate-500 text-xs truncate mt-0.5">{stream.url}</p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                {/* Toggle active */}
                                <button
                                    onClick={() => handleToggle(stream.id, stream.isActive)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                        stream.isActive
                                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                            : "bg-slate-700 text-slate-400"
                                    }`}
                                >
                                    {stream.isActive ? "Active" : "Paused"}
                                </button>

                                {/* Delete */}
                                <button
                                    onClick={() => handleDelete(stream.id)}
                                    disabled={deleting === stream.id}
                                    className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                >
                                    {deleting === stream.id ? (
                                        <span className="loading-spinner" />
                                    ) : (
                                        <Trash2 size={16} />
                                    )}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Tips */}
            <div className="mt-8 p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                <h3 className="font-medium text-indigo-400 mb-2">💡 How Streams Work</h3>
                <ul className="text-sm text-slate-400 space-y-1">
                    <li>• Streams subscribe to external iCal (.ics) feed URLs</li>
                    <li>• Events from streams will appear on your calendar as overlays</li>
                    <li>• Use Sports Presets for quick access to popular sports calendars</li>
                    <li>• You can add any public iCal URL as a custom stream</li>
                </ul>
            </div>

            {/* Add Custom Stream Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
                    <div className="relative w-full max-w-lg glass rounded-2xl animate-fade-in">
                        <div className="flex items-center justify-between p-6 border-b border-slate-700">
                            <h2 className="text-xl font-semibold text-white">Add Custom Stream</h2>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmitCustom} className="p-6 space-y-4">
                            {addResult && (
                                <div className={`flex items-center gap-2 p-3 rounded-lg border ${
                                    addResult.success
                                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                        : "bg-red-500/10 border-red-500/20 text-red-400"
                                }`}>
                                    {addResult.success ? <Check size={16} /> : <X size={16} />}
                                    <span className="text-sm">{addResult.message}</span>
                                </div>
                            )}

                            <div>
                                <label className="label">Name *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="input"
                                    placeholder="e.g., F1 Calendar, My Team Schedule"
                                    required
                                />
                            </div>

                            <div>
                                <label className="label">iCal Feed URL *</label>
                                <input
                                    type="url"
                                    value={formData.url}
                                    onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                                    className="input"
                                    placeholder="https://example.com/calendar.ics"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Color</label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="color"
                                            value={formData.color}
                                            onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                            className="w-10 h-10 rounded-lg border border-slate-700 cursor-pointer bg-transparent"
                                        />
                                        <span className="text-sm text-slate-400">{formData.color}</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="label">Category</label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="input"
                                    >
                                        <option value="sports">Sports</option>
                                        <option value="holidays">Holidays</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-outline flex-1">
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving} className="btn btn-primary flex-1">
                                    {saving ? <span className="loading-spinner mx-auto" /> : "Add Stream"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Sports Presets Modal */}
            {showPresets && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPresets(false)} />
                    <div className="relative w-full max-w-2xl glass rounded-2xl animate-fade-in max-h-[80vh] flex flex-col">
                        <div className="flex items-center justify-between p-6 border-b border-slate-700">
                            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                                <Trophy size={20} className="text-indigo-400" />
                                Sports Calendar Presets
                            </h2>
                            <button
                                onClick={() => setShowPresets(false)}
                                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 space-y-3">
                            {addResult && (
                                <div className={`flex items-center gap-2 p-3 rounded-lg border ${
                                    addResult.success
                                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                        : "bg-red-500/10 border-red-500/20 text-red-400"
                                }`}>
                                    {addResult.success ? <Check size={16} /> : <X size={16} />}
                                    <span className="text-sm">{addResult.message}</span>
                                </div>
                            )}

                            {SPORT_PRESETS.map((preset) => {
                                const Icon = preset.icon
                                const added = isPresetAdded(preset.url)
                                return (
                                    <div
                                        key={preset.url}
                                        className="flex items-center gap-4 p-4 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors"
                                    >
                                        <div
                                            className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                                            style={{ backgroundColor: preset.color + "33" }}
                                        >
                                            <Icon size={20} style={{ color: preset.color }} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-white font-medium text-sm">{preset.name}</h3>
                                            <p className="text-slate-500 text-xs mt-0.5">{preset.description}</p>
                                        </div>
                                        {added ? (
                                            <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                                                <Check size={14} className="inline mr-1" />
                                                Added
                                            </span>
                                        ) : (
                                            <button
                                                onClick={() => handleAddStream(preset.name, preset.url, preset.color, preset.category)}
                                                disabled={saving}
                                                className="btn btn-primary text-sm shrink-0 flex items-center gap-1"
                                            >
                                                {saving ? <span className="loading-spinner" /> : (
                                                    <>
                                                        <Plus size={14} />
                                                        Add
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                )
                            })}

                            <div className="pt-4 border-t border-slate-700">
                                <p className="text-xs text-slate-500 flex items-center gap-1">
                                    <ExternalLink size={12} />
                                    Feeds sourced from motorsportcalendars.com and fixturedownload.com.
                                    URLs may change between seasons.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

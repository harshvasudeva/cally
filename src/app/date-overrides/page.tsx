"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { CalendarOff, Plus, Trash2, Clock, X, Globe, Download, Check, AlertCircle } from "lucide-react"
import { format, parseISO } from "date-fns"

interface DateOverride {
    id: string
    date: string
    isBlocked: boolean
    startTime?: string | null
    endTime?: string | null
    reason?: string | null
}

interface Holiday {
    date: string
    name: string
    localName: string
    types: string[]
    global: boolean
}

export default function DateOverridesPage() {
    const { data: session, status } = useSession()
    const [overrides, setOverrides] = useState<DateOverride[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showHolidayModal, setShowHolidayModal] = useState(false)
    const [saving, setSaving] = useState(false)
    const [deleting, setDeleting] = useState<string | null>(null)
    const [userCountry, setUserCountry] = useState<string | null>(null)
    const [holidays, setHolidays] = useState<Holiday[]>([])
    const [selectedHolidays, setSelectedHolidays] = useState<Set<string>>(new Set())
    const [holidayLoading, setHolidayLoading] = useState(false)
    const [holidayYear, setHolidayYear] = useState(new Date().getFullYear())
    const [holidayProvider, setHolidayProvider] = useState<string | null>(null)
    const [holidayError, setHolidayError] = useState<string | null>(null)
    const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null)
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

    // Fetch user's country from profile
    useEffect(() => {
        fetch("/api/user/profile")
            .then(res => res.ok ? res.json() : null)
            .then(profile => {
                if (profile?.country) setUserCountry(profile.country)
            })
            .catch(() => {})
    }, [])

    const fetchHolidays = useCallback(async (countryCode?: string) => {
        const cc = countryCode || userCountry
        if (!cc) return
        setHolidayLoading(true)
        setImportResult(null)
        setHolidayError(null)
        setHolidayProvider(null)
        try {
            const res = await fetch(`/api/holidays?country=${cc}&year=${holidayYear}`)
            if (res.ok) {
                const data = await res.json()
                const list: Holiday[] = data.holidays || []
                setHolidays(list)
                setHolidayProvider(data.provider || null)
                // Pre-select all
                setSelectedHolidays(new Set(list.map(h => h.date)))
            } else {
                const err = await res.json().catch(() => ({ error: "Failed to fetch" }))
                setHolidayError(err.error || "Failed to fetch holidays")
                setHolidays([])
            }
        } catch (error) {
            console.error("Error fetching holidays:", error)
            setHolidayError("Network error fetching holidays")
        } finally {
            setHolidayLoading(false)
        }
    }, [userCountry, holidayYear])

    const handleImportHolidays = useCallback(async () => {
        if (selectedHolidays.size === 0) return
        setSaving(true)
        let imported = 0
        let skipped = 0

        const selectedList = holidays.filter(h => selectedHolidays.has(h.date))

        for (const holiday of selectedList) {
            try {
                const res = await fetch("/api/date-overrides", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        date: holiday.date,
                        isBlocked: true,
                        reason: holiday.name,
                    })
                })
                if (res.ok) {
                    imported++
                } else if (res.status === 409) {
                    skipped++ // Already exists
                } else {
                    skipped++
                }
            } catch {
                skipped++
            }
        }

        setImportResult({ imported, skipped })
        fetchOverrides()
        setSaving(false)
    }, [selectedHolidays, holidays, fetchOverrides])

    const toggleHoliday = (date: string) => {
        setSelectedHolidays(prev => {
            const next = new Set(prev)
            if (next.has(date)) {
                next.delete(date)
            } else {
                next.add(date)
            }
            return next
        })
    }

    if (status === "loading" || loading) {
        return (
            <div className="max-w-4xl mx-auto">
                        <div className="h-10 w-48 bg-slate-700 rounded animate-pulse mb-2" />
                        <div className="h-5 w-72 bg-slate-800 rounded animate-pulse mb-8" />
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="card h-20 animate-pulse bg-slate-800/50" />
                            ))}
                        </div>
            </div>
        )
    }

    if (!session) {
        redirect("/login")
    }

    return (
        <>
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

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => {
                                    setShowHolidayModal(true)
                                    setImportResult(null)
                                    if (userCountry) fetchHolidays()
                                }}
                                className="btn btn-outline flex items-center gap-2"
                            >
                                <Globe size={18} />
                                Import Holidays
                            </button>
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

            {/* Import Holidays Modal */}
            {showHolidayModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowHolidayModal(false)} />
                    <div className="relative w-full max-w-2xl glass rounded-2xl animate-fade-in max-h-[80vh] flex flex-col">
                        <div className="flex items-center justify-between p-6 border-b border-slate-700">
                            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                                <Globe size={20} className="text-indigo-400" />
                                Import National Holidays
                            </h2>
                            <button
                                onClick={() => setShowHolidayModal(false)}
                                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4 overflow-y-auto flex-1">
                            {!userCountry ? (
                                <div className="text-center py-8">
                                    <AlertCircle size={40} className="mx-auto text-amber-400 mb-3" />
                                    <p className="text-text mb-2">No country set</p>
                                    <p className="text-text-secondary text-sm mb-4">
                                        Go to <a href="/settings/profile" className="text-indigo-400 hover:underline">Profile Settings</a> and
                                        set your country to import holidays.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {/* Year Selector */}
                                    <div className="flex items-center gap-4">
                                        <label className="label mb-0">Year</label>
                                        <select
                                            value={holidayYear}
                                            onChange={(e) => {
                                                setHolidayYear(parseInt(e.target.value))
                                                setHolidays([])
                                                setImportResult(null)
                                            }}
                                            className="input w-32"
                                        >
                                            {[0, 1, 2].map(offset => {
                                                const y = new Date().getFullYear() + offset
                                                return <option key={y} value={y}>{y}</option>
                                            })}
                                        </select>
                                        <button
                                            onClick={() => fetchHolidays()}
                                            disabled={holidayLoading}
                                            className="btn btn-outline text-sm"
                                        >
                                            {holidayLoading ? <span className="loading-spinner" /> : "Fetch Holidays"}
                                        </button>
                                        <span className="text-sm text-slate-400">
                                            Country: <span className="text-white font-medium">{userCountry}</span>
                                        </span>
                                    </div>

                                    {/* Import Result */}
                                    {importResult && (
                                        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                            <Check size={18} className="text-emerald-400" />
                                            <span className="text-sm text-emerald-400">
                                                Imported {importResult.imported} holidays
                                                {importResult.skipped > 0 && ` (${importResult.skipped} skipped — already exist)`}
                                            </span>
                                        </div>
                                    )}

                                    {/* Holidays List */}
                                    {holidayError && (
                                        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                                            <AlertCircle size={18} className="text-red-400 shrink-0" />
                                            <span className="text-sm text-red-400">{holidayError}</span>
                                        </div>
                                    )}

                                    {holidays.length > 0 ? (
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm text-slate-400">{holidays.length} holidays found</span>
                                                    {holidayProvider && (
                                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-700 text-slate-400">
                                                            via {holidayProvider === 'calendarific' ? 'Calendarific' : 'Nager.Date'}
                                                        </span>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        if (selectedHolidays.size === holidays.length) {
                                                            setSelectedHolidays(new Set())
                                                        } else {
                                                            setSelectedHolidays(new Set(holidays.map(h => h.date)))
                                                        }
                                                    }}
                                                    className="text-sm text-indigo-400 hover:text-indigo-300"
                                                >
                                                    {selectedHolidays.size === holidays.length ? "Deselect All" : "Select All"}
                                                </button>
                                            </div>
                                            {holidays.map(holiday => (
                                                <label
                                                    key={holiday.date}
                                                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800/50 cursor-pointer"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedHolidays.has(holiday.date)}
                                                        onChange={() => toggleHoliday(holiday.date)}
                                                        className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
                                                    />
                                                    <div className="flex-1">
                                                        <p className="text-white text-sm font-medium">{holiday.name}</p>
                                                        {holiday.localName !== holiday.name && (
                                                            <p className="text-slate-500 text-xs">{holiday.localName}</p>
                                                        )}
                                                    </div>
                                                    <span className="text-slate-400 text-sm">
                                                        {format(parseISO(holiday.date), "MMM d, yyyy")}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    ) : !holidayLoading ? (
                                        <p className="text-center text-slate-400 py-8">
                                            Click &quot;Fetch Holidays&quot; to load holidays for {holidayYear}
                                        </p>
                                    ) : null}
                                </>
                            )}
                        </div>

                        {userCountry && holidays.length > 0 && (
                            <div className="flex gap-3 p-6 border-t border-slate-700">
                                <button
                                    onClick={() => setShowHolidayModal(false)}
                                    className="btn btn-outline flex-1"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleImportHolidays}
                                    disabled={saving || selectedHolidays.size === 0}
                                    className="btn btn-primary flex-1 flex items-center justify-center gap-2"
                                >
                                    {saving ? (
                                        <span className="loading-spinner" />
                                    ) : (
                                        <>
                                            <Download size={16} />
                                            Import {selectedHolidays.size} Holiday{selectedHolidays.size !== 1 ? "s" : ""}
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    )
}

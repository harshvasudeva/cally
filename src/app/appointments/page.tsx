"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import Sidebar from "@/components/Sidebar"
import { Appointment } from "@/types"
import { format, parseISO } from "date-fns"
import {
    CalendarCheck, Clock, Mail, Phone, Check, X,
    Search, Trash2, CheckSquare, Square, Filter
} from "lucide-react"

export default function AppointmentsPage() {
    const { data: session, status } = useSession()
    const [appointments, setAppointments] = useState<Appointment[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<"all" | "pending" | "confirmed" | "cancelled">("all")
    const [searchQuery, setSearchQuery] = useState("") // (#88)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set()) // (#90)
    const [bulkLoading, setBulkLoading] = useState(false)

    useEffect(() => {
        fetchAppointments()
    }, [])

    const fetchAppointments = async () => {
        try {
            const res = await fetch("/api/appointments")
            const data = await res.json()
            setAppointments(data)
        } catch (error) {
            console.error("Error fetching appointments:", error)
        } finally {
            setLoading(false)
        }
    }

    const updateStatus = async (id: string, newStatus: string) => {
        try {
            await fetch(`/api/appointments/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus })
            })
            fetchAppointments()
        } catch (error) {
            console.error("Error updating appointment:", error)
        }
    }

    // (#90) Bulk actions
    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredAppointments.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(filteredAppointments.map(a => a.id)))
        }
    }

    const handleBulkAction = async (action: "CONFIRMED" | "CANCELLED" | "DELETE") => {
        if (selectedIds.size === 0) return
        setBulkLoading(true)
        try {
            await fetch("/api/appointments", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: Array.from(selectedIds), action })
            })
            setSelectedIds(new Set())
            fetchAppointments()
        } catch (error) {
            console.error("Error with bulk action:", error)
        } finally {
            setBulkLoading(false)
        }
    }

    if (status === "loading" || loading) {
        return (
            <div className="min-h-screen flex">
                <Sidebar />
                <main className="flex-1 p-6 md:p-8 overflow-auto">
                    <div className="max-w-6xl mx-auto">
                        <div className="mb-8">
                            <div className="h-8 w-48 bg-slate-700/50 rounded animate-pulse mb-2" />
                            <div className="h-4 w-64 bg-slate-700/50 rounded animate-pulse" />
                        </div>
                        <div className="flex gap-2 mb-6">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="h-10 w-24 bg-slate-700/50 rounded animate-pulse" />
                            ))}
                        </div>
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="card animate-pulse">
                                    <div className="flex gap-4">
                                        <div className="w-24 h-20 bg-slate-700/50 rounded-lg" />
                                        <div className="flex-1 space-y-3">
                                            <div className="h-5 w-48 bg-slate-700/50 rounded" />
                                            <div className="h-4 w-32 bg-slate-700/50 rounded" />
                                            <div className="h-4 w-40 bg-slate-700/50 rounded" />
                                        </div>
                                    </div>
                                </div>
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

    // (#88) Filter by status and search
    const filteredAppointments = appointments
        .filter(a => filter === "all" || a.status === filter.toUpperCase())
        .filter(a => {
            if (!searchQuery) return true
            const q = searchQuery.toLowerCase()
            return (
                a.guestName.toLowerCase().includes(q) ||
                a.guestEmail.toLowerCase().includes(q) ||
                a.title.toLowerCase().includes(q)
            )
        })

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "PENDING":
                return <span className="px-2 py-1 rounded-full text-xs font-medium status-pending">Pending</span>
            case "CONFIRMED":
                return <span className="px-2 py-1 rounded-full text-xs font-medium status-confirmed">Confirmed</span>
            case "CANCELLED":
                return <span className="px-2 py-1 rounded-full text-xs font-medium status-cancelled">Cancelled</span>
            default:
                return null
        }
    }

    const counts = {
        all: appointments.length,
        pending: appointments.filter(a => a.status === "PENDING").length,
        confirmed: appointments.filter(a => a.status === "CONFIRMED").length,
        cancelled: appointments.filter(a => a.status === "CANCELLED").length,
    }

    return (
        <div className="min-h-screen flex">
            <Sidebar />

            <main className="flex-1 p-6 md:p-8 overflow-auto">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-white">Appointments</h1>
                            <p className="text-slate-400 mt-1">Manage your scheduled appointments</p>
                        </div>
                    </div>

                    {/* (#88) Search Bar */}
                    <div className="mb-6">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by guest name, email, or title..."
                                className="input pl-12"
                            />
                        </div>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex gap-2">
                            {(["all", "pending", "confirmed", "cancelled"] as const).map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`btn ${filter === f ? "btn-primary" : "btn-outline"} capitalize`}
                                >
                                    {f}
                                    <span className="ml-1.5 text-xs opacity-75">
                                        ({counts[f]})
                                    </span>
                                </button>
                            ))}
                        </div>

                        {/* (#90) Bulk Actions */}
                        {selectedIds.size > 0 && (
                            <div className="flex items-center gap-2 animate-fade-in">
                                <span className="text-sm text-slate-400">
                                    {selectedIds.size} selected
                                </span>
                                <button
                                    onClick={() => handleBulkAction("CONFIRMED")}
                                    disabled={bulkLoading}
                                    className="btn btn-success text-sm"
                                >
                                    <Check size={14} className="mr-1" />
                                    Confirm All
                                </button>
                                <button
                                    onClick={() => handleBulkAction("CANCELLED")}
                                    disabled={bulkLoading}
                                    className="btn btn-outline text-sm"
                                >
                                    <X size={14} className="mr-1" />
                                    Cancel All
                                </button>
                                <button
                                    onClick={() => handleBulkAction("DELETE")}
                                    disabled={bulkLoading}
                                    className="btn btn-danger text-sm"
                                >
                                    <Trash2 size={14} className="mr-1" />
                                    Delete
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Select All */}
                    {filteredAppointments.length > 0 && (
                        <div className="flex items-center gap-2 mb-4">
                            <button
                                onClick={toggleSelectAll}
                                className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
                            >
                                {selectedIds.size === filteredAppointments.length ? (
                                    <CheckSquare size={16} className="text-indigo-400" />
                                ) : (
                                    <Square size={16} />
                                )}
                                Select all ({filteredAppointments.length})
                            </button>
                        </div>
                    )}

                    {/* Appointments List */}
                    {filteredAppointments.length === 0 ? (
                        <div className="card text-center py-12">
                            <CalendarCheck size={48} className="mx-auto text-slate-600 mb-4" />
                            <p className="text-slate-400">
                                {searchQuery ? "No appointments match your search" : "No appointments found"}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredAppointments.map((appointment) => (
                                <div
                                    key={appointment.id}
                                    className={`card card-hover transition-all ${selectedIds.has(appointment.id) ? "ring-2 ring-indigo-500/50" : ""
                                        }`}
                                >
                                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                                        {/* (#90) Checkbox */}
                                        <button
                                            onClick={() => toggleSelect(appointment.id)}
                                            className="flex-shrink-0 text-slate-400 hover:text-indigo-400"
                                        >
                                            {selectedIds.has(appointment.id) ? (
                                                <CheckSquare size={20} className="text-indigo-400" />
                                            ) : (
                                                <Square size={20} />
                                            )}
                                        </button>

                                        {/* Date/Time */}
                                        <div className="flex-shrink-0 w-24 text-center p-4 rounded-lg bg-slate-800">
                                            <p className="text-2xl font-bold text-white">
                                                {format(parseISO(appointment.start), "d")}
                                            </p>
                                            <p className="text-sm text-slate-400">
                                                {format(parseISO(appointment.start), "MMM yyyy")}
                                            </p>
                                        </div>

                                        {/* Details */}
                                        <div className="flex-1">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h3 className="text-lg font-semibold text-white">{appointment.title}</h3>
                                                    <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                                                        <span className="flex items-center gap-1">
                                                            <Clock size={14} />
                                                            {format(parseISO(appointment.start), "h:mm a")} - {format(parseISO(appointment.end), "h:mm a")}
                                                        </span>
                                                        {appointment.appointmentType && (
                                                            <span
                                                                className="px-2 py-0.5 rounded text-xs"
                                                                style={{
                                                                    backgroundColor: appointment.appointmentType.color + "20",
                                                                    color: appointment.appointmentType.color
                                                                }}
                                                            >
                                                                {appointment.appointmentType.name}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                {getStatusBadge(appointment.status)}
                                            </div>

                                            {/* Guest Info */}
                                            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm">
                                                <span className="flex items-center gap-2 text-slate-300">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                                                        <span className="text-indigo-400 font-medium">
                                                            {appointment.guestName.charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                    {appointment.guestName}
                                                </span>
                                                <a
                                                    href={`mailto:${appointment.guestEmail}`}
                                                    className="flex items-center gap-1 text-slate-400 hover:text-indigo-400"
                                                >
                                                    <Mail size={14} />
                                                    {appointment.guestEmail}
                                                </a>
                                                {appointment.guestPhone && (
                                                    <a
                                                        href={`tel:${appointment.guestPhone}`}
                                                        className="flex items-center gap-1 text-slate-400 hover:text-indigo-400"
                                                    >
                                                        <Phone size={14} />
                                                        {appointment.guestPhone}
                                                    </a>
                                                )}
                                            </div>

                                            {appointment.guestNotes && (
                                                <p className="mt-3 text-sm text-slate-400 italic">
                                                    &quot;{appointment.guestNotes}&quot;
                                                </p>
                                            )}

                                            {appointment.negotiationNote && (
                                                <div className="mt-3 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                                                    <p className="text-xs font-bold text-orange-400 uppercase tracking-wide mb-1">
                                                        Negotiation Request
                                                    </p>
                                                    <p className="text-sm text-slate-300">
                                                        {appointment.negotiationNote}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        {appointment.status === "PENDING" && (
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => updateStatus(appointment.id, "CONFIRMED")}
                                                    className="btn btn-success flex items-center gap-2"
                                                >
                                                    <Check size={16} />
                                                    Confirm
                                                </button>
                                                <button
                                                    onClick={() => updateStatus(appointment.id, "CANCELLED")}
                                                    className="btn btn-outline flex items-center gap-2"
                                                >
                                                    <X size={16} />
                                                    Decline
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}

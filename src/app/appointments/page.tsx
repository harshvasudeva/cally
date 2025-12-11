"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import Sidebar from "@/components/Sidebar"
import { Appointment } from "@/types"
import { format, parseISO } from "date-fns"
import { CalendarCheck, Clock, Mail, Phone, Check, X, ExternalLink } from "lucide-react"

export default function AppointmentsPage() {
    const { data: session, status } = useSession()
    const [appointments, setAppointments] = useState<Appointment[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<"all" | "pending" | "confirmed" | "cancelled">("all")

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

    const filteredAppointments = filter === "all"
        ? appointments
        : appointments.filter(a => a.status === filter.toUpperCase())

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

                    {/* Filter Tabs */}
                    <div className="flex gap-2 mb-6">
                        {(["all", "pending", "confirmed", "cancelled"] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`btn ${filter === f ? "btn-primary" : "btn-outline"} capitalize`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>

                    {/* Appointments List */}
                    {filteredAppointments.length === 0 ? (
                        <div className="card text-center py-12">
                            <CalendarCheck size={48} className="mx-auto text-slate-600 mb-4" />
                            <p className="text-slate-400">No appointments found</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredAppointments.map((appointment) => (
                                <div key={appointment.id} className="card card-hover">
                                    <div className="flex flex-col md:flex-row md:items-center gap-4">
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

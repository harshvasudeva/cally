"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import Sidebar from "@/components/Sidebar"
import { Shield, ChevronLeft, ChevronRight, Filter } from "lucide-react"
import { format, parseISO } from "date-fns"

interface AuditEntry {
    id: string
    timestamp: string
    userId: string
    userName: string
    action: string
    entity: string
    details: string
    ipAddress: string
}

interface AuditResponse {
    entries: AuditEntry[]
    total: number
    page: number
    totalPages: number
}

const ACTION_TYPES = [
    "All",
    "LOGIN",
    "REGISTER",
    "SETTING_CHANGE",
    "APPOINTMENT_CREATE",
    "APPOINTMENT_UPDATE",
    "APPOINTMENT_DELETE",
    "TYPE_CREATE",
    "TYPE_UPDATE",
    "TYPE_DELETE",
    "USER_UPDATE",
    "USER_DELETE"
]

function getActionColor(action: string): string {
    if (action.includes("CREATE") || action === "REGISTER") return "text-emerald-400 bg-emerald-500/20"
    if (action.includes("UPDATE") || action.includes("CHANGE")) return "text-amber-400 bg-amber-500/20"
    if (action.includes("DELETE")) return "text-red-400 bg-red-500/20"
    if (action === "LOGIN") return "text-blue-400 bg-blue-500/20"
    return "text-slate-400 bg-slate-500/20"
}

function parseDetails(details: string): string {
    try {
        const parsed = JSON.parse(details)
        const keys = Object.keys(parsed)
        return keys
            .slice(0, 3)
            .map((k) => `${k}: ${parsed[k]}`)
            .join(", ")
    } catch {
        return details || "-"
    }
}

export default function AuditLogPage() {
    const { data: session, status } = useSession()
    const [data, setData] = useState<AuditResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [actionFilter, setActionFilter] = useState("All")
    const limit = 20

    useEffect(() => {
        fetchAuditLog()
    }, [page, actionFilter])

    const fetchAuditLog = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({
                page: String(page),
                limit: String(limit)
            })
            if (actionFilter !== "All") {
                params.set("action", actionFilter)
            }
            const res = await fetch(`/api/admin/audit?${params.toString()}`)
            const json = await res.json()
            setData(json)
        } catch (error) {
            console.error("Error fetching audit log:", error)
        } finally {
            setLoading(false)
        }
    }

    const isAdmin = (session?.user as { role?: string })?.role === "ADMIN"

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="loading-spinner" />
            </div>
        )
    }

    if (!session) {
        redirect("/login")
    }

    if (!isAdmin) {
        redirect("/calendar")
    }

    return (
        <div className="min-h-screen flex">
            <Sidebar />

            <main className="flex-1 p-6 md:p-8 overflow-auto">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                                <Shield className="text-indigo-400" />
                                Audit Log
                            </h1>
                            <p className="text-slate-400 mt-1">Track all system activity and user actions</p>
                        </div>

                        {/* Filter */}
                        <div className="flex items-center gap-2">
                            <Filter size={18} className="text-slate-400" />
                            <select
                                value={actionFilter}
                                onChange={(e) => {
                                    setActionFilter(e.target.value)
                                    setPage(1)
                                }}
                                className="input w-auto"
                            >
                                {ACTION_TYPES.map((action) => (
                                    <option key={action} value={action}>
                                        {action === "All" ? "All Actions" : action.replace(/_/g, " ")}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="card overflow-hidden">
                        {loading ? (
                            <div className="space-y-4 p-6">
                                {Array.from({ length: 8 }).map((_, i) => (
                                    <div key={i} className="h-10 bg-slate-800 rounded animate-pulse" />
                                ))}
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-700">
                                            <th className="text-left p-4 text-slate-400 font-medium">Timestamp</th>
                                            <th className="text-left p-4 text-slate-400 font-medium">User</th>
                                            <th className="text-left p-4 text-slate-400 font-medium">Action</th>
                                            <th className="text-left p-4 text-slate-400 font-medium">Entity</th>
                                            <th className="text-left p-4 text-slate-400 font-medium">Details</th>
                                            <th className="text-left p-4 text-slate-400 font-medium">IP Address</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data?.entries && data.entries.length > 0 ? (
                                            data.entries.map((entry) => (
                                                <tr key={entry.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                                                    <td className="p-4 text-slate-300 whitespace-nowrap">
                                                        {format(parseISO(entry.timestamp), "MMM d, yyyy h:mm a")}
                                                    </td>
                                                    <td className="p-4 text-slate-300">{entry.userName}</td>
                                                    <td className="p-4">
                                                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getActionColor(entry.action)}`}>
                                                            {entry.action.replace(/_/g, " ")}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-slate-300">{entry.entity}</td>
                                                    <td className="p-4 text-slate-400 max-w-xs truncate">
                                                        {parseDetails(entry.details)}
                                                    </td>
                                                    <td className="p-4 text-slate-500 font-mono text-xs">{entry.ipAddress}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={6} className="p-8 text-center text-slate-400">
                                                    No audit log entries found.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Pagination */}
                        {data && data.totalPages > 1 && (
                            <div className="flex items-center justify-between p-4 border-t border-slate-700">
                                <p className="text-sm text-slate-400">
                                    Page {data.page} of {data.totalPages} ({data.total} total entries)
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                                        disabled={page <= 1}
                                        className="btn btn-outline flex items-center gap-1 text-sm disabled:opacity-50"
                                    >
                                        <ChevronLeft size={16} />
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                                        disabled={page >= data.totalPages}
                                        className="btn btn-outline flex items-center gap-1 text-sm disabled:opacity-50"
                                    >
                                        Next
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}

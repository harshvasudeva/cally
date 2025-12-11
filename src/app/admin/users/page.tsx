"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import Sidebar from "@/components/Sidebar"
import { User } from "@/types"
import { format, parseISO } from "date-fns"
import { Users, Shield, UserCheck, Trash2, Search } from "lucide-react"

export default function UsersPage() {
    const { data: session, status } = useSession()
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")

    useEffect(() => {
        fetchUsers()
    }, [])

    const fetchUsers = async () => {
        try {
            const res = await fetch("/api/admin/users")
            const data = await res.json()
            if (res.ok) {
                setUsers(data)
            }
        } catch (error) {
            console.error("Error fetching users:", error)
        } finally {
            setLoading(false)
        }
    }

    const isAdmin = (session?.user as { role?: string })?.role === "ADMIN"

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

    if (!isAdmin) {
        redirect("/calendar")
    }

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="min-h-screen flex">
            <Sidebar />

            <main className="flex-1 p-6 md:p-8 overflow-auto">
                <div className="max-w-6xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                                <Users className="text-indigo-400" />
                                Users
                            </h1>
                            <p className="text-slate-400 mt-1">Manage user accounts</p>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="mb-6">
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search users..."
                                className="input pl-12"
                            />
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="card">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                                    <Users className="text-indigo-400" size={20} />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-white">{users.length}</p>
                                    <p className="text-sm text-slate-400">Total Users</p>
                                </div>
                            </div>
                        </div>
                        <div className="card">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                    <Shield className="text-purple-400" size={20} />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-white">
                                        {users.filter(u => u.role === "ADMIN").length}
                                    </p>
                                    <p className="text-sm text-slate-400">Admins</p>
                                </div>
                            </div>
                        </div>
                        <div className="card">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                                    <UserCheck className="text-emerald-400" size={20} />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-white">
                                        {users.filter(u => u.role === "USER").length}
                                    </p>
                                    <p className="text-sm text-slate-400">Regular Users</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Users Table */}
                    <div className="card overflow-hidden p-0">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-700">
                                    <th className="text-left p-4 text-sm font-medium text-slate-400">User</th>
                                    <th className="text-left p-4 text-sm font-medium text-slate-400">Role</th>
                                    <th className="text-left p-4 text-sm font-medium text-slate-400">Timezone</th>
                                    <th className="text-left p-4 text-sm font-medium text-slate-400">Booking Link</th>
                                    <th className="text-left p-4 text-sm font-medium text-slate-400">Joined</th>
                                    <th className="p-4"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className="border-b border-slate-700/50 hover:bg-slate-800/50">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                                                    <span className="text-white font-semibold">
                                                        {user.name.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="font-medium text-white">{user.name}</p>
                                                    <p className="text-sm text-slate-400">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.role === "ADMIN"
                                                    ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                                                    : "bg-slate-700 text-slate-300"
                                                }`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="p-4 text-slate-400 text-sm">{user.timezone}</td>
                                        <td className="p-4">
                                            <code className="text-xs text-indigo-400 bg-slate-800 px-2 py-1 rounded">
                                                /book/{user.slug}
                                            </code>
                                        </td>
                                        <td className="p-4 text-slate-400 text-sm">
                                            {format(parseISO(user.createdAt), "MMM d, yyyy")}
                                        </td>
                                        <td className="p-4">
                                            <button className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-700">
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {filteredUsers.length === 0 && (
                            <div className="text-center py-12">
                                <Users size={48} className="mx-auto text-slate-600 mb-4" />
                                <p className="text-slate-400">No users found</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}

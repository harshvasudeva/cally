"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import {
    Calendar,
    LayoutDashboard,
    Clock,
    Users,
    Settings,
    LogOut,
    Menu,
    X,
    CalendarCheck,
    Download,
    Upload
} from "lucide-react"

const navItems = [
    { href: "/calendar", label: "Calendar", icon: Calendar },
    { href: "/appointments", label: "Appointments", icon: CalendarCheck },
    { href: "/availability", label: "Availability", icon: Clock },
    { href: "/appointment-types", label: "Event Types", icon: LayoutDashboard },
]

const adminItems = [
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/settings", label: "Settings", icon: Settings },
]

export default function Sidebar() {
    const [isOpen, setIsOpen] = useState(false)
    const pathname = usePathname()
    const { data: session } = useSession()

    const isAdmin = (session?.user as { role?: string })?.role === "ADMIN"
    const userSlug = (session?.user as { slug?: string })?.slug

    return (
        <>
            {/* Mobile Toggle */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-slate-800 text-white"
            >
                {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Overlay */}
            {isOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/50 z-40"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
          fixed md:static inset-y-0 left-0 z-50 w-64 
          bg-slate-900 border-r border-slate-700
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
            >
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="p-6 border-b border-slate-700">
                        <Link href="/calendar" className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                                <Calendar size={24} className="text-white" />
                            </div>
                            <span className="text-xl font-bold text-white">Cally</span>
                        </Link>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-4 space-y-1">
                        {navItems.map((item) => {
                            const Icon = item.icon
                            const isActive = pathname === item.href
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsOpen(false)}
                                    className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg
                    transition-all duration-200
                    ${isActive
                                            ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                                            : "text-slate-400 hover:text-white hover:bg-slate-800"
                                        }
                  `}
                                >
                                    <Icon size={20} />
                                    <span className="font-medium">{item.label}</span>
                                </Link>
                            )
                        })}

                        {/* Import/Export Section */}
                        <div className="pt-4 mt-4 border-t border-slate-700">
                            <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                Import / Export
                            </p>
                            <a
                                href="/api/calendar"
                                className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all duration-200"
                            >
                                <Download size={20} />
                                <span className="font-medium">Export Calendar</span>
                            </a>
                            <Link
                                href="/import"
                                onClick={() => setIsOpen(false)}
                                className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all duration-200"
                            >
                                <Upload size={20} />
                                <span className="font-medium">Import Calendar</span>
                            </Link>
                        </div>

                        {/* Admin Section */}
                        {isAdmin && (
                            <div className="pt-4 mt-4 border-t border-slate-700">
                                <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                    Admin
                                </p>
                                {adminItems.map((item) => {
                                    const Icon = item.icon
                                    const isActive = pathname === item.href
                                    return (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => setIsOpen(false)}
                                            className={`
                        flex items-center gap-3 px-4 py-3 rounded-lg
                        transition-all duration-200
                        ${isActive
                                                    ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                                                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                                                }
                      `}
                                        >
                                            <Icon size={20} />
                                            <span className="font-medium">{item.label}</span>
                                        </Link>
                                    )
                                })}
                            </div>
                        )}
                    </nav>

                    {/* Booking Link */}
                    {userSlug && (
                        <div className="p-4 border-t border-slate-700">
                            <div className="p-4 rounded-lg bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30">
                                <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-2">
                                    Your Booking Link
                                </p>
                                <code className="text-sm text-slate-300 break-all">
                                    /book/{userSlug}
                                </code>
                            </div>
                        </div>
                    )}

                    {/* User Section */}
                    <div className="p-4 border-t border-slate-700">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                                <span className="text-white font-semibold">
                                    {session?.user?.name?.charAt(0).toUpperCase()}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">
                                    {session?.user?.name}
                                </p>
                                <p className="text-xs text-slate-400 truncate">
                                    {session?.user?.email}
                                </p>
                            </div>
                            <button
                                onClick={() => signOut({ callbackUrl: "/login" })}
                                className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
                                title="Sign out"
                            >
                                <LogOut size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    )
}

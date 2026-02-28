"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import {
    Calendar,
    CalendarCheck,
    Clock,
    LayoutDashboard,
    Settings,
    Users,
    Shield,
    FileText,
    Search,
    Command,
} from "lucide-react"

interface PaletteItem {
    label: string
    href: string
    icon: typeof Calendar
    admin?: boolean
}

const allItems: PaletteItem[] = [
    { label: "Calendar", href: "/calendar", icon: Calendar },
    { label: "Appointments", href: "/appointments", icon: CalendarCheck },
    { label: "Availability", href: "/availability", icon: Clock },
    { label: "Event Types", href: "/appointment-types", icon: LayoutDashboard },
    { label: "Settings", href: "/settings/profile", icon: Settings },
    // Admin-only items
    { label: "Users", href: "/admin/users", icon: Users, admin: true },
    { label: "Admin Settings", href: "/admin/settings", icon: Shield, admin: true },
    { label: "Audit Log", href: "/admin/audit-log", icon: FileText, admin: true },
]

export default function CommandPalette() {
    const [isOpen, setIsOpen] = useState(false)
    const [query, setQuery] = useState("")
    const [activeIndex, setActiveIndex] = useState(0)
    const inputRef = useRef<HTMLInputElement>(null)
    const listRef = useRef<HTMLDivElement>(null)
    const router = useRouter()
    const { data: session } = useSession()

    const isAdmin = (session?.user as { role?: string })?.role === "ADMIN"

    const filteredItems = useMemo(() => {
        const items = allItems.filter((item) => {
            if (item.admin && !isAdmin) return false
            if (!query) return true
            return item.label.toLowerCase().includes(query.toLowerCase())
        })
        return items
    }, [query, isAdmin])

    // Open/close with keyboard shortcut
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault()
                setIsOpen((prev) => !prev)
            }
        }
        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown)
    }, [])

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setQuery("")
            setActiveIndex(0)
            // Small delay so the DOM is ready
            setTimeout(() => inputRef.current?.focus(), 50)
        }
    }, [isOpen])

    // Reset active index when query changes
    useEffect(() => {
        setActiveIndex(0)
    }, [query])

    // Scroll active item into view
    useEffect(() => {
        if (!listRef.current) return
        const active = listRef.current.children[activeIndex] as HTMLElement | undefined
        active?.scrollIntoView({ block: "nearest" })
    }, [activeIndex])

    const close = useCallback(() => setIsOpen(false), [])

    const navigate = useCallback(
        (href: string) => {
            close()
            router.push(href)
        },
        [close, router],
    )

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            switch (e.key) {
                case "ArrowDown":
                    e.preventDefault()
                    setActiveIndex((i) =>
                        i < filteredItems.length - 1 ? i + 1 : 0,
                    )
                    break
                case "ArrowUp":
                    e.preventDefault()
                    setActiveIndex((i) =>
                        i > 0 ? i - 1 : filteredItems.length - 1,
                    )
                    break
                case "Enter":
                    e.preventDefault()
                    if (filteredItems[activeIndex]) {
                        navigate(filteredItems[activeIndex].href)
                    }
                    break
                case "Escape":
                    e.preventDefault()
                    close()
                    break
            }
        },
        [filteredItems, activeIndex, navigate, close],
    )

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[9998] flex items-start justify-center pt-[20vh]">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={close}
            />

            {/* Palette */}
            <div
                className="relative glass rounded-xl shadow-2xl shadow-black/40 w-full max-w-lg mx-4 overflow-hidden animate-fade-in"
                onKeyDown={handleKeyDown}
            >
                {/* Search input */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/60">
                    <Search size={18} className="text-slate-400 shrink-0" />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search pages..."
                        className="flex-1 bg-transparent text-slate-200 placeholder-slate-500 text-sm outline-none"
                    />
                    <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-700/60 text-[11px] text-slate-400 font-mono">
                        <Command size={11} /> K
                    </kbd>
                </div>

                {/* Results */}
                <div
                    ref={listRef}
                    className="max-h-72 overflow-y-auto py-2"
                >
                    {filteredItems.length === 0 && (
                        <p className="px-4 py-8 text-center text-sm text-slate-500">
                            No results found.
                        </p>
                    )}

                    {filteredItems.map((item, idx) => {
                        const Icon = item.icon
                        const isActive = idx === activeIndex

                        return (
                            <button
                                key={item.href}
                                onClick={() => navigate(item.href)}
                                onMouseEnter={() => setActiveIndex(idx)}
                                className={`
                                    w-full flex items-center gap-3 px-4 py-2.5 text-left
                                    transition-colors text-sm
                                    ${isActive
                                        ? "bg-indigo-500/20 text-indigo-300"
                                        : "text-slate-300 hover:bg-slate-700/40"
                                    }
                                `}
                            >
                                <Icon size={18} className="shrink-0" />
                                <span className="font-medium">{item.label}</span>
                                {item.admin && (
                                    <span className="ml-auto text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                                        Admin
                                    </span>
                                )}
                            </button>
                        )
                    })}
                </div>

                {/* Footer hint */}
                <div className="flex items-center gap-4 px-4 py-2.5 border-t border-slate-700/60 text-[11px] text-slate-500">
                    <span className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 rounded bg-slate-700/60 font-mono">
                            &uarr;&darr;
                        </kbd>
                        navigate
                    </span>
                    <span className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 rounded bg-slate-700/60 font-mono">
                            &crarr;
                        </kbd>
                        open
                    </span>
                    <span className="flex items-center gap-1">
                        <kbd className="px-1.5 py-0.5 rounded bg-slate-700/60 font-mono">
                            esc
                        </kbd>
                        close
                    </span>
                </div>
            </div>
        </div>
    )
}

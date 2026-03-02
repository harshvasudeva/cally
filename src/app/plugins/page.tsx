"use client"

import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import { Puzzle, Zap, Calendar, MessageSquare, Video, Mail, Webhook, Globe } from "lucide-react"

const COMING_SOON_PLUGINS = [
    { name: "Google Calendar Sync", description: "Two-way sync with Google Calendar", icon: Calendar, color: "text-blue-400", bg: "bg-blue-500/20" },
    { name: "Zoom Integration", description: "Auto-generate Zoom meeting links for appointments", icon: Video, color: "text-sky-400", bg: "bg-sky-500/20" },
    { name: "Discord Bot", description: "Manage bookings and get notifications via Discord", icon: MessageSquare, color: "text-indigo-400", bg: "bg-indigo-500/20" },
    { name: "Email Reminders", description: "Automated email reminders before appointments", icon: Mail, color: "text-amber-400", bg: "bg-amber-500/20" },
    { name: "Webhook Actions", description: "Trigger custom webhooks on booking events", icon: Webhook, color: "text-emerald-400", bg: "bg-emerald-500/20" },
    { name: "Custom Embed", description: "Embed your booking page on any website", icon: Globe, color: "text-purple-400", bg: "bg-purple-500/20" },
]

export default function PluginsPage() {
    const { data: session, status } = useSession()

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

    return (
        <div className="max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-text flex items-center gap-3">
                        <Puzzle className="text-indigo-400" />
                        Plugins
                    </h1>
                    <p className="text-text-secondary mt-1">Extend your calendar with integrations and automations</p>
                </div>
            </div>

            {/* Active plugins - empty state */}
            <div className="card text-center py-12 mb-8">
                <Zap size={48} className="mx-auto text-slate-600 mb-4" />
                <h2 className="text-lg font-semibold text-text mb-2">No plugins installed</h2>
                <p className="text-text-secondary text-sm">Plugins will be available soon. Check back for integrations!</p>
            </div>

            {/* Coming Soon */}
            <h2 className="text-lg font-semibold text-text mb-4">Coming Soon</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {COMING_SOON_PLUGINS.map((plugin) => {
                    const Icon = plugin.icon
                    return (
                        <div key={plugin.name} className="card opacity-60 cursor-not-allowed">
                            <div className="flex items-start gap-3">
                                <div className={`w-10 h-10 rounded-lg ${plugin.bg} flex items-center justify-center shrink-0`}>
                                    <Icon className={plugin.color} size={20} />
                                </div>
                                <div>
                                    <h3 className="font-medium text-text">{plugin.name}</h3>
                                    <p className="text-text-secondary text-sm mt-1">{plugin.description}</p>
                                    <span className="inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-700 text-slate-400">
                                        Coming Soon
                                    </span>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

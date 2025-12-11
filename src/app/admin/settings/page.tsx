"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import Sidebar from "@/components/Sidebar"
import { Settings, Save, Mail, Check } from "lucide-react"

interface SiteSettings {
    siteName: string
    siteDescription: string
    primaryColor: string
    allowRegistration: boolean
    emailFrom: string
    smtpHost: string
    smtpPort: number
    smtpUser: string
    smtpPass: string
}

export default function SettingsPage() {
    const { data: session, status } = useSession()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [settings, setSettings] = useState<SiteSettings>({
        siteName: "Cally",
        siteDescription: "Self-hosted calendar and scheduling",
        primaryColor: "#6366f1",
        allowRegistration: true,
        emailFrom: "",
        smtpHost: "",
        smtpPort: 587,
        smtpUser: "",
        smtpPass: ""
    })

    useEffect(() => {
        // For now, use default settings since we don't have a settings API yet
        setLoading(false)
    }, [])

    const handleSave = async () => {
        setSaving(true)
        // TODO: Implement settings API
        await new Promise(resolve => setTimeout(resolve, 1000))
        setSaving(false)
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
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

    return (
        <div className="min-h-screen flex">
            <Sidebar />

            <main className="flex-1 p-6 md:p-8 overflow-auto">
                <div className="max-w-3xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                                <Settings className="text-indigo-400" />
                                Settings
                            </h1>
                            <p className="text-slate-400 mt-1">Configure your Cally instance</p>
                        </div>

                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="btn btn-primary flex items-center gap-2"
                        >
                            {saving ? (
                                <span className="loading-spinner" />
                            ) : saved ? (
                                <>
                                    <Check size={18} className="text-emerald-400" />
                                    Saved!
                                </>
                            ) : (
                                <>
                                    <Save size={18} />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>

                    {/* General Settings */}
                    <div className="card mb-6">
                        <h2 className="text-lg font-semibold text-white mb-4">General</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="label">Site Name</label>
                                <input
                                    type="text"
                                    value={settings.siteName}
                                    onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                                    className="input"
                                />
                            </div>

                            <div>
                                <label className="label">Site Description</label>
                                <input
                                    type="text"
                                    value={settings.siteDescription}
                                    onChange={(e) => setSettings({ ...settings, siteDescription: e.target.value })}
                                    className="input"
                                />
                            </div>

                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="allowReg"
                                    checked={settings.allowRegistration}
                                    onChange={(e) => setSettings({ ...settings, allowRegistration: e.target.checked })}
                                    className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
                                />
                                <label htmlFor="allowReg" className="text-slate-300">
                                    Allow new user registrations
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Email Settings */}
                    <div className="card">
                        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <Mail className="text-indigo-400" />
                            Email Configuration (SMTP)
                        </h2>
                        <p className="text-sm text-slate-400 mb-4">
                            Configure email settings to send appointment confirmations and reminders
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="label">From Email</label>
                                <input
                                    type="email"
                                    value={settings.emailFrom}
                                    onChange={(e) => setSettings({ ...settings, emailFrom: e.target.value })}
                                    className="input"
                                    placeholder="noreply@yourdomain.com"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">SMTP Host</label>
                                    <input
                                        type="text"
                                        value={settings.smtpHost}
                                        onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })}
                                        className="input"
                                        placeholder="smtp.gmail.com"
                                    />
                                </div>
                                <div>
                                    <label className="label">SMTP Port</label>
                                    <input
                                        type="number"
                                        value={settings.smtpPort}
                                        onChange={(e) => setSettings({ ...settings, smtpPort: parseInt(e.target.value) })}
                                        className="input"
                                        placeholder="587"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">SMTP Username</label>
                                    <input
                                        type="text"
                                        value={settings.smtpUser}
                                        onChange={(e) => setSettings({ ...settings, smtpUser: e.target.value })}
                                        className="input"
                                        placeholder="your-email@gmail.com"
                                    />
                                </div>
                                <div>
                                    <label className="label">SMTP Password</label>
                                    <input
                                        type="password"
                                        value={settings.smtpPass}
                                        onChange={(e) => setSettings({ ...settings, smtpPass: e.target.value })}
                                        className="input"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="card mt-6 border-red-500/30">
                        <h2 className="text-lg font-semibold text-red-400 mb-4">Danger Zone</h2>
                        <p className="text-sm text-slate-400 mb-4">
                            These actions are irreversible. Please be careful.
                        </p>
                        <button className="btn btn-outline border-red-500/50 text-red-400 hover:bg-red-500/10">
                            Reset All Settings
                        </button>
                    </div>
                </div>
            </main>
        </div>
    )
}

"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import Sidebar from "@/components/Sidebar"
import { Settings, Save, Mail, Check, Shield, AlertTriangle } from "lucide-react"

interface SiteSettings {
    siteName: string
    siteDescription: string
    primaryColor: string
    emailFrom: string
    smtpHost: string
    smtpPort: number
    smtpUser: string
    smtpPass: string
    maintenanceMode: boolean
}

export default function SettingsPage() {
    const { data: session, status } = useSession()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null)
    const [settings, setSettings] = useState<SiteSettings>({
        siteName: "Cally",
        siteDescription: "Self-hosted calendar and scheduling",
        primaryColor: "#6366f1",
        allowRegistration: true,
        emailFrom: "",
        smtpHost: "",
        smtpPort: 587,
        smtpUser: "",
        smtpPass: "",
        maxLoginAttempts: 5,
        lockoutDuration: 15,
        maintenanceMode: false
    })

    useEffect(() => {
        fetchSettings()
    }, [])

    const fetchSettings = async () => {
        try {
            const res = await fetch("/api/admin/settings")
            if (res.ok) {
                const data = await res.json()
                setSettings((prev) => ({ ...prev, ...data }))
            }
        } catch (error) {
            console.error("Error fetching settings:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        setSaving(true)
        setFeedback(null)

        try {
            const res = await fetch("/api/admin/settings", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(settings)
            })

            if (res.ok) {
                setFeedback({ type: "success", message: "Settings saved successfully." })
            } else {
                const data = await res.json()
                setFeedback({ type: "error", message: data.error || "Failed to save settings." })
            }
        } catch (error) {
            setFeedback({ type: "error", message: "An error occurred while saving settings." })
        } finally {
            setSaving(false)
            setTimeout(() => setFeedback(null), 5000)
        }
    }

    const isAdmin = (session?.user as { role?: string })?.role === "ADMIN"

    if (status === "loading" || loading) {
        return (
            <div className="min-h-screen flex">
                <Sidebar />
                <main className="flex-1 p-6 md:p-8 overflow-auto">
                    <div className="max-w-3xl mx-auto">
                        <div className="h-10 w-48 bg-slate-700 rounded animate-pulse mb-2" />
                        <div className="h-5 w-72 bg-slate-800 rounded animate-pulse mb-8" />
                        <div className="space-y-6">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="card animate-pulse">
                                    <div className="h-6 w-32 bg-slate-700 rounded mb-4" />
                                    <div className="space-y-3">
                                        <div className="h-10 bg-slate-800 rounded" />
                                        <div className="h-10 bg-slate-800 rounded" />
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
                            ) : (
                                <>
                                    <Save size={18} />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>

                    {/* Feedback */}
                    {feedback && (
                        <div className={`mb-6 p-4 rounded-lg border text-sm flex items-center gap-2 ${
                            feedback.type === "success"
                                ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                                : "bg-red-500/20 border-red-500/30 text-red-400"
                        }`}>
                            {feedback.type === "success" ? <Check size={18} /> : <AlertTriangle size={18} />}
                            {feedback.message}
                        </div>
                    )}

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

                    {/* Security Settings */}
                    <div className="card mb-6">
                        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <Shield className="text-indigo-400" size={20} />
                            Security
                        </h2>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Max Login Attempts</label>
                                    <input
                                        type="number"
                                        value={settings.maxLoginAttempts}
                                        onChange={(e) => setSettings({ ...settings, maxLoginAttempts: parseInt(e.target.value) || 0 })}
                                        className="input"
                                        min={1}
                                        max={20}
                                    />
                                    <p className="text-xs text-slate-500 mt-1">Lock account after this many failed attempts</p>
                                </div>
                                <div>
                                    <label className="label">Lockout Duration (minutes)</label>
                                    <input
                                        type="number"
                                        value={settings.lockoutDuration}
                                        onChange={(e) => setSettings({ ...settings, lockoutDuration: parseInt(e.target.value) || 0 })}
                                        className="input"
                                        min={1}
                                        max={1440}
                                    />
                                    <p className="text-xs text-slate-500 mt-1">How long to lock the account</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Maintenance Mode */}
                    <div className="card mb-6">
                        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <AlertTriangle className="text-amber-400" size={20} />
                            Maintenance
                        </h2>

                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="maintenanceMode"
                                checked={settings.maintenanceMode}
                                onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                                className="w-5 h-5 rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
                            />
                            <div>
                                <label htmlFor="maintenanceMode" className="text-slate-300 font-medium">
                                    Enable Maintenance Mode
                                </label>
                                <p className="text-xs text-slate-500">
                                    When enabled, the site will show a maintenance page to non-admin users.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Email Settings */}
                    <div className="card mb-6">
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

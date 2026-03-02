"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import {
    Settings, Save, Mail, Check, Shield, AlertTriangle,
    Globe, Upload, Key, Bell, SendHorizonal, RefreshCw
} from "lucide-react"

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
    maxLoginAttempts: number
    lockoutDuration: number
    maintenanceMode: boolean
    fqdn: string
    sslMode: string
    sslCertPath: string
    sslKeyPath: string
    webhookUrl: string
    webhookSecret: string
    webhookEvents: string
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
        maintenanceMode: false,
        fqdn: "",
        sslMode: "auto",
        sslCertPath: "",
        sslKeyPath: "",
        webhookUrl: "",
        webhookSecret: "",
        webhookEvents: "[]",
    })
    const [testingEmail, setTestingEmail] = useState(false)
    const [uploadingCert, setUploadingCert] = useState(false)
    const certFileRef = useRef<HTMLInputElement>(null)
    const keyFileRef = useRef<HTMLInputElement>(null)

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

    const handleTestEmail = async () => {
        setTestingEmail(true)
        setFeedback(null)
        try {
            const res = await fetch("/api/admin/test-email", { method: "POST" })
            const data = await res.json()
            if (res.ok) {
                setFeedback({ type: "success", message: "Test email sent successfully! Check your inbox." })
            } else {
                setFeedback({ type: "error", message: data.error || "Failed to send test email." })
            }
        } catch {
            setFeedback({ type: "error", message: "Failed to send test email." })
        } finally {
            setTestingEmail(false)
            setTimeout(() => setFeedback(null), 5000)
        }
    }

    const handleUploadCerts = async () => {
        const certFile = certFileRef.current?.files?.[0]
        const keyFile = keyFileRef.current?.files?.[0]
        if (!certFile || !keyFile) {
            setFeedback({ type: "error", message: "Please select both certificate and key files." })
            return
        }
        setUploadingCert(true)
        setFeedback(null)
        try {
            const formData = new FormData()
            formData.append("cert", certFile)
            formData.append("key", keyFile)
            const res = await fetch("/api/admin/domain", { method: "POST", body: formData })
            const data = await res.json()
            if (res.ok) {
                setFeedback({ type: "success", message: "SSL certificates uploaded successfully." })
                setSettings(prev => ({ ...prev, sslCertPath: data.certPath, sslKeyPath: data.keyPath }))
            } else {
                setFeedback({ type: "error", message: data.error || "Failed to upload certificates." })
            }
        } catch {
            setFeedback({ type: "error", message: "Failed to upload certificates." })
        } finally {
            setUploadingCert(false)
            setTimeout(() => setFeedback(null), 5000)
        }
    }

    const handleSaveDomain = async () => {
        setSaving(true)
        setFeedback(null)
        try {
            const res = await fetch("/api/admin/domain", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fqdn: settings.fqdn, sslMode: settings.sslMode })
            })
            const data = await res.json()
            if (res.ok) {
                setFeedback({ type: "success", message: "Domain settings saved. Caddy config updated." })
            } else {
                setFeedback({ type: "error", message: data.error || "Failed to save domain settings." })
            }
        } catch {
            setFeedback({ type: "error", message: "Failed to save domain settings." })
        } finally {
            setSaving(false)
            setTimeout(() => setFeedback(null), 5000)
        }
    }

    const WEBHOOK_EVENT_OPTIONS = [
        { value: "appointment.created", label: "Appointment Created" },
        { value: "appointment.confirmed", label: "Appointment Confirmed" },
        { value: "appointment.cancelled", label: "Appointment Cancelled" },
        { value: "appointment.updated", label: "Appointment Updated" },
        { value: "user.registered", label: "User Registered" },
        { value: "settings.updated", label: "Settings Updated" },
    ]

    const toggleWebhookEvent = (event: string) => {
        const current: string[] = JSON.parse(settings.webhookEvents || "[]")
        const updated = current.includes(event)
            ? current.filter(e => e !== event)
            : [...current, event]
        setSettings({ ...settings, webhookEvents: JSON.stringify(updated) })
    }

    const webhookEventsArray: string[] = JSON.parse(settings.webhookEvents || "[]")

    if (status === "loading" || loading) {
        return (
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
        )
    }

    if (!session) {
        redirect("/login")
    }

    if (!isAdmin) {
        redirect("/calendar")
    }

    return (
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

                    {/* Domain & SSL Settings */}
                    <div className="card mb-6">
                        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <Globe className="text-indigo-400" size={20} />
                            Domain & SSL
                        </h2>
                        <p className="text-sm text-slate-400 mb-4">
                            Configure your domain name and SSL certificate for HTTPS access
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="label">Domain (FQDN)</label>
                                <input
                                    type="text"
                                    value={settings.fqdn}
                                    onChange={(e) => setSettings({ ...settings, fqdn: e.target.value })}
                                    className="input"
                                    placeholder="cal.yourdomain.com"
                                />
                                <p className="text-xs text-slate-500 mt-1">Your domain must point to this server&apos;s IP address</p>
                            </div>

                            <div>
                                <label className="label">SSL Mode</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { value: "auto", label: "Auto (Let's Encrypt)", desc: "Free automatic SSL" },
                                        { value: "custom", label: "Custom Certificate", desc: "Upload your own" },
                                        { value: "none", label: "No SSL", desc: "HTTP only (not recommended)" },
                                    ].map(option => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => setSettings({ ...settings, sslMode: option.value })}
                                            className={`p-3 rounded-lg border text-left transition-colors ${
                                                settings.sslMode === option.value
                                                    ? "border-indigo-500 bg-indigo-500/10"
                                                    : "border-white/10 hover:border-white/20"
                                            }`}
                                        >
                                            <p className="text-sm font-medium text-white">{option.label}</p>
                                            <p className="text-xs text-slate-400 mt-0.5">{option.desc}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {settings.sslMode === "custom" && (
                                <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-3">
                                    <p className="text-sm font-medium text-white flex items-center gap-2">
                                        <Upload size={16} />
                                        Upload SSL Certificate & Key
                                    </p>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="label text-xs">Certificate (.crt / .pem)</label>
                                            <input
                                                ref={certFileRef}
                                                type="file"
                                                accept=".crt,.pem,.cert"
                                                className="w-full text-sm text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-500/20 file:text-indigo-400 file:font-medium file:cursor-pointer hover:file:bg-indigo-500/30"
                                            />
                                        </div>
                                        <div>
                                            <label className="label text-xs">Private Key (.key / .pem)</label>
                                            <input
                                                ref={keyFileRef}
                                                type="file"
                                                accept=".key,.pem"
                                                className="w-full text-sm text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-500/20 file:text-indigo-400 file:font-medium file:cursor-pointer hover:file:bg-indigo-500/30"
                                            />
                                        </div>
                                    </div>
                                    {settings.sslCertPath && (
                                        <p className="text-xs text-emerald-400">
                                            Current cert: {settings.sslCertPath}
                                        </p>
                                    )}
                                    <button
                                        onClick={handleUploadCerts}
                                        disabled={uploadingCert}
                                        className="btn btn-outline text-sm flex items-center gap-2"
                                    >
                                        {uploadingCert ? <span className="loading-spinner" /> : <Upload size={14} />}
                                        Upload Certificates
                                    </button>
                                </div>
                            )}

                            <button
                                onClick={handleSaveDomain}
                                disabled={saving || !settings.fqdn}
                                className="btn btn-primary flex items-center gap-2"
                            >
                                {saving ? <span className="loading-spinner" /> : <Globe size={16} />}
                                Save Domain Settings
                            </button>
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

                        <button
                            onClick={handleTestEmail}
                            disabled={testingEmail || !settings.smtpHost}
                            className="btn btn-outline flex items-center gap-2 mt-4"
                        >
                            {testingEmail ? <span className="loading-spinner" /> : <SendHorizonal size={16} />}
                            Send Test Email
                        </button>
                    </div>

                    {/* Webhook Settings */}
                    <div className="card mb-6">
                        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <Bell className="text-indigo-400" size={20} />
                            Webhooks
                        </h2>
                        <p className="text-sm text-slate-400 mb-4">
                            Send HTTP notifications to external services when events occur
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="label">Webhook URL</label>
                                <input
                                    type="url"
                                    value={settings.webhookUrl}
                                    onChange={(e) => setSettings({ ...settings, webhookUrl: e.target.value })}
                                    className="input"
                                    placeholder="https://your-service.com/webhook"
                                />
                            </div>

                            <div>
                                <label className="label">Webhook Secret</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={settings.webhookSecret}
                                        onChange={(e) => setSettings({ ...settings, webhookSecret: e.target.value })}
                                        className="input flex-1"
                                        placeholder="Used to sign webhook payloads (HMAC-SHA256)"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const secret = Array.from(crypto.getRandomValues(new Uint8Array(32)))
                                                .map(b => b.toString(16).padStart(2, "0")).join("")
                                            setSettings({ ...settings, webhookSecret: secret })
                                        }}
                                        className="btn btn-outline flex items-center gap-1 text-sm whitespace-nowrap"
                                    >
                                        <RefreshCw size={14} />
                                        Generate
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="label">Events to Send</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {WEBHOOK_EVENT_OPTIONS.map(option => (
                                        <label
                                            key={option.value}
                                            className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 cursor-pointer"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={webhookEventsArray.includes(option.value)}
                                                onChange={() => toggleWebhookEvent(option.value)}
                                                className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
                                            />
                                            <span className="text-sm text-slate-300">{option.label}</span>
                                        </label>
                                    ))}
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
    )
}

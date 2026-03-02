"use client"

import { useState, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import {
    Globe, Shield, Upload, Save, Check, AlertTriangle,
    Lock, RefreshCw
} from "lucide-react"

interface DomainSettings {
    fqdn: string
    sslMode: string
    sslCertPath: string
    sslKeyPath: string
}

export default function DomainsPage() {
    const { data: session, status } = useSession()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null)
    const [settings, setSettings] = useState<DomainSettings>({
        fqdn: "",
        sslMode: "auto",
        sslCertPath: "",
        sslKeyPath: "",
    })
    const certRef = useRef<HTMLInputElement>(null)
    const keyRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        fetchSettings()
    }, [])

    const fetchSettings = async () => {
        try {
            const res = await fetch("/api/admin/domain")
            if (res.ok) {
                const data = await res.json()
                setSettings(prev => ({ ...prev, ...data }))
            }
        } catch (e) {
            console.error("Error fetching domain settings:", e)
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        setSaving(true)
        setFeedback(null)
        try {
            const res = await fetch("/api/admin/domain", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    fqdn: settings.fqdn,
                    sslMode: settings.sslMode,
                }),
            })
            const data = await res.json()
            if (res.ok) {
                setFeedback({ type: "success", message: "Domain settings saved. Caddy configuration updated." })
            } else {
                setFeedback({ type: "error", message: data.error || "Failed to save." })
            }
        } catch {
            setFeedback({ type: "error", message: "Failed to save domain settings." })
        } finally {
            setSaving(false)
            setTimeout(() => setFeedback(null), 6000)
        }
    }

    const handleUpload = async () => {
        const certFile = certRef.current?.files?.[0]
        const keyFile = keyRef.current?.files?.[0]
        if (!certFile || !keyFile) {
            setFeedback({ type: "error", message: "Please select both certificate and key files." })
            return
        }
        setUploading(true)
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
                setFeedback({ type: "error", message: data.error || "Upload failed." })
            }
        } catch {
            setFeedback({ type: "error", message: "Failed to upload certificates." })
        } finally {
            setUploading(false)
            setTimeout(() => setFeedback(null), 6000)
        }
    }

    if (status === "loading" || loading) {
        return (
            <div className="max-w-3xl mx-auto">
                <div className="h-8 w-48 bg-slate-700/50 rounded animate-pulse mb-2" />
                <div className="h-4 w-64 bg-slate-700/50 rounded animate-pulse mb-8" />
                <div className="card animate-pulse h-64" />
            </div>
        )
    }

    if (!session) redirect("/login")

    const isAdmin = (session?.user as any)?.role === "ADMIN"
    if (!isAdmin) redirect("/dashboard")

    return (
        <div className="max-w-3xl mx-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    <Globe className="text-indigo-400" />
                    Domain & SSL
                </h1>
                <p className="text-slate-400 mt-1">
                    Configure your custom domain and SSL certificates
                </p>
            </div>

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

            {/* Domain */}
            <div className="card mb-6">
                <h2 className="text-lg font-semibold text-white mb-4">Custom Domain</h2>
                <div className="space-y-4">
                    <div>
                        <label className="label">Fully Qualified Domain Name (FQDN)</label>
                        <input
                            type="text"
                            value={settings.fqdn}
                            onChange={(e) => setSettings({ ...settings, fqdn: e.target.value })}
                            className="input"
                            placeholder="cal.yourdomain.com"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                            Point your domain&apos;s DNS A record to this server&apos;s public IP address
                        </p>
                    </div>
                </div>
            </div>

            {/* SSL Mode */}
            <div className="card mb-6">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Lock size={18} className="text-indigo-400" />
                    SSL / TLS
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                    {[
                        {
                            value: "auto",
                            label: "Automatic (Let's Encrypt)",
                            desc: "Free, auto-renewing certificates via Caddy",
                            icon: <RefreshCw size={16} />,
                        },
                        {
                            value: "custom",
                            label: "Custom Certificate",
                            desc: "Upload your own SSL certificate and key",
                            icon: <Upload size={16} />,
                        },
                        {
                            value: "none",
                            label: "No SSL (HTTP)",
                            desc: "Not recommended for production",
                            icon: <AlertTriangle size={16} />,
                        },
                    ].map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => setSettings({ ...settings, sslMode: option.value })}
                            className={`p-4 rounded-lg border text-left transition-all ${
                                settings.sslMode === option.value
                                    ? "border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500/30"
                                    : "border-white/10 hover:border-white/20"
                            }`}
                        >
                            <div className="flex items-center gap-2 mb-1 text-white">
                                {option.icon}
                                <p className="text-sm font-medium">{option.label}</p>
                            </div>
                            <p className="text-xs text-slate-400">{option.desc}</p>
                        </button>
                    ))}
                </div>

                {settings.sslMode === "custom" && (
                    <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-3 mt-4">
                        <p className="text-sm font-medium text-white flex items-center gap-2">
                            <Upload size={16} className="text-indigo-400" />
                            Upload Certificate Files
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="label text-xs">Certificate (.crt / .pem)</label>
                                <input
                                    ref={certRef}
                                    type="file"
                                    accept=".crt,.pem,.cert"
                                    className="w-full text-sm text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-500/20 file:text-indigo-400 file:font-medium file:cursor-pointer hover:file:bg-indigo-500/30"
                                />
                            </div>
                            <div>
                                <label className="label text-xs">Private Key (.key / .pem)</label>
                                <input
                                    ref={keyRef}
                                    type="file"
                                    accept=".key,.pem"
                                    className="w-full text-sm text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-indigo-500/20 file:text-indigo-400 file:font-medium file:cursor-pointer hover:file:bg-indigo-500/30"
                                />
                            </div>
                        </div>
                        {settings.sslCertPath && (
                            <div className="flex items-center gap-2 text-xs text-emerald-400">
                                <Shield size={14} />
                                <span>Active certificate: {settings.sslCertPath}</span>
                            </div>
                        )}
                        <button
                            onClick={handleUpload}
                            disabled={uploading}
                            className="btn btn-outline text-sm flex items-center gap-2"
                        >
                            {uploading ? <span className="loading-spinner" /> : <Upload size={14} />}
                            Upload Certificates
                        </button>
                    </div>
                )}

                {settings.sslMode === "none" && (
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center gap-2 mt-2">
                        <AlertTriangle size={16} className="text-amber-400 flex-shrink-0" />
                        <p className="text-xs text-amber-400">
                            Running without SSL is a security risk. Use only for local testing.
                        </p>
                    </div>
                )}
            </div>

            {/* Save */}
            <button
                onClick={handleSave}
                disabled={saving || !settings.fqdn}
                className="btn btn-primary flex items-center gap-2"
            >
                {saving ? <span className="loading-spinner" /> : <Save size={18} />}
                Save Domain Settings
            </button>
        </div>
    )
}

"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { redirect } from "next/navigation"
import {
    Key, Plus, Trash2, Copy, Check, AlertTriangle,
    Clock, Shield, Eye, EyeOff
} from "lucide-react"
import { format } from "date-fns"

interface ApiKeyInfo {
    id: string
    name: string
    keyPrefix: string
    permissions: string
    lastUsedAt: string | null
    expiresAt: string | null
    createdAt: string
}

export default function ApiKeysPage() {
    const { data: session, status } = useSession()
    const [keys, setKeys] = useState<ApiKeyInfo[]>([])
    const [loading, setLoading] = useState(true)
    const [showCreate, setShowCreate] = useState(false)
    const [creating, setCreating] = useState(false)
    const [newKeyName, setNewKeyName] = useState("")
    const [newKeyPermissions, setNewKeyPermissions] = useState("read")
    const [newKeyExpiry, setNewKeyExpiry] = useState("")
    const [createdKey, setCreatedKey] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const isAdmin = (session?.user as any)?.role === "ADMIN"

    useEffect(() => {
        fetchKeys()
    }, [])

    const fetchKeys = async () => {
        try {
            const res = await fetch("/api/user/api-keys")
            if (res.ok) {
                const data = await res.json()
                setKeys(data)
            }
        } catch (e) {
            console.error("Failed to fetch API keys:", e)
        } finally {
            setLoading(false)
        }
    }

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault()
        setCreating(true)
        try {
            const res = await fetch("/api/user/api-keys", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: newKeyName,
                    permissions: newKeyPermissions,
                    expiresIn: newKeyExpiry || undefined,
                }),
            })
            if (res.ok) {
                const data = await res.json()
                setCreatedKey(data.key)
                setNewKeyName("")
                setNewKeyExpiry("")
                fetchKeys()
            }
        } catch (e) {
            console.error("Failed to create API key:", e)
        } finally {
            setCreating(false)
        }
    }

    const handleDelete = async (id: string) => {
        setDeletingId(id)
        try {
            const res = await fetch(`/api/user/api-keys?id=${id}`, { method: "DELETE" })
            if (res.ok) {
                setKeys(keys.filter((k) => k.id !== id))
            }
        } catch (e) {
            console.error("Failed to delete API key:", e)
        } finally {
            setDeletingId(null)
        }
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    if (status === "loading" || loading) {
        return (
            <div className="max-w-3xl mx-auto">
                <div className="h-8 w-48 bg-slate-700/50 rounded animate-pulse mb-2" />
                <div className="h-4 w-64 bg-slate-700/50 rounded animate-pulse mb-8" />
                <div className="space-y-4">
                    {[1, 2].map((i) => (
                        <div key={i} className="card animate-pulse h-20" />
                    ))}
                </div>
            </div>
        )
    }

    if (!session) redirect("/login")

    const permissionBadge = (perm: string) => {
        const colors: Record<string, string> = {
            read: "bg-blue-500/20 text-blue-400",
            write: "bg-amber-500/20 text-amber-400",
            admin: "bg-red-500/20 text-red-400",
        }
        return (
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[perm] || ""}`}>
                {perm}
            </span>
        )
    }

    return (
        <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Key className="text-indigo-400" />
                        API Keys
                    </h1>
                    <p className="text-slate-400 mt-1">
                        Manage API keys for programmatic access
                    </p>
                </div>
                <button
                    onClick={() => { setShowCreate(true); setCreatedKey(null) }}
                    className="btn btn-primary flex items-center gap-2"
                >
                    <Plus size={18} />
                    New Key
                </button>
            </div>

            {/* Created key display */}
            {createdKey && (
                <div className="card mb-6 border-amber-500/30 bg-amber-500/5">
                    <div className="flex items-start gap-3">
                        <AlertTriangle size={20} className="text-amber-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-amber-400 mb-2">
                                Save this key now — it won&apos;t be shown again
                            </p>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 p-3 rounded-lg bg-black/30 text-sm text-white font-mono break-all">
                                    {createdKey}
                                </code>
                                <button
                                    onClick={() => copyToClipboard(createdKey)}
                                    className="btn btn-outline flex-shrink-0"
                                >
                                    {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create form */}
            {showCreate && !createdKey && (
                <div className="card mb-6">
                    <h2 className="text-lg font-semibold text-white mb-4">Create API Key</h2>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div>
                            <label className="label">Key Name</label>
                            <input
                                type="text"
                                value={newKeyName}
                                onChange={(e) => setNewKeyName(e.target.value)}
                                className="input"
                                placeholder="e.g., My Integration"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="label">Permissions</label>
                                <select
                                    value={newKeyPermissions}
                                    onChange={(e) => setNewKeyPermissions(e.target.value)}
                                    className="input"
                                >
                                    <option value="read">Read Only</option>
                                    <option value="write">Read & Write</option>
                                    {isAdmin && <option value="admin">Admin</option>}
                                </select>
                            </div>
                            <div>
                                <label className="label">Expires In (days)</label>
                                <input
                                    type="number"
                                    value={newKeyExpiry}
                                    onChange={(e) => setNewKeyExpiry(e.target.value)}
                                    className="input"
                                    placeholder="Never"
                                    min={1}
                                    max={365}
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="submit"
                                disabled={creating || !newKeyName}
                                className="btn btn-primary flex items-center gap-2"
                            >
                                {creating ? <span className="loading-spinner" /> : <Key size={16} />}
                                Create Key
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowCreate(false)}
                                className="btn btn-outline"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Keys list */}
            {keys.length === 0 ? (
                <div className="card text-center py-12">
                    <Key size={48} className="mx-auto text-slate-600 mb-4" />
                    <p className="text-slate-400">No API keys yet</p>
                    <p className="text-slate-500 text-sm mt-1">
                        Create an API key to access Cally programmatically
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {keys.map((key) => (
                        <div key={key.id} className="card card-hover">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                                        <Key size={18} className="text-indigo-400" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-medium text-white">{key.name}</h3>
                                            {permissionBadge(key.permissions)}
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                                            <span className="font-mono">{key.keyPrefix}...</span>
                                            <span className="flex items-center gap-1">
                                                <Clock size={12} />
                                                Created {format(new Date(key.createdAt), "MMM d, yyyy")}
                                            </span>
                                            {key.lastUsedAt && (
                                                <span>
                                                    Last used {format(new Date(key.lastUsedAt), "MMM d")}
                                                </span>
                                            )}
                                            {key.expiresAt && (
                                                <span className={
                                                    new Date(key.expiresAt) < new Date()
                                                        ? "text-red-400"
                                                        : "text-slate-500"
                                                }>
                                                    {new Date(key.expiresAt) < new Date()
                                                        ? "Expired"
                                                        : `Expires ${format(new Date(key.expiresAt), "MMM d, yyyy")}`
                                                    }
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDelete(key.id)}
                                    disabled={deletingId === key.id}
                                    className="btn btn-outline border-red-500/30 text-red-400 hover:bg-red-500/10"
                                >
                                    {deletingId === key.id ? (
                                        <span className="loading-spinner" />
                                    ) : (
                                        <Trash2 size={16} />
                                    )}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* API Usage Docs */}
            <div className="card mt-8">
                <h2 className="text-lg font-semibold text-white mb-3">API Usage</h2>
                <p className="text-sm text-slate-400 mb-4">
                    Include your API key in the <code className="text-indigo-400">Authorization</code> header:
                </p>
                <pre className="p-4 rounded-lg bg-black/30 text-sm text-slate-300 font-mono overflow-x-auto">
{`curl -H "Authorization: Bearer cally_xxxx..." \\
     https://your-domain.com/api/appointments`}
                </pre>
            </div>
        </div>
    )
}

"use client"

import { useSession, signIn } from "next-auth/react"
import { useState, useEffect, useCallback } from "react"
import { redirect } from "next/navigation"
import ConflictResolver from "@/components/calendar/ConflictResolver"
import { User, Mail, Link as LinkIcon, Globe, Save, Check, Rss, Copy, RefreshCw, Trash2, Flag } from "lucide-react"

const COMMON_TIMEZONES = [
    "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
    "America/Toronto", "America/Sao_Paulo", "Europe/London", "Europe/Paris",
    "Europe/Berlin", "Europe/Moscow", "Asia/Dubai", "Asia/Kolkata",
    "Asia/Shanghai", "Asia/Tokyo", "Asia/Seoul", "Australia/Sydney",
    "Pacific/Auckland", "UTC"
]

// Hoisted to module scope to avoid recreating SVG JSX on every render
const PROVIDERS = [
    { id: "google", name: "Google", bgColor: "bg-white", img: "https://authjs.dev/img/providers/google.svg" },
    { id: "discord", name: "Discord", bgColor: "bg-[#5865F2]", svg: (
        <svg viewBox="0 0 127.14 96.36" className="w-6 h-6 fill-white">
            <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z" />
        </svg>
    )},
    { id: "twitter", name: "X (Twitter)", bgColor: "bg-black", svg: (
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
    )},
    { id: "facebook", name: "Facebook", bgColor: "bg-[#1877F2]", svg: (
        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
    )},
    { id: "apple", name: "Apple", bgColor: "bg-white", svg: (
        <svg viewBox="0 0 384 512" className="w-5 h-5 fill-black">
            <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 52.3-11.4 69.5-34.3z" />
        </svg>
    )},
]

export default function ProfilePage() {
    const { data: session, status } = useSession()
    const [linkedAccounts, setLinkedAccounts] = useState<any[]>([])
    const [name, setName] = useState("")
    const [timezone, setTimezone] = useState("UTC")
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [country, setCountry] = useState("")
    const [countries, setCountries] = useState<{ countryCode: string; name: string; holidaysAvailable: boolean }[]>([])
    const [icalFeedUrl, setIcalFeedUrl] = useState<string | null>(null)
    const [icalLoading, setIcalLoading] = useState(false)
    const [icalCopied, setIcalCopied] = useState(false)

    useEffect(() => {
        // Parallel fetch for all profile data
        Promise.all([
            fetch("/api/user/accounts").then(res => res.ok ? res.json() : []),
            fetch("/api/user/profile").then(res => res.ok ? res.json() : null),
            fetch("/api/user/ical-feed").then(res => res.ok ? res.json() : null).catch(() => null),
            fetch("/api/holidays/countries").then(res => res.ok ? res.json() : []).catch(() => []),
        ]).then(([accounts, profile, icalData, countryList]) => {
            setLinkedAccounts(accounts)
            if (profile) {
                setName(profile.name || "")
                setTimezone(profile.timezone || "UTC")
                setCountry(profile.country || "")
            }
            if (icalData?.feedUrl) {
                setIcalFeedUrl(icalData.feedUrl)
            }
            if (Array.isArray(countryList)) {
                setCountries(countryList.sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name)))
            }
        })
    }, [])

    const generateIcalFeed = useCallback(async () => {
        setIcalLoading(true)
        try {
            const res = await fetch("/api/user/ical-feed", { method: "POST" })
            if (res.ok) {
                const data = await res.json()
                setIcalFeedUrl(data.feedUrl)
            }
        } catch { /* ignore */ }
        finally { setIcalLoading(false) }
    }, [])

    const revokeIcalFeed = useCallback(async () => {
        setIcalLoading(true)
        try {
            const res = await fetch("/api/user/ical-feed", { method: "DELETE" })
            if (res.ok) setIcalFeedUrl(null)
        } catch { /* ignore */ }
        finally { setIcalLoading(false) }
    }, [])

    const copyIcalUrl = useCallback(() => {
        if (icalFeedUrl) {
            navigator.clipboard.writeText(window.location.origin + icalFeedUrl)
            setIcalCopied(true)
            setTimeout(() => setIcalCopied(false), 2000)
        }
    }, [icalFeedUrl])

    const isConnected = useCallback((provider: string) => linkedAccounts.some(acc => acc.provider === provider), [linkedAccounts])

    const handleSave = useCallback(async () => {
        setSaving(true)
        try {
            const res = await fetch("/api/user/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, timezone, country: country || null })
            })
            if (res.ok) {
                setSaved(true)
                setTimeout(() => setSaved(false), 3000)
            }
        } catch (error) {
            console.error("Error saving profile:", error)
        } finally {
            setSaving(false)
        }
    }, [name, timezone, country])

    if (status === "loading") {
        return null
    }

    if (!session) {
        redirect("/login")
    }

    return (
        <>
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-text">Profile Settings</h1>
                            <p className="text-text-secondary mt-1">Manage your account and preferences</p>
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

                    <ConflictResolver />

                    <div className="space-y-6">
                        {/* Personal Info */}
                        <div className="card">
                            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <User className="text-indigo-400" size={20} /> Personal Information
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="label">Name</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="input"
                                        placeholder="Your name"
                                    />
                                </div>
                                <div>
                                    <label className="label">Email</label>
                                    <input
                                        type="text"
                                        value={session?.user?.email || ""}
                                        disabled
                                        className="input opacity-60 cursor-not-allowed"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* (#69) Timezone Setting */}
                        <div className="card">
                            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <Globe className="text-indigo-400" size={20} /> Timezone
                            </h2>
                            <p className="text-sm text-slate-400 mb-4">
                                Your timezone affects availability display and appointment scheduling.
                            </p>
                            <select
                                value={timezone}
                                onChange={(e) => setTimezone(e.target.value)}
                                className="input"
                            >
                                {COMMON_TIMEZONES.map(tz => (
                                    <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>
                                ))}
                            </select>
                        </div>

                        {/* Country Setting (for holidays) */}
                        <div className="card">
                            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <Flag className="text-indigo-400" size={20} /> Country
                            </h2>
                            <p className="text-sm text-slate-400 mb-4">
                                Set your country to import national holidays into date overrides.
                            </p>
                            <select
                                value={country}
                                onChange={(e) => setCountry(e.target.value)}
                                className="input"
                            >
                                <option value="">Select a country...</option>
                                {countries.map(c => (
                                    <option key={c.countryCode} value={c.countryCode}>
                                        {c.name} ({c.countryCode}){c.holidaysAvailable ? '' : ' — no holiday data'}
                                    </option>
                                ))}
                            </select>
                            {country && (() => {
                                const selected = countries.find(c => c.countryCode === country)
                                if (selected && !selected.holidaysAvailable) {
                                    return (
                                        <p className="text-xs text-amber-400 mt-2">
                                            ⚠ Holiday import is not yet available for {selected.name}. You can still set your country for other features.
                                        </p>
                                    )
                                }
                                return null
                            })()}
                        </div>

                        {/* iCal Subscription Feed (#53) */}
                        <div className="card">
                            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <Rss className="text-indigo-400" size={20} /> Calendar Subscription (iCal)
                            </h2>
                            <p className="text-sm text-slate-400 mb-4">
                                Generate a private URL to subscribe to your calendar from Apple Calendar, Google Calendar, Outlook, or any app that supports iCal feeds.
                            </p>

                            {icalFeedUrl ? (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={window.location.origin + icalFeedUrl}
                                            readOnly
                                            className="input flex-1 font-mono text-xs"
                                        />
                                        <button
                                            onClick={copyIcalUrl}
                                            className="btn btn-outline shrink-0 flex items-center gap-2"
                                        >
                                            {icalCopied ? <Check size={16} /> : <Copy size={16} />}
                                            {icalCopied ? "Copied" : "Copy"}
                                        </button>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={generateIcalFeed}
                                            disabled={icalLoading}
                                            className="btn btn-outline text-sm flex items-center gap-2"
                                        >
                                            <RefreshCw size={14} /> Regenerate URL
                                        </button>
                                        <button
                                            onClick={revokeIcalFeed}
                                            disabled={icalLoading}
                                            className="btn btn-outline text-sm text-red-400 border-red-400/30 hover:bg-red-400/10 flex items-center gap-2"
                                        >
                                            <Trash2 size={14} /> Disable Feed
                                        </button>
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        ⚠️ This URL contains a private token. Anyone with this URL can see your calendar. Regenerating will invalidate the old URL.
                                    </p>
                                </div>
                            ) : (
                                <button
                                    onClick={generateIcalFeed}
                                    disabled={icalLoading}
                                    className="btn btn-primary flex items-center gap-2"
                                >
                                    {icalLoading ? <span className="loading-spinner" /> : <Rss size={16} />}
                                    Generate Feed URL
                                </button>
                            )}
                        </div>

                        {/* Linked Accounts */}
                        <div className="card">
                            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <LinkIcon className="text-indigo-400" size={20} /> Linked Accounts
                            </h2>
                            <p className="text-sm text-slate-400 mb-6">
                                Connect multiple accounts to sign in with any of them.
                            </p>

                            <div className="space-y-3">
                                {PROVIDERS.map(provider => (
                                    <div key={provider.id} className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-full ${provider.bgColor} flex items-center justify-center`}>
                                                {provider.img ? (
                                                    <img src={provider.img} alt={provider.name} className="w-6 h-6" />
                                                ) : provider.svg}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-white">{provider.name}</p>
                                                <p className="text-sm text-slate-400">
                                                    {isConnected(provider.id) ? "Connected" : "Not connected"}
                                                </p>
                                            </div>
                                        </div>
                                        {isConnected(provider.id) ? (
                                            <span className="px-4 py-2 text-sm text-green-400 bg-green-400/10 rounded-lg border border-green-400/20">
                                                Connected
                                            </span>
                                        ) : (
                                            <button
                                                onClick={() => signIn(provider.id)}
                                                className="btn btn-primary text-sm"
                                            >
                                                Connect
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
        </>
    )
}

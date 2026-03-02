"use client"

import { useEffect, useState } from "react"
import { Bell, Mail, MessageSquare, Calendar, AlertTriangle, Check } from "lucide-react"

interface NotificationPrefs {
    emailBookingNew: boolean
    emailBookingConfirmed: boolean
    emailBookingCancelled: boolean
    emailReminder: boolean
    emailDailyDigest: boolean
    discordBookingNew: boolean
    discordBookingConfirmed: boolean
    discordBookingCancelled: boolean
    discordReminder: boolean
    reminderMinutes: number
}

const defaultPrefs: NotificationPrefs = {
    emailBookingNew: true,
    emailBookingConfirmed: true,
    emailBookingCancelled: true,
    emailReminder: true,
    emailDailyDigest: false,
    discordBookingNew: true,
    discordBookingConfirmed: false,
    discordBookingCancelled: true,
    discordReminder: false,
    reminderMinutes: 30,
}

export default function NotificationsPage() {
    const [prefs, setPrefs] = useState<NotificationPrefs>(defaultPrefs)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetch("/api/user/notifications")
            .then(res => res.ok ? res.json() : null)
            .then(data => {
                if (data?.prefs) {
                    setPrefs({ ...defaultPrefs, ...data.prefs })
                }
            })
            .catch(() => {})
            .finally(() => setLoading(false))
    }, [])

    const handleSave = async () => {
        setSaving(true)
        setSaved(false)
        try {
            const res = await fetch("/api/user/notifications", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(prefs),
            })
            if (res.ok) {
                setSaved(true)
                setTimeout(() => setSaved(false), 3000)
            }
        } catch { /* ignore */ }
        finally { setSaving(false) }
    }

    const toggle = (key: keyof NotificationPrefs) => {
        setPrefs(p => ({ ...p, [key]: !p[key] }))
    }

    if (loading) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold text-text">Notification Preferences</h1>
                <div className="animate-pulse space-y-4">
                    {[1,2,3].map(i => (
                        <div key={i} className="h-32 bg-surface rounded-xl" />
                    ))}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-3xl">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-text">Notification Preferences</h1>
                    <p className="text-text-secondary mt-1">Choose how and when you want to be notified.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-primary px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                >
                    {saved ? <Check size={16} /> : saving ? (
                        <div className="loading-spinner loading-spinner-sm" />
                    ) : null}
                    {saved ? "Saved" : saving ? "Saving..." : "Save Preferences"}
                </button>
            </div>

            {/* Email Notifications */}
            <div className="card p-6 space-y-4">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Mail size={18} className="text-primary" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-text">Email Notifications</h2>
                        <p className="text-sm text-text-tertiary">Notifications sent to your account email</p>
                    </div>
                </div>

                <NotifToggle
                    label="New Booking Requests"
                    description="When someone books an appointment with you"
                    checked={prefs.emailBookingNew}
                    onChange={() => toggle("emailBookingNew")}
                />
                <NotifToggle
                    label="Booking Confirmed"
                    description="When a booking is confirmed"
                    checked={prefs.emailBookingConfirmed}
                    onChange={() => toggle("emailBookingConfirmed")}
                />
                <NotifToggle
                    label="Booking Cancelled"
                    description="When a booking is cancelled by a guest"
                    checked={prefs.emailBookingCancelled}
                    onChange={() => toggle("emailBookingCancelled")}
                />
                <NotifToggle
                    label="Appointment Reminders"
                    description="Reminder before upcoming appointments"
                    checked={prefs.emailReminder}
                    onChange={() => toggle("emailReminder")}
                />
                <NotifToggle
                    label="Daily Digest"
                    description="Summary of your schedule sent each morning"
                    checked={prefs.emailDailyDigest}
                    onChange={() => toggle("emailDailyDigest")}
                />
            </div>

            {/* Discord Notifications */}
            <div className="card p-6 space-y-4">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-lg bg-[#5865F2]/10 flex items-center justify-center">
                        <MessageSquare size={18} className="text-[#5865F2]" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-text">Discord Notifications</h2>
                        <p className="text-sm text-text-tertiary">Notifications via the Discord bot (requires linked account)</p>
                    </div>
                </div>

                <NotifToggle
                    label="New Booking Requests"
                    description="DM when someone books an appointment"
                    checked={prefs.discordBookingNew}
                    onChange={() => toggle("discordBookingNew")}
                />
                <NotifToggle
                    label="Booking Confirmed"
                    description="DM when a booking is confirmed"
                    checked={prefs.discordBookingConfirmed}
                    onChange={() => toggle("discordBookingConfirmed")}
                />
                <NotifToggle
                    label="Booking Cancelled"
                    description="DM when a booking is cancelled"
                    checked={prefs.discordBookingCancelled}
                    onChange={() => toggle("discordBookingCancelled")}
                />
                <NotifToggle
                    label="Appointment Reminders"
                    description="Reminder DM before upcoming appointments"
                    checked={prefs.discordReminder}
                    onChange={() => toggle("discordReminder")}
                />
            </div>

            {/* Reminder Timing */}
            <div className="card p-6 space-y-4">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-lg bg-warning/10 flex items-center justify-center">
                        <Calendar size={18} className="text-warning" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-text">Reminder Timing</h2>
                        <p className="text-sm text-text-tertiary">How far in advance to send reminders</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <select
                        value={prefs.reminderMinutes}
                        onChange={e => setPrefs(p => ({ ...p, reminderMinutes: parseInt(e.target.value) }))}
                        className="input-field w-48"
                    >
                        <option value={10}>10 minutes before</option>
                        <option value={15}>15 minutes before</option>
                        <option value={30}>30 minutes before</option>
                        <option value={60}>1 hour before</option>
                        <option value={120}>2 hours before</option>
                        <option value={1440}>1 day before</option>
                    </select>
                    <p className="text-sm text-text-tertiary">
                        Applied to both email and Discord reminders
                    </p>
                </div>
            </div>

            {/* Info */}
            <div className="flex items-start gap-3 p-4 rounded-lg bg-warning/5 border border-warning/20">
                <AlertTriangle size={18} className="text-warning shrink-0 mt-0.5" />
                <p className="text-sm text-text-secondary">
                    Email notifications require SMTP to be configured in admin settings.
                    Discord notifications require the Discord bot to be running and your Discord account to be linked.
                </p>
            </div>
        </div>
    )
}

function NotifToggle({ label, description, checked, onChange }: {
    label: string
    description: string
    checked: boolean
    onChange: () => void
}) {
    return (
        <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
            <div>
                <p className="text-sm font-medium text-text">{label}</p>
                <p className="text-xs text-text-tertiary">{description}</p>
            </div>
            <button
                onClick={onChange}
                className={`
                    relative w-10 h-5.5 rounded-full transition-colors duration-200
                    ${checked ? "bg-primary" : "bg-surface-secondary border border-border"}
                `}
                role="switch"
                aria-checked={checked}
            >
                <span
                    className={`
                        absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-sm
                        transition-transform duration-200
                        ${checked ? "translate-x-[18px]" : "translate-x-0"}
                    `}
                />
            </button>
        </div>
    )
}

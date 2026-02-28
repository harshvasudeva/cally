"use client"

import { useState, useMemo } from "react"
import { useSession } from "next-auth/react"
import {
    Sparkles,
    Globe,
    Clock,
    CalendarPlus,
    CheckCircle,
    ChevronRight,
    ChevronLeft,
    Copy,
    Check,
} from "lucide-react"

const STEPS = [
    { label: "Welcome", icon: Sparkles },
    { label: "Timezone", icon: Globe },
    { label: "Availability", icon: Clock },
    { label: "Event Type", icon: CalendarPlus },
    { label: "Done", icon: CheckCircle },
] as const

const DAYS = [
    { key: "mon", label: "Monday", dayOfWeek: 1 },
    { key: "tue", label: "Tuesday", dayOfWeek: 2 },
    { key: "wed", label: "Wednesday", dayOfWeek: 3 },
    { key: "thu", label: "Thursday", dayOfWeek: 4 },
    { key: "fri", label: "Friday", dayOfWeek: 5 },
    { key: "sat", label: "Saturday", dayOfWeek: 6 },
    { key: "sun", label: "Sunday", dayOfWeek: 0 },
] as const

const DURATIONS = [
    { value: 15, label: "15 minutes" },
    { value: 30, label: "30 minutes" },
    { value: 45, label: "45 minutes" },
    { value: 60, label: "60 minutes" },
    { value: 90, label: "90 minutes" },
]

const COMMON_TIMEZONES = [
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Anchorage",
    "Pacific/Honolulu",
    "America/Toronto",
    "America/Vancouver",
    "America/Sao_Paulo",
    "America/Argentina/Buenos_Aires",
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "Europe/Moscow",
    "Europe/Istanbul",
    "Africa/Cairo",
    "Africa/Johannesburg",
    "Asia/Dubai",
    "Asia/Kolkata",
    "Asia/Bangkok",
    "Asia/Shanghai",
    "Asia/Tokyo",
    "Asia/Seoul",
    "Asia/Singapore",
    "Australia/Sydney",
    "Australia/Perth",
    "Pacific/Auckland",
]

function getTimezones(): string[] {
    try {
        const all = Intl.supportedValuesOf("timeZone")
        return all
    } catch {
        return COMMON_TIMEZONES
    }
}

interface OnboardingWizardProps {
    onComplete?: () => void
}

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
    const { data: session } = useSession()
    const userName = session?.user?.name ?? "there"
    const userSlug = (session?.user as { slug?: string })?.slug ?? ""

    const [step, setStep] = useState(0)
    const [saving, setSaving] = useState(false)

    // Step 2: Timezone
    const allTimezones = useMemo(() => getTimezones(), [])
    const [timezone, setTimezone] = useState(
        () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    )
    const [tzSearch, setTzSearch] = useState("")
    const filteredTimezones = useMemo(() => {
        if (!tzSearch) return COMMON_TIMEZONES
        const q = tzSearch.toLowerCase()
        return allTimezones.filter((tz) => tz.toLowerCase().includes(q))
    }, [tzSearch, allTimezones])

    // Step 3: Availability
    const [activeDays, setActiveDays] = useState<Record<string, boolean>>({
        mon: true,
        tue: true,
        wed: true,
        thu: true,
        fri: true,
        sat: false,
        sun: false,
    })
    const [startTime, setStartTime] = useState("09:00")
    const [endTime, setEndTime] = useState("17:00")

    // Step 4: Event type
    const [eventName, setEventName] = useState("Meeting")
    const [eventDuration, setEventDuration] = useState(30)

    // Step 5: copied link
    const [copied, setCopied] = useState(false)

    const toggleDay = (key: string) =>
        setActiveDays((prev) => ({ ...prev, [key]: !prev[key] }))

    const bookingUrl =
        typeof window !== "undefined"
            ? `${window.location.origin}/book/${userSlug}`
            : `/book/${userSlug}`

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(bookingUrl)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch {
            // Clipboard may not be available
        }
    }

    const handleNext = async () => {
        // When moving from step 1 to 2, save timezone
        if (step === 1) {
            try {
                await fetch("/api/user/profile", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ timezone }),
                })
            } catch {
                // Continue anyway
            }
        }

        // When moving from step 2 to 3, save availability
        if (step === 2) {
            const availabilities = DAYS.filter((d) => activeDays[d.key]).map(
                (d) => ({
                    dayOfWeek: d.dayOfWeek,
                    startTime,
                    endTime,
                    isActive: true,
                }),
            )
            try {
                await fetch("/api/availability", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ availabilities }),
                })
            } catch {
                // Continue anyway
            }
        }

        // When moving from step 3 to 4, create event type
        if (step === 3) {
            try {
                await fetch("/api/appointment-types", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name: eventName,
                        duration: eventDuration,
                        color: "#6366f1",
                    }),
                })
            } catch {
                // Continue anyway
            }
        }

        setStep((s) => s + 1)
    }

    const handleFinish = async () => {
        setSaving(true)
        try {
            await fetch("/api/user/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ onboardingCompleted: true }),
            })
        } catch {
            // Silently fail
        } finally {
            setSaving(false)
            onComplete?.()
        }
    }

    return (
        <div className="fixed inset-0 z-[9997] flex items-center justify-center">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900" />
            <div className="absolute inset-0 bg-black/40" />

            {/* Card */}
            <div className="relative glass rounded-2xl shadow-2xl shadow-black/40 w-full max-w-xl mx-4 overflow-hidden">
                {/* Progress bar */}
                <div className="flex gap-1 px-6 pt-6">
                    {STEPS.map((s, i) => (
                        <div
                            key={s.label}
                            className={`
                                h-1 flex-1 rounded-full transition-all duration-500
                                ${i <= step ? "bg-indigo-500" : "bg-slate-700"}
                            `}
                        />
                    ))}
                </div>

                {/* Step indicator */}
                <div className="flex items-center gap-2 px-6 pt-4 pb-2">
                    {(() => {
                        const StepIcon = STEPS[step].icon
                        return <StepIcon size={16} className="text-indigo-400" />
                    })()}
                    <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                        Step {step + 1} of {STEPS.length} &mdash; {STEPS[step].label}
                    </span>
                </div>

                {/* Content area with min height for consistent sizing */}
                <div className="px-6 pb-6 min-h-[320px] flex flex-col">
                    {/* Step 0 - Welcome */}
                    {step === 0 && (
                        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 animate-fade-in">
                            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mb-2">
                                <Sparkles size={32} className="text-white" />
                            </div>
                            <h2 className="text-2xl font-bold text-white">
                                Welcome, {userName}!
                            </h2>
                            <p className="text-slate-400 max-w-sm">
                                Let&apos;s get your calendar set up in a few quick steps. You&apos;ll
                                have your booking page ready in under a minute.
                            </p>
                        </div>
                    )}

                    {/* Step 1 - Timezone */}
                    {step === 1 && (
                        <div className="flex-1 space-y-4 animate-fade-in">
                            <div>
                                <h2 className="text-xl font-bold text-white">
                                    Set your timezone
                                </h2>
                                <p className="text-sm text-slate-400 mt-1">
                                    This ensures your availability shows correctly to guests.
                                </p>
                            </div>

                            <div>
                                <label className="label">Search timezones</label>
                                <input
                                    type="text"
                                    value={tzSearch}
                                    onChange={(e) => setTzSearch(e.target.value)}
                                    placeholder="e.g. New York, London, Tokyo..."
                                    className="input"
                                />
                            </div>

                            <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-700 bg-slate-800/50">
                                {filteredTimezones.slice(0, 50).map((tz) => (
                                    <button
                                        key={tz}
                                        onClick={() => setTimezone(tz)}
                                        className={`
                                            w-full text-left px-4 py-2 text-sm transition-colors
                                            ${tz === timezone
                                                ? "bg-indigo-500/20 text-indigo-300"
                                                : "text-slate-300 hover:bg-slate-700/50"
                                            }
                                        `}
                                    >
                                        {tz.replace(/_/g, " ")}
                                    </button>
                                ))}
                                {filteredTimezones.length === 0 && (
                                    <p className="px-4 py-3 text-sm text-slate-500">
                                        No timezones match your search.
                                    </p>
                                )}
                            </div>

                            <p className="text-sm text-slate-400">
                                Selected:{" "}
                                <span className="text-white font-medium">
                                    {timezone.replace(/_/g, " ")}
                                </span>
                            </p>
                        </div>
                    )}

                    {/* Step 2 - Availability */}
                    {step === 2 && (
                        <div className="flex-1 space-y-4 animate-fade-in">
                            <div>
                                <h2 className="text-xl font-bold text-white">
                                    Set your availability
                                </h2>
                                <p className="text-sm text-slate-400 mt-1">
                                    Choose which days you&apos;re available and your working hours.
                                </p>
                            </div>

                            {/* Day checkboxes */}
                            <div className="flex flex-wrap gap-2">
                                {DAYS.map((d) => (
                                    <button
                                        key={d.key}
                                        onClick={() => toggleDay(d.key)}
                                        className={`
                                            px-3 py-2 rounded-lg text-sm font-medium transition-all
                                            ${activeDays[d.key]
                                                ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                                                : "bg-slate-800 text-slate-500 border border-slate-700 hover:border-slate-600"
                                            }
                                        `}
                                    >
                                        {d.label.slice(0, 3)}
                                    </button>
                                ))}
                            </div>

                            {/* Time range */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label">Start time</label>
                                    <input
                                        type="time"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                        className="input"
                                    />
                                </div>
                                <div>
                                    <label className="label">End time</label>
                                    <input
                                        type="time"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                        className="input"
                                    />
                                </div>
                            </div>

                            <p className="text-xs text-slate-500">
                                You can fine-tune per-day availability later in Settings.
                            </p>
                        </div>
                    )}

                    {/* Step 3 - Create Event Type */}
                    {step === 3 && (
                        <div className="flex-1 space-y-4 animate-fade-in">
                            <div>
                                <h2 className="text-xl font-bold text-white">
                                    Create your first event type
                                </h2>
                                <p className="text-sm text-slate-400 mt-1">
                                    This is what guests will book on your scheduling page.
                                </p>
                            </div>

                            <div>
                                <label className="label">Event name</label>
                                <input
                                    type="text"
                                    value={eventName}
                                    onChange={(e) => setEventName(e.target.value)}
                                    placeholder="e.g. Quick Chat, Consultation..."
                                    className="input"
                                />
                            </div>

                            <div>
                                <label className="label">Duration</label>
                                <select
                                    value={eventDuration}
                                    onChange={(e) => setEventDuration(Number(e.target.value))}
                                    className="input"
                                >
                                    {DURATIONS.map((d) => (
                                        <option key={d.value} value={d.value}>
                                            {d.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                                <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-1">
                                    Preview
                                </p>
                                <p className="text-white font-medium">{eventName || "Untitled"}</p>
                                <p className="text-sm text-slate-400">{eventDuration} minutes</p>
                            </div>
                        </div>
                    )}

                    {/* Step 4 - Done */}
                    {step === 4 && (
                        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 animate-fade-in">
                            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-2">
                                <CheckCircle size={32} className="text-emerald-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-white">
                                You&apos;re all set!
                            </h2>
                            <p className="text-slate-400 max-w-sm">
                                Your booking page is ready. Share this link with anyone to let
                                them schedule time with you.
                            </p>

                            {/* Booking link */}
                            <div className="w-full max-w-sm">
                                <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-800/80 border border-slate-700">
                                    <code className="flex-1 text-sm text-indigo-300 truncate text-left">
                                        {bookingUrl}
                                    </code>
                                    <button
                                        onClick={copyLink}
                                        className="shrink-0 p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                                        title="Copy link"
                                    >
                                        {copied ? (
                                            <Check size={16} className="text-emerald-400" />
                                        ) : (
                                            <Copy size={16} />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Navigation buttons */}
                    <div className="flex items-center justify-between pt-6 mt-auto">
                        {step > 0 && step < 4 ? (
                            <button
                                onClick={() => setStep((s) => s - 1)}
                                className="btn btn-outline gap-1"
                            >
                                <ChevronLeft size={16} />
                                Back
                            </button>
                        ) : (
                            <div />
                        )}

                        {step < 4 ? (
                            <button
                                onClick={handleNext}
                                className="btn btn-primary gap-1"
                            >
                                {step === 0 ? "Get Started" : "Continue"}
                                <ChevronRight size={16} />
                            </button>
                        ) : (
                            <button
                                onClick={handleFinish}
                                disabled={saving}
                                className="btn btn-primary gap-1"
                            >
                                {saving ? (
                                    <>
                                        <span className="loading-spinner" />
                                        Finishing...
                                    </>
                                ) : (
                                    "Go to Calendar"
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

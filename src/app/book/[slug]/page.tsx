"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { useSession, signIn } from "next-auth/react"
import Link from "next/link"
import { format, parseISO, addDays } from "date-fns"
import { Calendar, Clock, ChevronLeft, ChevronRight, Check, User, Mail, Phone, FileText, Lock, ArrowRight } from "lucide-react"
import { TimeSlot, AppointmentType } from "@/types"

interface BookingPageProps {
    params: Promise<{ slug: string }>
}

export default function BookingPage({ params }: BookingPageProps) {
    const { slug } = use(params)
    const router = useRouter()
    const { data: session } = useSession()
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState("")
    const [user, setUser] = useState<{ name: string; slug: string } | null>(null)
    const [appointmentType, setAppointmentType] = useState<AppointmentType | null>(null)

    // Initialize date from URL or default to today
    const [selectedDate, setSelectedDate] = useState<Date>(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search)
            const dateParam = params.get("date")
            return dateParam ? parseISO(dateParam) : new Date()
        }
        return new Date()
    })

    const [slots, setSlots] = useState<TimeSlot[]>([])
    const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
    const [step, setStep] = useState<"date" | "time" | "form">("date")

    // Negotiation State
    const [isNegotiating, setIsNegotiating] = useState(false)
    const [showAuthModal, setShowAuthModal] = useState(false)

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        notes: ""
    })

    useEffect(() => {
        fetchSlots()
    }, [selectedDate, slug])

    // Effect to handle URL params for seamless auth return
    useEffect(() => {
        if (slots.length > 0 && typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search)
            const slotParam = params.get("slot")
            const negotiateParam = params.get("negotiate")

            if (slotParam) {
                // Find and select the slot
                const slot = slots.find(s => s.start === slotParam)
                if (slot) {
                    setSelectedSlot(slot)
                    setStep("form")
                    if (negotiateParam === "true") {
                        setIsNegotiating(true)
                    }
                }
            }
        }
    }, [slots])

    // Update URL helper
    const updateUrl = (date: Date, slot?: TimeSlot, negotiating?: boolean) => {
        const params = new URLSearchParams()
        params.set("date", format(date, "yyyy-MM-dd"))
        if (slot) params.set("slot", slot.start)
        if (negotiating) params.set("negotiate", "true")

        router.push(`/book/${slug}?${params.toString()}`, { scroll: false })
    }

    const fetchSlots = async () => {
        try {
            setLoading(true)
            const res = await fetch(`/api/book/${slug}?date=${format(selectedDate, "yyyy-MM-dd")}`)
            const data = await res.json()

            if (res.ok) {
                setSlots(data.slots)
                setAppointmentType(data.appointmentType)
                setUser(data.user)
            } else {
                setError(data.error || "Failed to load availability")
            }
        } catch (error) {
            setError("Failed to load availability")
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedSlot || !appointmentType) return

        // If negotiating and not confirmed auth (though UI shouldn't allow this), prevent
        if (isNegotiating && !session) {
            setShowAuthModal(true)
            return
        }

        setSubmitting(true)
        setError("")

        try {
            const res = await fetch(`/api/book/${slug}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    start: selectedSlot.start,
                    end: selectedSlot.end,
                    guestName: session?.user?.name || formData.name, // Use session name if logged in
                    guestEmail: session?.user?.email || formData.email,
                    guestPhone: formData.phone,
                    guestNotes: formData.notes,
                    appointmentTypeId: appointmentType.id,
                    // Negotiation fields
                    isNegotiation: isNegotiating,
                    negotiationNote: isNegotiating ? formData.notes : undefined // Use notes as negotiation reason
                })
            })

            const data = await res.json()

            if (res.ok) {
                setSuccess(true)
            } else {
                setError(data.error || "Failed to book appointment")
            }
        } catch (error) {
            setError("Failed to book appointment")
        } finally {
            setSubmitting(false)
        }
    }

    // Generate dates for the next 14 days
    const dates = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i))

    if (success) {
        return (
            <div className="min-h-screen gradient-radial flex items-center justify-center p-4">
                <div className="glass rounded-2xl p-8 max-w-md w-full text-center animate-fade-in">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                        <Check size={32} className="text-emerald-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Booking Confirmed!</h1>
                    <p className="text-slate-400 mb-6">
                        Your appointment has been scheduled. You&apos;ll receive a confirmation email shortly.
                    </p>
                    <div className="p-4 rounded-lg bg-slate-800/50 mb-6">
                        <p className="text-sm text-slate-400 mb-1">Appointment with</p>
                        <p className="font-semibold text-white">{user?.name}</p>
                        <p className="text-sm text-slate-400 mt-3 mb-1">Date & Time</p>
                        <p className="font-semibold text-white">
                            {selectedSlot && format(parseISO(selectedSlot.start), "EEEE, MMMM d, yyyy")}
                        </p>
                        <p className="text-indigo-400">
                            {selectedSlot && format(parseISO(selectedSlot.start), "h:mm a")} - {selectedSlot && format(parseISO(selectedSlot.end), "h:mm a")}
                        </p>
                    </div>
                    <button
                        onClick={() => router.push("/")}
                        className="btn btn-primary w-full"
                    >
                        Done
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen gradient-radial">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 -left-20 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
            </div>

            <div className="relative max-w-4xl mx-auto p-4 md:p-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center">
                            <Calendar size={24} className="text-white" />
                        </div>
                    </div>
                    {user && (
                        <>
                            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                                Book a time with {user.name}
                            </h1>
                            {appointmentType && (
                                <p className="text-slate-400">
                                    {appointmentType.name} • {appointmentType.duration} minutes
                                </p>
                            )}
                        </>
                    )}
                </div>

                {error && (
                    <div className="mb-6 p-4 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm text-center">
                        {error}
                    </div>
                )}

                {/* Main Content */}
                <div className="glass rounded-2xl overflow-hidden">
                    {step === "date" && (
                        <div className="p-6">
                            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <Calendar size={20} className="text-indigo-400" />
                                Select a Date
                            </h2>

                            <div className="grid grid-cols-7 gap-2">
                                {dates.map((date) => {
                                    const isSelected = format(date, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd")
                                    const isToday = format(date, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")

                                    return (
                                        <button
                                            key={date.toISOString()}
                                            onClick={() => {
                                                setSelectedDate(date)
                                                setSelectedSlot(null)
                                                setStep("time")
                                                updateUrl(date)
                                            }}
                                            className={`
                        p-3 rounded-xl text-center transition-all duration-200
                        ${isSelected
                                                    ? "bg-indigo-500 text-white"
                                                    : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                                                }
                        ${isToday ? "ring-2 ring-indigo-500/50" : ""}
                      `}
                                        >
                                            <span className="text-xs text-slate-400">{format(date, "EEE")}</span>
                                            <span className="block text-lg font-semibold">{format(date, "d")}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {step === "time" && (
                        <div className="p-6">
                            <div className="flex items-center gap-4 mb-6">
                                <button
                                    onClick={() => setStep("date")}
                                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <div>
                                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                        <Clock size={20} className="text-indigo-400" />
                                        Select a Time
                                    </h2>
                                    <p className="text-sm text-slate-400">
                                        {format(selectedDate, "EEEE, MMMM d, yyyy")}
                                    </p>
                                </div>
                            </div>

                            {loading ? (
                                <div className="flex items-center justify-center py-12">
                                    <div className="loading-spinner" />
                                </div>
                            ) : slots.length === 0 ? (
                                <div className="text-center py-12">
                                    <Clock size={48} className="mx-auto text-slate-600 mb-4" />
                                    <p className="text-slate-400">No available times for this date</p>
                                    <button
                                        onClick={() => setStep("date")}
                                        className="btn btn-outline mt-4"
                                    >
                                        Select another date
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 md:grid-cols-4 gap-2 max-h-80 overflow-y-auto">
                                    {slots.map((slot) => {
                                        const isSelected = selectedSlot?.start === slot.start
                                        return (
                                            <button
                                                key={slot.start}
                                                onClick={() => {
                                                    setSelectedSlot(slot)
                                                    setStep("form")
                                                }}
                                                className={`
                          py-3 px-4 rounded-lg font-medium transition-all duration-200
                          ${isSelected
                                                        ? "bg-indigo-500 text-white"
                                                        : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                                                    }
                        `}
                                            >
                                                {format(parseISO(slot.start), "h:mm a")}
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {step === "form" && (
                        <div className="p-6">
                            <div className="flex items-center gap-4 mb-6">
                                <button
                                    onClick={() => setStep("time")}
                                    className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <div>
                                    <h2 className="text-lg font-semibold text-white">
                                        {isNegotiating ? "Propose New Time" : "Enter Your Details"}
                                    </h2>
                                    <p className="text-sm text-slate-400">
                                        {format(selectedDate, "EEEE, MMMM d")} at {selectedSlot && format(parseISO(selectedSlot.start), "h:mm a")}
                                    </p>
                                </div>
                            </div>

                            {!session && isNegotiating ? (
                                <div className="text-center py-8">
                                    <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center mx-auto mb-4">
                                        <Lock size={32} className="text-indigo-400" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-white mb-2">Login Required</h3>
                                    <p className="text-slate-400 mb-6 px-4">
                                        To negotiate a different time, you need to sign in or create an account.
                                    </p>
                                    <div className="space-y-3">
                                        <button
                                            onClick={() => signIn("google", { callbackUrl: window.location.href })}
                                            className="btn btn-primary w-full flex items-center justify-center gap-2"
                                        >
                                            Sign in with Google
                                        </button>
                                        <Link href={`/login?callbackUrl=${encodeURIComponent(window.location.href)}`} className="btn btn-outline w-full block">
                                            Sign in with Email
                                        </Link>
                                    </div>
                                    <button
                                        onClick={() => setIsNegotiating(false)}
                                        className="mt-6 text-sm text-slate-500 hover:text-slate-300"
                                    >
                                        Cancel Negotiation
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    {/* Negotiation Toggle */}
                                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 mb-4">
                                        <div className="flex items-center gap-2">
                                            <Clock size={16} className="text-indigo-400" />
                                            <span className="text-sm text-slate-300">Default Slot</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setIsNegotiating(!isNegotiating)}
                                            className="text-xs font-medium text-indigo-400 hover:text-white"
                                        >
                                            {isNegotiating ? "Switch to Standard Booking" : "Negotiate / Propose Change"}
                                        </button>
                                    </div>

                                    {session ? (
                                        <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold">
                                                    {session.user?.name?.[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-white">Booking as {session.user?.name}</p>
                                                    <p className="text-xs text-slate-400">{session.user?.email}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div>
                                                <label className="label flex items-center gap-2">
                                                    <User size={16} className="text-slate-400" />
                                                    Your Name *
                                                </label>
                                                <input
                                                    type="text"
                                                    value={formData.name}
                                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                    className="input"
                                                    placeholder="John Doe"
                                                    required
                                                />
                                            </div>

                                            <div>
                                                <label className="label flex items-center gap-2">
                                                    <Mail size={16} className="text-slate-400" />
                                                    Email *
                                                </label>
                                                <input
                                                    type="email"
                                                    value={formData.email}
                                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                    className="input"
                                                    placeholder="you@example.com"
                                                    required
                                                />
                                            </div>
                                        </>
                                    )}

                                    <div>
                                        <label className="label flex items-center gap-2">
                                            <Phone size={16} className="text-slate-400" />
                                            Phone
                                        </label>
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            className="input"
                                            placeholder="+1 (555) 000-0000"
                                        />
                                    </div>

                                    <div>
                                        <label className="label flex items-center gap-2">
                                            <FileText size={16} className="text-slate-400" />
                                            {isNegotiating ? "Reason for Change / Proposed Time" : "Additional Notes"}
                                        </label>
                                        <textarea
                                            value={formData.notes}
                                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                            className="input resize-none"
                                            rows={3}
                                            placeholder={isNegotiating ? "I'd prefer 10:30 if possible..." : "Anything you'd like us to know..."}
                                            required={isNegotiating}
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="btn btn-primary w-full py-3 text-lg mt-6"
                                    >
                                        {submitting ? (
                                            <span className="loading-spinner mx-auto" />
                                        ) : isNegotiating ? (
                                            "Submit Negotiation Request"
                                        ) : (
                                            "Confirm Booking"
                                        )}
                                    </button>
                                </form>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <p className="text-center text-sm text-slate-500 mt-8">
                    Powered by <span className="text-indigo-400 font-medium">Cally</span>
                </p>
            </div>
        </div>
    )
}

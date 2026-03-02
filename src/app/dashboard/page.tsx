"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useSession } from "next-auth/react"
import { format, parseISO } from "date-fns"
import Link from "next/link"
import dynamic from "next/dynamic"
import {
  CalendarCheck,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Calendar,
  ArrowRight,
  BarChart3,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react"

// Code-split: OnboardingWizard is only shown once per user
const OnboardingWizard = dynamic(() => import("@/components/OnboardingWizard"), { ssr: false })

interface DashboardStats {
  total: number
  pending: number
  confirmed: number
  cancelled: number
  todayCount: number
  weekCount: number
  monthCount: number
  totalEvents: number
  busiestDay: string
}

interface DashboardData {
  stats: DashboardStats
  todayAppointments: any[]
  upcomingAppointments: any[]
  recentActivity: any[]
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)

  const userSlug = (session?.user as any)?.slug
  const onboardingCompleted = (session?.user as any)?.onboardingCompleted

  useEffect(() => {
    if (onboardingCompleted === false) {
      setShowOnboarding(true)
    }
  }, [onboardingCompleted])

  useEffect(() => {
    fetch("/api/dashboard")
      .then((res) => res.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const bookingUrl = useMemo(() =>
    typeof window !== "undefined" ? `${window.location.origin}/book/${userSlug}` : `/book/${userSlug}`
  , [userSlug])

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(bookingUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }, [bookingUrl])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-surface-secondary rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card animate-pulse h-28" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card animate-pulse h-64" />
          <div className="card animate-pulse h-64" />
        </div>
      </div>
    )
  }

  const stats = data?.stats

  return (
    <>
      {showOnboarding && (
        <OnboardingWizard onComplete={() => setShowOnboarding(false)} />
      )}

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text">
              Welcome back, {session?.user?.name?.split(" ")[0] || "there"}
            </h1>
            <p className="text-text-secondary text-sm mt-1">
              Here&apos;s what&apos;s happening with your schedule
            </p>
          </div>

          {/* Booking link */}
          {userSlug && (
            <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-secondary border border-border">
              <code className="text-sm text-primary truncate max-w-[200px]">/book/{userSlug}</code>
              <button
                onClick={copyLink}
                className="p-1 rounded hover:bg-surface-hover text-text-tertiary hover:text-text transition-colors"
                title="Copy booking link"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              </button>
              <Link
                href={`/book/${userSlug}`}
                target="_blank"
                className="p-1 rounded hover:bg-surface-hover text-text-tertiary hover:text-text transition-colors"
                title="Open booking page"
              >
                <ExternalLink size={14} />
              </Link>
            </div>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">
                  Today
                </p>
                <p className="text-3xl font-bold text-text mt-1">{stats?.todayCount ?? 0}</p>
                <p className="text-xs text-text-secondary mt-1">appointments</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Calendar size={24} className="text-primary" />
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">
                  Pending
                </p>
                <p className="text-3xl font-bold text-amber-400 mt-1">{stats?.pending ?? 0}</p>
                <p className="text-xs text-text-secondary mt-1">awaiting action</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <AlertCircle size={24} className="text-amber-400" />
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">
                  This Week
                </p>
                <p className="text-3xl font-bold text-text mt-1">{stats?.weekCount ?? 0}</p>
                <p className="text-xs text-text-secondary mt-1">confirmed</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp size={24} className="text-emerald-400" />
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wider">
                  Total
                </p>
                <p className="text-3xl font-bold text-text mt-1">{stats?.total ?? 0}</p>
                <p className="text-xs text-text-secondary mt-1">all time</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                <BarChart3 size={24} className="text-indigo-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Today's Schedule */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text flex items-center gap-2">
                <Clock size={18} className="text-primary" />
                Today&apos;s Schedule
              </h2>
              <Link href="/calendar" className="text-sm text-primary hover:text-primary-hover flex items-center gap-1">
                View Calendar <ArrowRight size={14} />
              </Link>
            </div>

            {data?.todayAppointments && data.todayAppointments.length > 0 ? (
              <div className="space-y-3">
                {data.todayAppointments.map((apt: any) => (
                  <div key={apt.id} className="flex items-center gap-3 p-3 rounded-lg bg-surface-secondary">
                    <div
                      className="w-1 h-12 rounded-full"
                      style={{ backgroundColor: apt.appointmentType?.color || "#6366f1" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text truncate">{apt.title}</p>
                      <p className="text-xs text-text-secondary">
                        {format(parseISO(apt.start), "h:mm a")} — {format(parseISO(apt.end), "h:mm a")}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        apt.status === "CONFIRMED"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : apt.status === "PENDING"
                          ? "bg-amber-500/20 text-amber-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {apt.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CalendarCheck size={32} className="mx-auto text-text-tertiary mb-2" />
                <p className="text-sm text-text-secondary">No appointments today</p>
              </div>
            )}
          </div>

          {/* Upcoming */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-text flex items-center gap-2">
                <CalendarCheck size={18} className="text-emerald-400" />
                Upcoming
              </h2>
              <Link href="/appointments" className="text-sm text-primary hover:text-primary-hover flex items-center gap-1">
                View All <ArrowRight size={14} />
              </Link>
            </div>

            {data?.upcomingAppointments && data.upcomingAppointments.length > 0 ? (
              <div className="space-y-3">
                {data.upcomingAppointments.map((apt: any) => (
                  <div key={apt.id} className="flex items-center gap-3 p-3 rounded-lg bg-surface-secondary">
                    <div className="text-center min-w-[48px]">
                      <p className="text-lg font-bold text-text">
                        {format(parseISO(apt.start), "d")}
                      </p>
                      <p className="text-[10px] text-text-tertiary uppercase">
                        {format(parseISO(apt.start), "MMM")}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text truncate">{apt.title}</p>
                      <p className="text-xs text-text-secondary">
                        {format(parseISO(apt.start), "EEE, h:mm a")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle2 size={32} className="mx-auto text-text-tertiary mb-2" />
                <p className="text-sm text-text-secondary">No upcoming appointments</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 size={20} className="text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-text">{stats?.confirmed ?? 0} Confirmed</p>
              <p className="text-xs text-text-secondary">All time</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
              <XCircle size={20} className="text-red-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-text">{stats?.cancelled ?? 0} Cancelled</p>
              <p className="text-xs text-text-secondary">All time</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center">
              <BarChart3 size={20} className="text-indigo-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-text">Busiest: {stats?.busiestDay ?? "N/A"}</p>
              <p className="text-xs text-text-secondary">Peak day</p>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        {data?.recentActivity && data.recentActivity.length > 0 && (
          <div className="card">
            <h2 className="text-lg font-semibold text-text mb-4">Recent Activity</h2>
            <div className="space-y-2">
              {data.recentActivity.map((log: any) => (
                <div key={log.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        log.action.includes("CREATE")
                          ? "bg-emerald-400"
                          : log.action.includes("DELETE") || log.action.includes("CANCEL")
                          ? "bg-red-400"
                          : "bg-blue-400"
                      }`}
                    />
                    <span className="text-sm text-text">
                      {log.action.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())}
                    </span>
                    {log.entity && (
                      <span className="text-xs text-text-tertiary">({log.entity})</span>
                    )}
                  </div>
                  <span className="text-xs text-text-tertiary">
                    {format(parseISO(log.createdAt), "MMM d, h:mm a")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

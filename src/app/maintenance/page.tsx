"use client"

import { Calendar, Wrench } from "lucide-react"

export default function MaintenancePage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="text-center max-w-md mx-auto">
                {/* Icon */}
                <div className="w-20 h-20 rounded-2xl bg-warning/10 flex items-center justify-center mx-auto mb-8">
                    <Wrench size={40} className="text-warning" />
                </div>

                {/* Title */}
                <h1 className="text-3xl font-bold text-text mb-3">
                    Under Maintenance
                </h1>

                {/* Description */}
                <p className="text-text-secondary text-lg mb-8 leading-relaxed">
                    We&apos;re performing scheduled maintenance to improve your experience.
                    We&apos;ll be back shortly.
                </p>

                {/* Info card */}
                <div className="bg-surface rounded-xl border border-border p-6 mb-8">
                    <div className="flex items-center gap-3 justify-center text-text-tertiary">
                        <Calendar size={18} />
                        <span className="text-sm">
                            The application is temporarily unavailable while updates are being applied.
                        </span>
                    </div>
                </div>

                {/* Retry button */}
                <button
                    onClick={() => window.location.reload()}
                    className="btn-primary px-6 py-2.5 rounded-lg text-sm font-medium"
                >
                    Try Again
                </button>

                <p className="text-text-tertiary text-xs mt-6">
                    If this persists, contact your system administrator.
                </p>
            </div>
        </div>
    )
}

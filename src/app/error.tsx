"use client"

import { useEffect } from "react"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"
import Link from "next/link"

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error("Application error:", error)
    }, [error])

    return (
        <div className="min-h-[60vh] flex items-center justify-center p-4">
            <div className="text-center max-w-md">
                <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center mx-auto mb-6">
                    <AlertTriangle size={32} className="text-red-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Something went wrong</h2>
                <p className="text-slate-400 mb-6">
                    An unexpected error occurred. Please try again or contact your administrator.
                </p>
                {error.digest && (
                    <p className="text-xs text-slate-500 mb-4 font-mono">
                        Error ID: {error.digest}
                    </p>
                )}
                <div className="flex items-center justify-center gap-3">
                    <button
                        onClick={reset}
                        className="btn btn-primary flex items-center gap-2"
                    >
                        <RefreshCw size={16} />
                        Try again
                    </button>
                    <Link href="/dashboard" className="btn btn-outline flex items-center gap-2">
                        <Home size={16} />
                        Go home
                    </Link>
                </div>
            </div>
        </div>
    )
}

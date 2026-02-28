"use client"

import { useState } from "react"
import { signIn, getProviders } from "next-auth/react"
import { Calendar } from "lucide-react"
import { useEffect } from "react"

interface OAuthProvider {
    id: string
    name: string
}

const PROVIDER_ICONS: Record<string, React.ReactNode> = {
    google: (
        <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
    ),
    discord: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#5865F2">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
        </svg>
    ),
    twitter: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
    ),
    facebook: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="#1877F2">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
    ),
    apple: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
        </svg>
    ),
}

export default function LoginPage() {
    const [loadingProvider, setLoadingProvider] = useState<string | null>(null)
    const [error, setError] = useState("")
    const [providers, setProviders] = useState<OAuthProvider[]>([])

    useEffect(() => {
        getProviders().then((p) => {
            if (p) {
                setProviders(Object.values(p))
            }
        })
    }, [])

    const handleSignIn = async (providerId: string) => {
        setLoadingProvider(providerId)
        setError("")
        try {
            await signIn(providerId, { callbackUrl: "/calendar" })
        } catch {
            setError(`Failed to sign in with ${providerId}`)
            setLoadingProvider(null)
        }
    }

    return (
        <div className="min-h-screen gradient-radial flex items-center justify-center p-4">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 -left-20 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-3 mb-4">
                        <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center shadow-lg shadow-indigo-500/30">
                            <Calendar size={32} className="text-white" />
                        </div>
                        <span className="text-3xl font-bold text-white">Cally</span>
                    </div>
                    <p className="text-slate-400">Sign in to your account</p>
                </div>

                {/* Sign in card */}
                <div className="glass rounded-2xl p-8">
                    {error && (
                        <div className="mb-6 p-4 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="space-y-3">
                        {providers.map((provider) => (
                            <button
                                key={provider.id}
                                type="button"
                                onClick={() => handleSignIn(provider.id)}
                                disabled={loadingProvider !== null}
                                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg bg-white text-gray-700 font-medium hover:bg-gray-100 transition-colors disabled:opacity-50"
                            >
                                {loadingProvider === provider.id ? (
                                    <span className="loading-spinner" />
                                ) : (
                                    <>
                                        {PROVIDER_ICONS[provider.id] || null}
                                        Continue with {provider.name}
                                    </>
                                )}
                            </button>
                        ))}
                    </div>

                    {providers.length === 0 && (
                        <p className="text-center text-slate-400 text-sm py-4">
                            Loading sign-in options...
                        </p>
                    )}

                    <p className="mt-6 text-center text-xs text-slate-500">
                        By signing in, you agree to our terms of service.
                        Your account will be created automatically on first sign-in.
                    </p>
                </div>
            </div>
        </div>
    )
}

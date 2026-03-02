"use client"

import { useState, useEffect } from "react"
import { signIn, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Calendar, Eye, EyeOff, Check, X, ArrowRight } from "lucide-react"

interface PasswordRequirement {
  label: string
  test: (pw: string) => boolean
}

const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  { label: "At least 8 characters", test: (pw) => pw.length >= 8 },
  { label: "One uppercase letter", test: (pw) => /[A-Z]/.test(pw) },
  { label: "One lowercase letter", test: (pw) => /[a-z]/.test(pw) },
  { label: "One number", test: (pw) => /[0-9]/.test(pw) },
]

export default function RegisterPage() {
  const { status } = useSession()
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/calendar")
    }
  }, [status, router])

  if (status === "loading" || status === "authenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="loading-spinner" />
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Registration failed.")
        setLoading(false)
        return
      }

      setSuccess(true)

      // Auto-login after registration
      const loginResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (loginResult?.ok) {
        router.push("/calendar")
      } else {
        // Fallback: redirect to login
        router.push("/login?registered=true")
      }
    } catch {
      setError("An unexpected error occurred. Please try again.")
      setLoading(false)
    }
  }

  const allRequirementsMet = PASSWORD_REQUIREMENTS.every((r) => r.test(password))

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
          <p className="text-slate-400">Create your account</p>
        </div>

        {/* Register card */}
        <div className="glass rounded-2xl p-8">
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm flex items-center gap-2">
              <Check size={16} />
              Account created! Signing you in...
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="label">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                placeholder="John Doe"
                required
                autoFocus
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="email" className="label">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="john@example.com"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pr-10"
                  placeholder="••••••••"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Password requirements */}
              {password.length > 0 && (
                <div className="mt-3 space-y-1">
                  {PASSWORD_REQUIREMENTS.map((req) => {
                    const met = req.test(password)
                    return (
                      <div
                        key={req.label}
                        className={`flex items-center gap-2 text-xs ${
                          met ? "text-emerald-400" : "text-slate-500"
                        }`}
                      >
                        {met ? <Check size={12} /> : <X size={12} />}
                        {req.label}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !allRequirementsMet || !name || !email}
              className="w-full btn btn-primary flex items-center justify-center gap-2 py-3"
            >
              {loading ? (
                <span className="loading-spinner" />
              ) : (
                <>
                  Create Account
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-400">
            Already have an account?{" "}
            <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

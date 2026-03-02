import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

const PUBLIC_PATHS = ["/login", "/register", "/book", "/maintenance", "/api/auth", "/api/health", "/api/book", "/api/embed", "/api/ical", "/api/branding"]
const STATIC_PATHS = ["/_next", "/favicon.ico", "/embed.js"]
const isDev = process.env.NODE_ENV !== "production"

// Combined proxy: security headers + route protection (Next.js 16)
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip static assets entirely
  if (STATIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // --- Route protection ---

  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p))

  if (isPublicPath) {
    // Redirect authenticated users away from /login
    if (pathname === "/login") {
      const token = await getToken({ req: request })
      if (token) {
        return NextResponse.redirect(new URL("/dashboard", request.url))
      }
    }
  } else {
    // Protected route — require authentication
    const token = await getToken({ req: request })
    if (!token) {
      const loginUrl = new URL("/login", request.url)
      loginUrl.searchParams.set("callbackUrl", pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Admin route protection
    if (pathname.startsWith("/admin") && token.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
  }

  // --- Security headers ---

  const response = NextResponse.next()
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64")

  // Content Security Policy
  // In dev: allow unsafe-eval + unsafe-inline (required by Turbopack/React Server Components + Next.js inline scripts)
  // In prod: use nonce-based inline scripts only (no eval)
  const scriptSrc = isDev
    ? `script-src 'self' 'unsafe-eval' 'unsafe-inline'`
    : `script-src 'self' 'nonce-${nonce}'`

  const cspDirectives = [
    "default-src 'self'",
    scriptSrc,
    `style-src 'self' 'unsafe-inline'`, // Tailwind requires unsafe-inline for styles
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    `connect-src 'self' ${isDev ? "http: ws:" : "https:"}`, // Allow ws: for HMR in dev
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ]

  // Only enforce HTTPS upgrade in production
  if (!isDev) {
    cspDirectives.push("upgrade-insecure-requests")
  }

  response.headers.set("Content-Security-Policy", cspDirectives.join("; "))

  // Strict Transport Security — production only (breaks http://localhost in dev)
  if (!isDev) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    )
  }

  // Prevent clickjacking
  response.headers.set("X-Frame-Options", "DENY")

  // Prevent MIME type sniffing
  response.headers.set("X-Content-Type-Options", "nosniff")

  // Referrer Policy
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")

  // Permissions Policy
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  )

  // Cross-Origin policies
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin")
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin")

  // Remove X-Powered-By
  response.headers.delete("X-Powered-By")

  // Pass nonce to the page via header (for inline script support)
  response.headers.set("X-Nonce", nonce)

  return response
}

export const config = {
  matcher: [
    // Match all paths except static files and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}

import { NextRequest, NextResponse } from "next/server"

// Security headers proxy (#9) - Migrated from deprecated middleware.ts to proxy.ts (Next.js 16)
export function proxy(request: NextRequest) {
  const response = NextResponse.next()
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64")

  // Content Security Policy - tightened: removed unsafe-eval, use nonce for inline scripts
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}'`,
      `style-src 'self' 'unsafe-inline'`, // Tailwind requires unsafe-inline for styles
      "img-src 'self' data: https: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join("; ")
  )

  // Strict Transport Security (HSTS with preload)
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  )

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

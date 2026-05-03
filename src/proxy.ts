import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/register",
  "/book",
  "/maintenance",
  "/api/auth",
  "/api/health",
  "/api/book",
  "/api/embed",
  "/api/ical",
  "/api/branding",
  "/api/integrations/google/webhook",
];
const STATIC_PATHS = ["/_next", "/favicon.ico", "/embed.js"];
const isDev = process.env.NODE_ENV !== "production";
const COOKIE_PREFIX = "cally";

// Combined middleware: security headers + route protection (Next.js 16)
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets entirely
  if (STATIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Let API routes handle their own auth so they can return clean JSON 401s
  // instead of HTML redirects. Public API paths above are still public.
  if (pathname.startsWith("/api/")) {
    return securityHeaders(NextResponse.next());
  }

  // ---- Lightweight session presence check ----
  // We only check for the better-auth session-token cookie here for redirects.
  // Full session validation happens server-side in route handlers / pages.
  const sessionCookie =
    request.cookies.get(`${COOKIE_PREFIX}.session_token`)?.value ??
    request.cookies.get(`__Secure-${COOKIE_PREFIX}.session_token`)?.value;
  const isAuthenticated = Boolean(sessionCookie);

  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (isPublicPath) {
    if (pathname === "/login" && isAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  } else if (!isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ---- Security headers ----
  return securityHeaders(NextResponse.next());
}

function securityHeaders(response: NextResponse): NextResponse {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  const scriptSrc = isDev
    ? `script-src 'self' 'unsafe-eval' 'unsafe-inline'`
    : `script-src 'self' 'nonce-${nonce}'`;

  const cspDirectives = [
    "default-src 'self'",
    scriptSrc,
    `style-src 'self' 'unsafe-inline'`,
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    `connect-src 'self' ${isDev ? "http: ws:" : "https:"}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];

  if (!isDev) cspDirectives.push("upgrade-insecure-requests");

  response.headers.set("Content-Security-Policy", cspDirectives.join("; "));
  if (!isDev) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  );
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  response.headers.delete("X-Powered-By");
  response.headers.set("X-Nonce", nonce);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

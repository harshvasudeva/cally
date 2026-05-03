// Compat shim for client-side `next-auth/react` imports.
// Re-exports better-auth's React client under NextAuth-compatible names.
"use client";

import { authClient } from "./auth-client";

// Wraps better-auth's useSession to match NextAuth's { data, status } shape.
export function useSession() {
  const { data, isPending, error } = authClient.useSession();
  let status: "loading" | "authenticated" | "unauthenticated" = "loading";
  if (isPending) status = "loading";
  else if (data) status = "authenticated";
  else status = "unauthenticated";

  // NextAuth-compatible session shape
  const session = data
    ? {
        user: {
          id: (data.user as { id: string }).id,
          email: data.user.email ?? null,
          name: data.user.name ?? null,
          image: data.user.image ?? null,
          ...(data.user as Record<string, unknown>),
        },
        expires: data.session.expiresAt
          ? new Date(data.session.expiresAt as unknown as string).toISOString()
          : "",
      }
    : null;

  return { data: session, status, error } as const;
}

// NextAuth.signIn(provider, options) → better-auth signIn
export async function signIn(
  provider: string = "credentials",
  options: {
    email?: string;
    password?: string;
    redirect?: boolean;
    callbackUrl?: string;
  } = {},
) {
  if (provider === "credentials") {
    if (!options.email || !options.password) {
      return { ok: false, error: "Email and password required", status: 400, url: null };
    }
    const res = await authClient.signIn.email({
      email: options.email,
      password: options.password,
      callbackURL: options.callbackUrl,
    });
    if (res.error) {
      return { ok: false, error: res.error.message ?? "Sign in failed", status: 401, url: null };
    }
    if (options.redirect !== false && options.callbackUrl) {
      window.location.href = options.callbackUrl;
    }
    return { ok: true, error: null, status: 200, url: options.callbackUrl ?? null };
  }
  // OAuth/social provider
  return authClient.signIn.social({
    provider: provider as "google" | "github" | "discord" | "microsoft" | "apple",
    callbackURL: options.callbackUrl,
  });
}

export async function signOut(options: { callbackUrl?: string; redirect?: boolean } = {}) {
  const res = await authClient.signOut();
  if (options.redirect !== false) {
    window.location.href = options.callbackUrl ?? "/login";
  }
  return res;
}

// SessionProvider — better-auth doesn't need one (uses internal hooks),
// but pages may wrap the app with this. Just render children.
export function SessionProvider(props: { children: React.ReactNode }) {
  return props.children as React.ReactElement;
}

// getSession() exported for parity
export async function getSession() {
  return authClient.getSession();
}

// NextAuth's getProviders() — returns configured social providers.
// We fetch them from /api/auth/providers-list (server-rendered from env).
export async function getProviders(): Promise<Record<string, { id: string; name: string }> | null> {
  try {
    const res = await fetch("/api/auth/providers-list", { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

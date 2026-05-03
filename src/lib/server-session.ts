// Compatibility shim: lets pages that previously imported from "@/lib/server-session"
// keep working while we migrate to better-auth.
// Import path: @/lib/server-session  →  exposes getServerSession()
import { headers } from "next/headers";
import { auth } from "./auth";

export type ServerSession = {
  user: {
    id: string;
    email: string | null;
    name: string | null;
    image: string | null;
    role?: string | null;
    slug?: string | null;
    timezone?: string | null;
    theme?: string | null;
    onboardingCompleted?: boolean | null;
  };
  expires: string;
} | null;

/**
 * Drop-in replacement for next-auth's getServerSession().
 * The optional `_options` argument is accepted but ignored — kept for API
 * compatibility while pages still pass `authOptions`.
 */
export async function getServerSession(_options?: unknown): Promise<ServerSession> {
  const hdrs = await headers();
  const session = await auth.api.getSession({ headers: hdrs });
  if (!session) return null;
  const u = session.user as Record<string, unknown>;
  return {
    user: {
      id: u.id as string,
      email: (u.email as string) ?? null,
      name: (u.name as string) ?? null,
      image: (u.image as string) ?? null,
      role: (u.role as string) ?? null,
      slug: (u.slug as string) ?? null,
      timezone: (u.timezone as string) ?? null,
      theme: (u.theme as string) ?? null,
      onboardingCompleted: (u.onboardingCompleted as boolean) ?? null,
    },
    expires: session.session.expiresAt
      ? new Date(session.session.expiresAt as unknown as string).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

// Stub kept for compatibility — no longer used.
export const authOptions = {} as const;

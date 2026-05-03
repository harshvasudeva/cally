import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import crypto from "node:crypto";
import { auth } from "@/lib/auth";
import { getAuthUrl } from "@/lib/calendar/google";

// Begin Google OAuth — redirects user to consent screen.
export async function GET(_req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.redirect(new URL("/login", _req.url));

  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.json(
      { error: "Google Calendar integration is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET." },
      { status: 503 },
    );
  }

  // Sign state so we can verify on callback. Includes userId + nonce.
  const nonce = crypto.randomBytes(16).toString("hex");
  const payload = `${session.user.id}.${nonce}`;
  const sig = crypto
    .createHmac("sha256", process.env.BETTER_AUTH_SECRET ?? "dev")
    .update(payload)
    .digest("hex")
    .slice(0, 16);
  const state = `${payload}.${sig}`;

  const url = getAuthUrl(state);
  const res = NextResponse.redirect(url);
  res.cookies.set("cally_gcal_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  });
  return res;
}

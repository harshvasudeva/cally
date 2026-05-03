import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import crypto from "node:crypto";
import { google } from "googleapis";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { encrypt } from "@/lib/crypto";
import { getOAuthClient, fullSyncCalendar } from "@/lib/calendar/google";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.redirect(new URL("/login", req.url));

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const cookieState = req.cookies.get("cally_gcal_state")?.value;

  if (error) {
    return NextResponse.redirect(new URL(`/settings/integrations?error=${encodeURIComponent(error)}`, req.url));
  }
  if (!code || !state || state !== cookieState) {
    return NextResponse.redirect(new URL("/settings/integrations?error=invalid_state", req.url));
  }

  // Verify HMAC
  const [userId, nonce, sig] = state.split(".");
  const expected = crypto
    .createHmac("sha256", process.env.BETTER_AUTH_SECRET ?? "dev")
    .update(`${userId}.${nonce}`)
    .digest("hex")
    .slice(0, 16);
  if (sig !== expected || userId !== session.user.id) {
    return NextResponse.redirect(new URL("/settings/integrations?error=state_mismatch", req.url));
  }

  // Exchange code for tokens
  const oauth2 = getOAuthClient();
  const { tokens } = await oauth2.getToken(code);
  oauth2.setCredentials(tokens);

  // Get user info to identify the Google account
  const oauth2api = google.oauth2({ version: "v2", auth: oauth2 });
  const userInfo = await oauth2api.userinfo.get();
  const externalAccountId = userInfo.data.id ?? "unknown";
  const email = userInfo.data.email ?? "unknown@unknown";

  const accessTokenEnc = tokens.access_token ? encrypt(tokens.access_token) : null;
  const refreshTokenEnc = tokens.refresh_token ? encrypt(tokens.refresh_token) : null;
  const tokenExpiresAt = tokens.expiry_date ? new Date(tokens.expiry_date) : null;

  const account = await prisma.calendarAccount.upsert({
    where: {
      userId_provider_externalAccountId: {
        userId: session.user.id,
        provider: "google",
        externalAccountId,
      },
    },
    update: {
      accessTokenEnc,
      refreshTokenEnc: refreshTokenEnc ?? undefined,
      tokenExpiresAt,
      email,
      displayName: userInfo.data.name ?? null,
      syncStatus: "syncing",
      syncError: null,
    },
    create: {
      userId: session.user.id,
      provider: "google",
      externalAccountId,
      email,
      displayName: userInfo.data.name ?? null,
      accessTokenEnc,
      refreshTokenEnc,
      tokenExpiresAt,
      syncStatus: "syncing",
    },
  });

  // List calendars
  const cal = google.calendar({ version: "v3", auth: oauth2 });
  const calList = await cal.calendarList.list({ maxResults: 250 });
  for (const c of calList.data.items ?? []) {
    if (!c.id) continue;
    const extCal = await prisma.externalCalendar.upsert({
      where: { calendarAccountId_externalId: { calendarAccountId: account.id, externalId: c.id } },
      update: {
        summary: c.summary ?? "(untitled)",
        color: c.backgroundColor ?? null,
        timezone: c.timeZone ?? null,
        isPrimary: Boolean(c.primary),
        writable: c.accessRole === "owner" || c.accessRole === "writer",
      },
      create: {
        calendarAccountId: account.id,
        externalId: c.id,
        summary: c.summary ?? "(untitled)",
        color: c.backgroundColor ?? null,
        timezone: c.timeZone ?? null,
        isPrimary: Boolean(c.primary),
        writable: c.accessRole === "owner" || c.accessRole === "writer",
        selected: Boolean(c.primary),
      },
    });
    if (c.primary) {
      // Synchronously sync the primary calendar (typically small).
      // For other calendars, deferred to a worker in Phase 1.
      try {
        await fullSyncCalendar(account.id, extCal.id, c.id);
      } catch (err) {
        console.error("[gcal] full sync failed", err);
      }
    }
  }

  await prisma.calendarAccount.update({
    where: { id: account.id },
    data: { syncStatus: "idle", lastSyncAt: new Date() },
  });

  const res = NextResponse.redirect(new URL("/settings/integrations?connected=google", req.url));
  res.cookies.delete("cally_gcal_state");
  return res;
}

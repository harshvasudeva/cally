// Google Calendar OAuth + Sync helpers.
// Uses googleapis for OAuth code-exchange and refresh, and to call Calendar v3.
import { google } from "googleapis";
import prisma from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/crypto";

const REQUIRED_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
];

function getRedirectUri() {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  return `${base}/api/integrations/google/callback`;
}

export function getOAuthClient() {
  const id = process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!id || !secret) {
    throw new Error(
      "Google Calendar integration not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
    );
  }
  return new google.auth.OAuth2({
    clientId: id,
    clientSecret: secret,
    redirectUri: getRedirectUri(),
  });
}

export function getAuthUrl(state: string) {
  return getOAuthClient().generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: REQUIRED_SCOPES,
    state,
    include_granted_scopes: true,
  });
}

/** Returns an authorized OAuth2 client for the given calendar account, refreshing tokens if needed. */
export async function getAuthorizedClient(accountId: string) {
  const account = await prisma.calendarAccount.findUnique({ where: { id: accountId } });
  if (!account) throw new Error("Calendar account not found");
  if (!account.accessTokenEnc) throw new Error("No access token stored");

  const oauth2 = getOAuthClient();
  oauth2.setCredentials({
    access_token: decrypt(account.accessTokenEnc),
    refresh_token: account.refreshTokenEnc ? decrypt(account.refreshTokenEnc) : undefined,
    expiry_date: account.tokenExpiresAt?.getTime(),
  });

  oauth2.on("tokens", async (tokens) => {
    const update: Record<string, unknown> = {};
    if (tokens.access_token) update.accessTokenEnc = encrypt(tokens.access_token);
    if (tokens.refresh_token) update.refreshTokenEnc = encrypt(tokens.refresh_token);
    if (tokens.expiry_date) update.tokenExpiresAt = new Date(tokens.expiry_date);
    if (Object.keys(update).length > 0) {
      await prisma.calendarAccount.update({ where: { id: accountId }, data: update });
    }
  });

  return oauth2;
}

/** List all calendars on this account. */
export async function listCalendars(accountId: string) {
  const auth = await getAuthorizedClient(accountId);
  const cal = google.calendar({ version: "v3", auth });
  const res = await cal.calendarList.list({ maxResults: 250 });
  return res.data.items ?? [];
}

/** Initial sync (full) of one calendar — returns the new syncToken to store. */
export async function fullSyncCalendar(
  accountId: string,
  externalCalendarId: string,
  googleCalendarId: string,
) {
  const auth = await getAuthorizedClient(accountId);
  const cal = google.calendar({ version: "v3", auth });

  let pageToken: string | undefined;
  let syncToken: string | undefined;
  let processed = 0;
  do {
    const res = await cal.events.list({
      calendarId: googleCalendarId,
      singleEvents: true,
      showDeleted: true,
      maxResults: 250,
      pageToken,
    });
    const items = res.data.items ?? [];
    for (const ev of items) {
      if (!ev.id) continue;
      if (ev.status === "cancelled") {
        await prisma.externalEvent.deleteMany({
          where: { externalCalendarId, externalId: ev.id },
        });
        continue;
      }
      const start = ev.start?.dateTime ?? ev.start?.date;
      const end = ev.end?.dateTime ?? ev.end?.date;
      if (!start || !end) continue;
      const allDay = Boolean(ev.start?.date);
      await prisma.externalEvent.upsert({
        where: { externalCalendarId_externalId: { externalCalendarId, externalId: ev.id } },
        update: {
          summary: ev.summary ?? null,
          description: ev.description ?? null,
          location: ev.location ?? null,
          start: new Date(start),
          end: new Date(end),
          allDay,
          recurrence: ev.recurrence ? JSON.stringify(ev.recurrence) : null,
          status: ev.status ?? "confirmed",
          etag: ev.etag ?? null,
          htmlLink: ev.htmlLink ?? null,
          iCalUid: ev.iCalUID ?? null,
          callyAppointmentId:
            (ev.extendedProperties?.private?.callyAppointmentId as string | undefined) ?? null,
        },
        create: {
          externalCalendarId,
          externalId: ev.id,
          summary: ev.summary ?? null,
          description: ev.description ?? null,
          location: ev.location ?? null,
          start: new Date(start),
          end: new Date(end),
          allDay,
          recurrence: ev.recurrence ? JSON.stringify(ev.recurrence) : null,
          status: ev.status ?? "confirmed",
          etag: ev.etag ?? null,
          htmlLink: ev.htmlLink ?? null,
          iCalUid: ev.iCalUID ?? null,
          callyAppointmentId:
            (ev.extendedProperties?.private?.callyAppointmentId as string | undefined) ?? null,
        },
      });
      processed++;
    }
    pageToken = res.data.nextPageToken ?? undefined;
    if (!pageToken && res.data.nextSyncToken) syncToken = res.data.nextSyncToken;
  } while (pageToken);

  if (syncToken) {
    await prisma.externalCalendar.update({
      where: { id: externalCalendarId },
      data: { syncToken },
    });
  }
  return processed;
}

export async function disconnectAccount(accountId: string) {
  const account = await prisma.calendarAccount.findUnique({ where: { id: accountId } });
  if (!account?.accessTokenEnc) return;
  try {
    const auth = await getAuthorizedClient(accountId);
    await auth.revokeCredentials();
  } catch {
    /* ignore */
  }
  await prisma.calendarAccount.update({
    where: { id: accountId },
    data: {
      accessTokenEnc: null,
      refreshTokenEnc: null,
      tokenExpiresAt: null,
      syncStatus: "disconnected",
    },
  });
}

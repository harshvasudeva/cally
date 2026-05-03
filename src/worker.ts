// Cally background worker — runs as its own process under supervisor.
// Subscribes to BullMQ queues and executes calendar sync + reminder jobs.

import "dotenv/config";
import { google } from "googleapis";
import {
  getCalendarSyncQueue,
  getRemindersQueue,
  Worker,
  makeRedis,
  type CalendarSyncJobData,
  type ReminderJobData,
  QUEUE_NAMES,
} from "./lib/queue";
import prisma from "./lib/prisma";
import { getAuthorizedClient, fullSyncCalendar } from "./lib/calendar/google";

console.log("[worker] starting up");

// Touch queues so the connection is initialised early
void getCalendarSyncQueue();
void getRemindersQueue();

// ----- calendar-sync worker -----
const calendarWorker = new Worker<CalendarSyncJobData>(
  QUEUE_NAMES.calendarSync,
  async (job) => {
    const { data } = job;
    console.log("[worker] calendar-sync", data.type, "id=", job.id);

    switch (data.type) {
      case "full-sync": {
        const account = await prisma.calendarAccount.findUnique({
          where: { id: data.accountId },
          include: { calendars: true },
        });
        if (!account) return;
        await prisma.calendarAccount.update({
          where: { id: account.id },
          data: { syncStatus: "syncing" },
        });
        try {
          for (const cal of account.calendars) {
            if (!cal.selected) continue;
            await fullSyncCalendar(account.id, cal.id, cal.externalId);
          }
          await prisma.calendarAccount.update({
            where: { id: account.id },
            data: { syncStatus: "idle", lastSyncAt: new Date(), syncError: null },
          });
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          await prisma.calendarAccount.update({
            where: { id: account.id },
            data: { syncStatus: "error", syncError: msg },
          });
          throw err;
        }
        return;
      }

      case "delta-sync": {
        const account = await prisma.calendarAccount.findUnique({
          where: { id: data.accountId },
          include: { calendars: { where: { selected: true } } },
        });
        if (!account) return;
        const auth = await getAuthorizedClient(account.id);
        const cal = google.calendar({ version: "v3", auth });
        for (const c of account.calendars) {
          if (!c.syncToken) {
            await fullSyncCalendar(account.id, c.id, c.externalId);
            continue;
          }
          try {
            let pageToken: string | undefined;
            let nextSyncToken: string | undefined = c.syncToken;
            do {
              const res = await cal.events.list({
                calendarId: c.externalId,
                syncToken: pageToken ? undefined : c.syncToken,
                pageToken,
                showDeleted: true,
              });
              for (const ev of res.data.items ?? []) {
                if (!ev.id) continue;
                if (ev.status === "cancelled") {
                  await prisma.externalEvent.deleteMany({
                    where: { externalCalendarId: c.id, externalId: ev.id },
                  });
                  continue;
                }
                const start = ev.start?.dateTime ?? ev.start?.date;
                const end = ev.end?.dateTime ?? ev.end?.date;
                if (!start || !end) continue;
                await prisma.externalEvent.upsert({
                  where: { externalCalendarId_externalId: { externalCalendarId: c.id, externalId: ev.id } },
                  update: {
                    summary: ev.summary ?? null,
                    start: new Date(start),
                    end: new Date(end),
                    allDay: Boolean(ev.start?.date),
                    status: ev.status ?? "confirmed",
                    etag: ev.etag ?? null,
                    callyAppointmentId:
                      (ev.extendedProperties?.private?.callyAppointmentId as string | undefined) ?? null,
                  },
                  create: {
                    externalCalendarId: c.id,
                    externalId: ev.id,
                    summary: ev.summary ?? null,
                    start: new Date(start),
                    end: new Date(end),
                    allDay: Boolean(ev.start?.date),
                    status: ev.status ?? "confirmed",
                    etag: ev.etag ?? null,
                    callyAppointmentId:
                      (ev.extendedProperties?.private?.callyAppointmentId as string | undefined) ?? null,
                  },
                });
              }
              pageToken = res.data.nextPageToken ?? undefined;
              if (!pageToken && res.data.nextSyncToken) nextSyncToken = res.data.nextSyncToken;
            } while (pageToken);
            await prisma.externalCalendar.update({ where: { id: c.id }, data: { syncToken: nextSyncToken ?? null } });
          } catch (err) {
            const e = err as { code?: number };
            if (e.code === 410) {
              // sync token expired — fall back to full sync
              await prisma.externalCalendar.update({ where: { id: c.id }, data: { syncToken: null } });
              await fullSyncCalendar(account.id, c.id, c.externalId);
            } else {
              throw err;
            }
          }
        }
        await prisma.calendarAccount.update({
          where: { id: account.id },
          data: { lastSyncAt: new Date() },
        });
        return;
      }

      case "push-event": {
        const appt = await prisma.appointment.findUnique({
          where: { id: data.appointmentId },
          include: { user: true, appointmentType: true },
        });
        if (!appt) return;
        const account = await prisma.calendarAccount.findFirst({
          where: { userId: appt.userId, provider: "google" },
          include: { calendars: { where: { isPrimary: true } } },
        });
        if (!account || !account.calendars[0]) return;
        const auth = await getAuthorizedClient(account.id);
        const cal = google.calendar({ version: "v3", auth });
        const calendarId = account.calendars[0].externalId;

        // Find pre-existing external event linked to this appointment (if any)
        const existing = await prisma.externalEvent.findFirst({
          where: { callyAppointmentId: appt.id, externalCalendarId: account.calendars[0].id },
        });

        if (data.action === "cancel") {
          if (existing) {
            try {
              await cal.events.delete({ calendarId, eventId: existing.externalId });
            } catch {
              /* ignore */
            }
            await prisma.externalEvent.delete({ where: { id: existing.id } });
          }
          return;
        }

        const body = {
          summary: appt.title,
          description: appt.guestNotes ?? undefined,
          start: { dateTime: appt.start.toISOString() },
          end: { dateTime: appt.end.toISOString() },
          attendees: appt.guestEmail ? [{ email: appt.guestEmail, displayName: appt.guestName }] : undefined,
          extendedProperties: { private: { callyAppointmentId: appt.id } },
          conferenceData:
            appt.meetingProvider === "meet"
              ? { createRequest: { requestId: appt.id, conferenceSolutionKey: { type: "hangoutsMeet" } } }
              : undefined,
        };

        if (existing && data.action === "update") {
          await cal.events.update({ calendarId, eventId: existing.externalId, requestBody: body, conferenceDataVersion: 1 });
        } else {
          const res = await cal.events.insert({ calendarId, requestBody: body, conferenceDataVersion: 1 });
          if (res.data.id && res.data.start && res.data.end) {
            await prisma.externalEvent.create({
              data: {
                externalCalendarId: account.calendars[0].id,
                externalId: res.data.id,
                summary: res.data.summary ?? appt.title,
                start: new Date((res.data.start.dateTime ?? res.data.start.date) as string),
                end: new Date((res.data.end.dateTime ?? res.data.end.date) as string),
                callyAppointmentId: appt.id,
                etag: res.data.etag ?? null,
                htmlLink: res.data.htmlLink ?? null,
              },
            });
            if (res.data.hangoutLink) {
              await prisma.appointment.update({
                where: { id: appt.id },
                data: { meetingLink: res.data.hangoutLink },
              });
            }
          }
        }
        return;
      }

      case "renew-channel":
        // Phase 1: extend Google watch channel before expiry. Stub for now.
        return;
    }
  },
  { connection: makeRedis(), concurrency: 5 },
);

calendarWorker.on("failed", (job, err) => {
  console.error("[worker] calendar-sync failed", job?.id, err.message);
});

// ----- reminders worker -----
const remindersWorker = new Worker<ReminderJobData>(
  QUEUE_NAMES.reminders,
  async (job) => {
    console.log("[worker] reminder", job.id, job.data);
    // Phase 1: actually send the reminder email. Stub for now to keep
    // the queue alive and visible.
  },
  { connection: makeRedis(), concurrency: 10 },
);

remindersWorker.on("failed", (job, err) => {
  console.error("[worker] reminder failed", job?.id, err.message);
});

console.log("[worker] ready");

async function shutdown(signal: NodeJS.Signals) {
  console.log(`[worker] received ${signal}, draining…`);
  await Promise.all([calendarWorker.close(), remindersWorker.close()]);
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

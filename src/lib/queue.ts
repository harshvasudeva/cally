// Centralised BullMQ queue definitions + connection.
// Imported by both the producer side (route handlers) and the worker process.
import { Queue, Worker, Job, type ConnectionOptions } from "bullmq";
import IORedis from "ioredis";

const url = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";

// BullMQ requires `maxRetriesPerRequest: null` for blocking commands.
function makeRedis() {
  return new IORedis(url, { maxRetriesPerRequest: null });
}

const connection: ConnectionOptions = makeRedis();

export const QUEUE_NAMES = {
  calendarSync: "calendar-sync",
  reminders: "reminders",
} as const;

export type CalendarSyncJobData =
  | { type: "full-sync"; accountId: string }
  | { type: "delta-sync"; accountId: string }
  | { type: "push-event"; appointmentId: string; action: "create" | "update" | "cancel" }
  | { type: "renew-channel"; accountId: string };

export type ReminderJobData = {
  appointmentId: string;
  kind: "24h" | "1h";
};

// Lazy queue accessors — created once per process.
let _calendarSyncQueue: Queue<CalendarSyncJobData> | null = null;
export function getCalendarSyncQueue(): Queue<CalendarSyncJobData> {
  if (!_calendarSyncQueue) {
    _calendarSyncQueue = new Queue<CalendarSyncJobData>(QUEUE_NAMES.calendarSync, {
      connection,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: "exponential", delay: 5_000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 1000 },
      },
    });
  }
  return _calendarSyncQueue;
}

let _remindersQueue: Queue<ReminderJobData> | null = null;
export function getRemindersQueue(): Queue<ReminderJobData> {
  if (!_remindersQueue) {
    _remindersQueue = new Queue<ReminderJobData>(QUEUE_NAMES.reminders, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 60_000 },
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 500 },
      },
    });
  }
  return _remindersQueue;
}

export { connection, makeRedis, Worker, type Job };

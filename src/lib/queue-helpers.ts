// Helper to enqueue calendar push jobs from any route handler.
import { getCalendarSyncQueue } from "./queue";

export async function enqueueAppointmentPush(
  appointmentId: string,
  action: "create" | "update" | "cancel",
) {
  try {
    await getCalendarSyncQueue().add(
      `push-${action}`,
      { type: "push-event", appointmentId, action },
      { jobId: `push-${appointmentId}-${action}-${Date.now()}` },
    );
  } catch (e) {
    // Don't fail the user-facing request if Redis is briefly down.
    console.warn("[queue] failed to enqueue push", e);
  }
}

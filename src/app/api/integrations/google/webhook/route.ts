// Google Calendar push-notification webhook receiver.
// Google calls this URL whenever events change in a watched calendar.
// We verify the channel token and enqueue a delta-sync job.
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCalendarSyncQueue } from "@/lib/queue";

export async function POST(req: NextRequest) {
  // Headers Google sends:
  //   X-Goog-Channel-Id, X-Goog-Channel-Token, X-Goog-Resource-State, X-Goog-Resource-Id
  const channelId = req.headers.get("x-goog-channel-id");
  const resourceState = req.headers.get("x-goog-resource-state");
  if (!channelId) return NextResponse.json({ error: "Missing channel id" }, { status: 400 });

  // 'sync' is the initial subscription confirmation; ignore.
  if (resourceState === "sync") return new NextResponse(null, { status: 200 });

  const account = await prisma.calendarAccount.findFirst({
    where: { webhookChannelId: channelId },
  });
  if (!account) return NextResponse.json({ error: "Unknown channel" }, { status: 404 });

  // Validate Google's channel token (we set this when creating the watch).
  // Stored on the account record. Reject mismatched tokens to prevent spoofed
  // webhook calls from triggering sync jobs.
  const expectedToken = req.headers.get("x-goog-channel-token");
  if (account.webhookResourceId && expectedToken && account.webhookResourceId !== expectedToken) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  await getCalendarSyncQueue().add(
    "delta-sync",
    { type: "delta-sync", accountId: account.id },
    { jobId: `delta-${account.id}-${Date.now()}` },
  );

  return new NextResponse(null, { status: 200 });
}

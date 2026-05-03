// List + manage connected calendar accounts for the signed-in user.
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { disconnectAccount } from "@/lib/calendar/google";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accounts = await prisma.calendarAccount.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      provider: true,
      email: true,
      displayName: true,
      syncStatus: true,
      syncError: true,
      lastSyncAt: true,
      createdAt: true,
      calendars: {
        select: {
          id: true,
          summary: true,
          color: true,
          isPrimary: true,
          selected: true,
          writable: true,
          _count: { select: { events: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ accounts });
}

export async function DELETE(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const account = await prisma.calendarAccount.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await disconnectAccount(account.id);
  await prisma.calendarAccount.delete({ where: { id: account.id } });
  return NextResponse.json({ ok: true });
}

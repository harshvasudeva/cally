
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import prisma from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
    const session = await getServerSession(authOptions)

    if (!session?.user || !(session.user as any).id) {
        return new NextResponse("Unauthorized", { status: 401 })
    }

    const userId = (session.user as any).id;

    // Fetch all future events/appointments
    const now = new Date();

    // Get all appointments (hosted)
    const appointments = await prisma.appointment.findMany({
        where: {
            userId: userId,
            start: { gte: now },
            status: "CONFIRMED"
        },
        orderBy: { start: 'asc' }
    });

    // Get all personal events
    const events = await prisma.event.findMany({
        where: {
            userId: userId,
            start: { gte: now }
        },
        orderBy: { start: 'asc' }
    });

    // Combine and sort
    const allItems = [
        ...appointments.map(a => ({ ...a, type: 'appointment' })),
        ...events.map(e => ({ ...e, type: 'event' }))
    ].sort((a, b) => a.start.getTime() - b.start.getTime());

    const conflicts = [];

    // Simple O(N) sweep to find overlaps
    for (let i = 0; i < allItems.length - 1; i++) {
        const current = allItems[i];
        const next = allItems[i + 1];

        // If next starts before current ends -> OVERLAP
        if (next.start < current.end) {
            conflicts.push({
                item1: current,
                item2: next
            });
        }
    }

    return NextResponse.json(conflicts);
}

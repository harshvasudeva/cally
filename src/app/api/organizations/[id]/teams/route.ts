import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

async function requireOrgAdmin(orgId: string, userId: string) {
  const member = await prisma.member.findUnique({
    where: { userId_organizationId: { userId, organizationId: orgId } },
  });
  if (!member || (member.role !== "owner" && member.role !== "admin")) return null;
  return member;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const member = await prisma.member.findUnique({
    where: { userId_organizationId: { userId: session.user.id, organizationId: id } },
  });
  if (!member) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const teams = await prisma.team.findMany({
    where: { organizationId: id },
    include: { members: true, _count: { select: { members: true, appointmentTypes: true } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ teams });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = await requireOrgAdmin(id, session.user.id);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json()) as { name?: string; description?: string; schedulingMode?: string; userIds?: string[] };
  if (!body.name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const mode = body.schedulingMode === "round_robin" ? "round_robin" : "collective";

  const team = await prisma.$transaction(async (tx) => {
    const created = await tx.team.create({
      data: {
        organizationId: id,
        name: body.name!,
        description: body.description ?? null,
        schedulingMode: mode,
      },
    });
    if (body.userIds && body.userIds.length > 0) {
      await tx.teamMember.createMany({
        data: body.userIds.map((uid, idx) => ({ teamId: created.id, userId: uid, priority: idx })),
        skipDuplicates: true,
      });
    }
    return created;
  });

  return NextResponse.json(team, { status: 201 });
}

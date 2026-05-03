import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import crypto from "node:crypto";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

async function requireOrgAdmin(orgId: string, userId: string) {
  const member = await prisma.member.findUnique({
    where: { userId_organizationId: { userId, organizationId: orgId } },
  });
  if (!member) return null;
  if (member.role !== "owner" && member.role !== "admin") return null;
  return member;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Anyone in the org can list invitations
  const member = await prisma.member.findUnique({
    where: { userId_organizationId: { userId: session.user.id, organizationId: id } },
  });
  if (!member) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const invitations = await prisma.invitation.findMany({
    where: { organizationId: id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ invitations });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = await requireOrgAdmin(id, session.user.id);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await req.json()) as { email?: string; role?: string };
  if (!body.email) return NextResponse.json({ error: "email required" }, { status: 400 });

  const role = body.role === "admin" ? "admin" : "member";

  const inv = await prisma.invitation.create({
    data: {
      email: body.email.trim().toLowerCase(),
      organizationId: id,
      role,
      status: "pending",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      invitedById: session.user.id,
    },
  });

  // The accept link the user clicks (token = invitation id + hmac)
  const token = `${inv.id}.${crypto
    .createHmac("sha256", process.env.BETTER_AUTH_SECRET ?? "dev")
    .update(inv.id)
    .digest("hex")
    .slice(0, 24)}`;

  const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/invitations/${token}`;

  return NextResponse.json({ invitation: inv, acceptUrl }, { status: 201 });
}

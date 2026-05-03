// Organization CRUD — wraps better-auth's organization plugin where convenient
// and adds Cally-specific aggregations (member count, team count).
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgs = await prisma.organization.findMany({
    where: { members: { some: { userId: session.user.id } } },
    select: {
      id: true,
      name: true,
      slug: true,
      logo: true,
      plan: true,
      ownerId: true,
      createdAt: true,
      _count: { select: { members: true, teams: true } },
      members: {
        where: { userId: session.user.id },
        select: { role: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    organizations: orgs.map((o) => ({
      id: o.id,
      name: o.name,
      slug: o.slug,
      logo: o.logo,
      plan: o.plan,
      isOwner: o.ownerId === session.user.id,
      role: o.members[0]?.role ?? "member",
      memberCount: o._count.members,
      teamCount: o._count.teams,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as { name?: string; slug?: string };
  if (!body.name || body.name.length < 2) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  const slug = (body.slug ?? body.name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 40) || `org-${Date.now()}`;

  // Ensure slug uniqueness — retry on P2002 race instead of pre-checking,
  // since two concurrent requests could both pass a findUnique before either writes.
  let finalSlug = slug;
  let attempt = 0;
  // We try up to 5 distinct slugs; the unique index on Organization.slug is
  // the source of truth.
  while (true) {
    try {
      const org = await prisma.$transaction(async (tx) => {
        const created = await tx.organization.create({
          data: {
            name: body.name!,
            slug: finalSlug,
            ownerId: session.user.id,
            plan: "free",
          },
        });
        await tx.member.create({
          data: { userId: session.user.id, organizationId: created.id, role: "owner" },
        });
        return created;
      });
      return NextResponse.json({ organization: org }, { status: 201 });
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code === "P2002" && attempt < 5) {
        attempt++;
        finalSlug = `${slug}-${attempt}`;
        continue;
      }
      throw err;
    }
  }
}

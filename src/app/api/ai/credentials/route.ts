import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { encrypt, maskKey } from "@/lib/crypto";
import { PROVIDERS, testCredential, type ProviderId } from "@/lib/ai/providers";

async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  return session.user as { id: string };
}

// GET — list configured providers + the registry catalog
export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const credentials = await prisma.userAICredential.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      providerId: true,
      defaultModel: true,
      label: true,
      baseUrl: true,
      isActive: true,
      lastTestedAt: true,
      lastTestedOk: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    providers: PROVIDERS,
    credentials: credentials.map((c) => ({ ...c, keyPreview: "••••••" })),
  });
}

// POST — add or update a credential
export async function POST(req: NextRequest) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    providerId?: string;
    apiKey?: string;
    defaultModel?: string;
    baseUrl?: string;
    label?: string;
    test?: boolean;
  };

  const providerId = body.providerId as ProviderId;
  if (!providerId || !PROVIDERS[providerId]) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  }
  if (!body.apiKey || body.apiKey.length < 8) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 400 });
  }
  if (!body.defaultModel) {
    return NextResponse.json({ error: "defaultModel is required" }, { status: 400 });
  }
  const provider = PROVIDERS[providerId];
  if (provider.requiresBaseUrl && !body.baseUrl) {
    return NextResponse.json({ error: `${provider.name} requires baseUrl` }, { status: 400 });
  }

  const apiKeyEnc = encrypt(body.apiKey);
  const label = body.label ?? "default";

  // Optionally test the credential before persisting
  let testedOk: boolean | null = null;
  if (body.test !== false) {
    const result = await testCredential({
      providerId,
      apiKeyEnc,
      baseUrl: body.baseUrl ?? null,
      defaultModel: body.defaultModel,
    });
    testedOk = result.ok;
    if (!result.ok) {
      return NextResponse.json({ error: `Provider rejected the key: ${result.error}` }, { status: 400 });
    }
  }

  const cred = await prisma.userAICredential.upsert({
    where: { userId_providerId_label: { userId: user.id, providerId, label } },
    update: {
      apiKeyEnc,
      defaultModel: body.defaultModel,
      baseUrl: body.baseUrl ?? null,
      lastTestedAt: testedOk !== null ? new Date() : undefined,
      lastTestedOk: testedOk,
      isActive: true,
    },
    create: {
      userId: user.id,
      providerId,
      apiKeyEnc,
      defaultModel: body.defaultModel,
      baseUrl: body.baseUrl ?? null,
      label,
      lastTestedAt: testedOk !== null ? new Date() : null,
      lastTestedOk: testedOk,
      isActive: true,
    },
  });

  return NextResponse.json({
    id: cred.id,
    providerId: cred.providerId,
    defaultModel: cred.defaultModel,
    label: cred.label,
    baseUrl: cred.baseUrl,
    keyPreview: maskKey(body.apiKey),
    lastTestedOk: cred.lastTestedOk,
  });
}

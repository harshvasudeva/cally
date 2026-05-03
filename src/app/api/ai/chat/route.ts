import { NextRequest } from "next/server";
import { headers } from "next/headers";
import { streamText, convertToModelMessages, type UIMessage } from "ai";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { buildModel } from "@/lib/ai/providers";

const SYSTEM_PROMPT = `You are Cally's intelligent scheduling assistant.
You help the user manage their calendar, find free slots, draft replies, and coordinate meetings.
When asked about times, always confirm the user's timezone first.
Be concise and propose options as numbered lists when appropriate.`;

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const body = (await req.json()) as {
    messages: UIMessage[];
    credentialId?: string;
    model?: string;
  };

  const cred = body.credentialId
    ? await prisma.userAICredential.findFirst({
        where: { id: body.credentialId, userId: session.user.id, isActive: true },
      })
    : await prisma.userAICredential.findFirst({
        where: { userId: session.user.id, isActive: true },
        orderBy: { createdAt: "desc" },
      });

  if (!cred) {
    return new Response(
      JSON.stringify({
        error:
          "No AI provider configured. Please add an API key in Settings → AI.",
      }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }

  const model = buildModel(
    {
      providerId: cred.providerId,
      apiKeyEnc: cred.apiKeyEnc,
      baseUrl: cred.baseUrl,
      defaultModel: cred.defaultModel,
    },
    body.model,
  );

  const modelMessages = convertToModelMessages(body.messages);

  const result = streamText({
    model,
    system: SYSTEM_PROMPT,
    messages: modelMessages,
    temperature: 0.4,
  });

  // Note: usage tracking + persistence to AIMessage is a Phase 1 enhancement.
  return result.toUIMessageStreamResponse();
}

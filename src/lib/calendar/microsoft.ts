// Microsoft Graph (Outlook / Microsoft 365) calendar connector.
// Phase-1 stub: implements the OAuth start URL + token exchange shape but the
// full sync + delta tokens + change-notification subscription are TODO.
//
// Required env: MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_TENANT_ID (or "common")
import { encrypt } from "@/lib/crypto";
import prisma from "@/lib/prisma";

const SCOPES = [
  "openid",
  "email",
  "profile",
  "offline_access",
  "Calendars.ReadWrite",
  "User.Read",
];

function getRedirectUri() {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  return `${base}/api/integrations/microsoft/callback`;
}

export function isMicrosoftConfigured(): boolean {
  return Boolean(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET);
}

export function getAuthUrl(state: string): string {
  const tenant = process.env.MICROSOFT_TENANT_ID ?? "common";
  const params = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID ?? "",
    response_type: "code",
    redirect_uri: getRedirectUri(),
    response_mode: "query",
    scope: SCOPES.join(" "),
    state,
  });
  return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${params.toString()}`;
}

export async function exchangeCode(code: string) {
  const tenant = process.env.MICROSOFT_TENANT_ID ?? "common";
  const body = new URLSearchParams({
    client_id: process.env.MICROSOFT_CLIENT_ID ?? "",
    client_secret: process.env.MICROSOFT_CLIENT_SECRET ?? "",
    code,
    redirect_uri: getRedirectUri(),
    grant_type: "authorization_code",
    scope: SCOPES.join(" "),
  });
  const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`Microsoft token exchange failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    id_token: string;
    scope: string;
    token_type: string;
  };
}

export async function persistAccount(
  userId: string,
  tokens: Awaited<ReturnType<typeof exchangeCode>>,
  userInfo: { id: string; email: string; displayName?: string | null },
) {
  return prisma.calendarAccount.upsert({
    where: {
      userId_provider_externalAccountId: {
        userId,
        provider: "microsoft",
        externalAccountId: userInfo.id,
      },
    },
    update: {
      accessTokenEnc: encrypt(tokens.access_token),
      refreshTokenEnc: encrypt(tokens.refresh_token),
      tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      email: userInfo.email,
      displayName: userInfo.displayName ?? null,
      syncStatus: "idle",
      syncError: null,
    },
    create: {
      userId,
      provider: "microsoft",
      externalAccountId: userInfo.id,
      email: userInfo.email,
      displayName: userInfo.displayName ?? null,
      accessTokenEnc: encrypt(tokens.access_token),
      refreshTokenEnc: encrypt(tokens.refresh_token),
      tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      syncStatus: "idle",
    },
  });
}

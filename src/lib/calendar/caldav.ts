// Generic CalDAV connector (works for Apple iCloud + most CalDAV servers).
// Phase-1 stub: stores credentials + URL; real sync implementation pending.
//
// The CalDAV pattern: user provides server URL + username + app-specific
// password. We store credentials encrypted, then poll the server every N
// minutes (no push, unlike Google).
import { encrypt } from "@/lib/crypto";
import prisma from "@/lib/prisma";

export interface CalDAVConfig {
  serverUrl: string;
  username: string;
  password: string;
  provider?: "apple_caldav" | "generic_caldav";
}

export async function connectCalDAVAccount(userId: string, cfg: CalDAVConfig) {
  // Concatenate username:password as the "access token" for storage.
  // On use, decrypt and split.
  const encoded = `${cfg.username}\u0000${cfg.password}`;

  return prisma.calendarAccount.upsert({
    where: {
      userId_provider_externalAccountId: {
        userId,
        provider: cfg.provider ?? "generic_caldav",
        externalAccountId: cfg.serverUrl,
      },
    },
    update: {
      accessTokenEnc: encrypt(encoded),
      email: cfg.username,
      syncStatus: "idle",
    },
    create: {
      userId,
      provider: cfg.provider ?? "generic_caldav",
      externalAccountId: cfg.serverUrl,
      email: cfg.username,
      accessTokenEnc: encrypt(encoded),
      syncStatus: "idle",
    },
  });
}

// TODO Phase 1: implement actual CalDAV REPORT requests using `tsdav` package
// and a polling job in BullMQ. For now, the row exists so the UI can list it.

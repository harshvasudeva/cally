-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DateOverride" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL,
    "isBlocked" BOOLEAN NOT NULL DEFAULT true,
    "startTime" TEXT,
    "endTime" TEXT,
    "reason" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DateOverride_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CalendarStream" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "category" TEXT NOT NULL DEFAULT 'other',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" DATETIME,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CalendarStream_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "entityId" TEXT,
    "details" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "permissions" TEXT NOT NULL DEFAULT 'read',
    "lastUsedAt" DATETIME,
    "expiresAt" DATETIME,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Appointment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "start" DATETIME NOT NULL,
    "end" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "guestEmail" TEXT NOT NULL,
    "guestName" TEXT NOT NULL,
    "guestPhone" TEXT,
    "guestNotes" TEXT,
    "formData" TEXT,
    "meetingLink" TEXT,
    "negotiationNote" TEXT,
    "originalTime" DATETIME,
    "userId" TEXT NOT NULL,
    "guestUserId" TEXT,
    "appointmentTypeId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Appointment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Appointment_guestUserId_fkey" FOREIGN KEY ("guestUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Appointment_appointmentTypeId_fkey" FOREIGN KEY ("appointmentTypeId") REFERENCES "AppointmentType" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Appointment" ("appointmentTypeId", "createdAt", "end", "formData", "guestEmail", "guestName", "guestNotes", "guestPhone", "id", "meetingLink", "negotiationNote", "originalTime", "start", "status", "title", "updatedAt", "userId") SELECT "appointmentTypeId", "createdAt", "end", "formData", "guestEmail", "guestName", "guestNotes", "guestPhone", "id", "meetingLink", "negotiationNote", "originalTime", "start", "status", "title", "updatedAt", "userId" FROM "Appointment";
DROP TABLE "Appointment";
ALTER TABLE "new_Appointment" RENAME TO "Appointment";
CREATE INDEX "Appointment_userId_idx" ON "Appointment"("userId");
CREATE INDEX "Appointment_guestEmail_idx" ON "Appointment"("guestEmail");
CREATE INDEX "Appointment_status_idx" ON "Appointment"("status");
CREATE INDEX "Appointment_start_end_idx" ON "Appointment"("start", "end");
CREATE TABLE "new_AppointmentType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "bufferBefore" INTEGER NOT NULL DEFAULT 0,
    "bufferAfter" INTEGER NOT NULL DEFAULT 0,
    "color" TEXT NOT NULL DEFAULT '#8b5cf6',
    "description" TEXT,
    "location" TEXT,
    "formFields" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "minNotice" INTEGER NOT NULL DEFAULT 0,
    "maxPerDay" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AppointmentType_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_AppointmentType" ("bufferAfter", "bufferBefore", "color", "createdAt", "description", "duration", "formFields", "id", "isActive", "location", "name", "slug", "updatedAt", "userId") SELECT "bufferAfter", "bufferBefore", "color", "createdAt", "description", "duration", "formFields", "id", "isActive", "location", "name", "slug", "updatedAt", "userId" FROM "AppointmentType";
DROP TABLE "AppointmentType";
ALTER TABLE "new_AppointmentType" RENAME TO "AppointmentType";
CREATE INDEX "AppointmentType_userId_idx" ON "AppointmentType"("userId");
CREATE UNIQUE INDEX "AppointmentType_userId_slug_key" ON "AppointmentType"("userId", "slug");
CREATE TABLE "new_Settings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "siteName" TEXT NOT NULL DEFAULT 'Cally',
    "siteDescription" TEXT NOT NULL DEFAULT 'Self-hosted calendar and scheduling',
    "primaryColor" TEXT NOT NULL DEFAULT '#3b82f6',
    "logoUrl" TEXT,
    "fqdn" TEXT,
    "sslCertPath" TEXT,
    "sslKeyPath" TEXT,
    "sslMode" TEXT NOT NULL DEFAULT 'auto',
    "emailFrom" TEXT,
    "smtpHost" TEXT,
    "smtpPort" INTEGER,
    "smtpUser" TEXT,
    "smtpPass" TEXT,
    "discordBotToken" TEXT,
    "discordClientId" TEXT,
    "webhookUrl" TEXT,
    "webhookSecret" TEXT,
    "webhookEvents" TEXT,
    "allowRegistration" BOOLEAN NOT NULL DEFAULT true,
    "maxLoginAttempts" INTEGER NOT NULL DEFAULT 5,
    "lockoutDuration" INTEGER NOT NULL DEFAULT 15,
    "requireEmailVerification" BOOLEAN NOT NULL DEFAULT false,
    "ipWhitelist" TEXT,
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Settings" ("allowRegistration", "createdAt", "discordBotToken", "discordClientId", "emailFrom", "id", "primaryColor", "siteDescription", "siteName", "smtpHost", "smtpPass", "smtpPort", "smtpUser", "updatedAt") SELECT "allowRegistration", "createdAt", "discordBotToken", "discordClientId", "emailFrom", "id", "primaryColor", "siteDescription", "siteName", "smtpHost", "smtpPass", "smtpPort", "smtpUser", "updatedAt" FROM "Settings";
DROP TABLE "Settings";
ALTER TABLE "new_Settings" RENAME TO "Settings";
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT,
    "emailVerified" DATETIME,
    "password" TEXT,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "slug" TEXT,
    "avatarUrl" TEXT,
    "image" TEXT,
    "discordId" TEXT,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" DATETIME,
    "theme" TEXT NOT NULL DEFAULT 'dark',
    "country" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "icalToken" TEXT,
    "notificationPrefs" TEXT
);
INSERT INTO "new_User" ("avatarUrl", "createdAt", "email", "id", "name", "password", "role", "slug", "timezone", "updatedAt") SELECT "avatarUrl", "createdAt", "email", "id", "name", "password", "role", "slug", "timezone", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_slug_key" ON "User"("slug");
CREATE UNIQUE INDEX "User_discordId_key" ON "User"("discordId");
CREATE UNIQUE INDEX "User_icalToken_key" ON "User"("icalToken");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "DateOverride_userId_idx" ON "DateOverride"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DateOverride_userId_date_key" ON "DateOverride"("userId", "date");

-- CreateIndex
CREATE INDEX "CalendarStream_userId_idx" ON "CalendarStream"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarStream_userId_url_key" ON "CalendarStream"("userId", "url");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE INDEX "VerificationToken_token_idx" ON "VerificationToken"("token");

-- CreateIndex
CREATE INDEX "VerificationToken_email_idx" ON "VerificationToken"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_keyHash_idx" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_userId_idx" ON "ApiKey"("userId");

-- CreateIndex
CREATE INDEX "Availability_userId_idx" ON "Availability"("userId");

-- CreateIndex
CREATE INDEX "Event_userId_idx" ON "Event"("userId");

-- CreateIndex
CREATE INDEX "Event_start_end_idx" ON "Event"("start", "end");

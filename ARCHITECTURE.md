# Cally — Production Architecture (v2.0)

> **Vision**: An all-in-one, self-hostable, multi-tenant scheduling platform that solves the problems Google Calendar / Cal.com / Calendly leave on the table. Web + native mobile, BYO-AI, real two-way calendar sync, team scheduling, payments, and meeting intelligence — in **one** place.

---

## 1. Why this rewrite

| Problem with status quo                                  | Cally v2 answer                                                          |
| -------------------------------------------------------- | ------------------------------------------------------------------------ |
| Google Calendar has no booking layer                     | First-class booking pages + booking pages are real calendar events       |
| Cal.com / Calendly require external Stripe + Zoom + CRM  | Native Stripe, Zoom/Meet/Teams, lightweight CRM in one DB                |
| AI scheduling locked to one vendor's flavour             | **BYO-AI**: each user picks provider + key (OpenAI/Claude/Gemini/Groq/Ollama) |
| Multi-calendar conflicts must be eyeballed manually      | Real two-way sync with conflict resolver + AI rescheduler                |
| NextAuth v4 is in maintenance, no passkeys/2FA out-of-box| **better-auth** with TOTP, WebAuthn passkeys, organization plugin        |
| SQLite cannot serve a SaaS                               | **PostgreSQL** with row-level multi-tenancy, BullMQ workers              |
| No mobile app                                            | **Expo (React Native)** sharing the same auth + API                      |

---

## 2. Tech Stack (locked)

| Layer            | Choice                                                                |
| ---------------- | --------------------------------------------------------------------- |
| **Web app**      | Next.js 16 App Router, React 19, TypeScript, Tailwind v4              |
| **Mobile app**   | Expo SDK 52+, React Native, expo-router, expo-secure-store            |
| **Auth**         | **better-auth** v1.x (org + 2FA + passkey + OAuth plugins)            |
| **DB**           | **PostgreSQL 16** + Prisma 7 (cuid IDs preserved)                     |
| **Cache/Queue**  | **Redis 7** + BullMQ for sync, reminders, AI usage logging            |
| **AI layer**     | **Vercel AI SDK** (provider-agnostic) + **LangChain.js** for agents   |
| **Calendar**     | `googleapis`, `@microsoft/microsoft-graph-client`, `node-ical` (CalDAV) |
| **Video**        | Zoom REST, Google Meet (via Calendar conferenceData), Teams (Graph)   |
| **Payments**     | Stripe (Checkout + Connect for marketplace)                           |
| **Email**        | Existing nodemailer SMTP, with React Email templates                  |
| **Observability**| Pino (structured logs), OpenTelemetry-ready                           |
| **Testing**      | Vitest (unit), Playwright (e2e)                                       |

---

## 3. High-Level System Diagram

```
┌────────────────┐    ┌────────────────┐    ┌──────────────────┐
│  Next.js Web   │    │  Expo Mobile   │    │  Public Booking  │
│  (App Router)  │    │  (RN + Expo)   │    │     Pages        │
└───────┬────────┘    └───────┬────────┘    └────────┬─────────┘
        │                     │                      │
        └─────────────────────┴──────────────────────┘
                              │
                ┌─────────────▼──────────────┐
                │   Next.js Route Handlers   │
                │   /api/auth/* (better-auth)│
                │   /api/calendar/* (CRUD)   │
                │   /api/sync/* (workers)    │
                │   /api/ai/* (chat+agent)   │
                │   /api/booking/* (public)  │
                │   /api/stripe/webhook      │
                └─────┬──────────────────┬───┘
                      │                  │
            ┌─────────▼─────────┐    ┌───▼──────────┐
            │  PostgreSQL 16    │    │  Redis 7     │
            │  (Prisma)         │    │  + BullMQ    │
            └───────────────────┘    └──┬───────────┘
                                        │
                          ┌─────────────┼──────────────┐
                          │             │              │
                  ┌───────▼──────┐ ┌────▼──────┐ ┌────▼─────┐
                  │ Google Cal   │ │ Outlook   │ │ Reminder │
                  │  sync worker │ │ sync work │ │ worker   │
                  └──────────────┘ └───────────┘ └──────────┘
                          │             │              │
                          ▼             ▼              ▼
                  ┌────────────────────────────────────────┐
                  │   External APIs                        │
                  │   Google Calendar / Microsoft Graph /  │
                  │   Apple iCloud (CalDAV) / Zoom / Teams │
                  │   / Stripe / OpenAI / Anthropic / etc. │
                  └────────────────────────────────────────┘
```

---

## 4. Domain Model (Prisma 7 / PostgreSQL)

Models marked **NEW** are added in v2. Models marked **EVOLVED** have schema changes.

### 4.1 Identity & Access (better-auth)

* `User` — **EVOLVED**. Fields preserved: `slug`, `timezone`, `theme`, `country`, `failedLoginAttempts`, `lockedUntil`, `notificationPrefs`, `icalToken`, `onboardingCompleted`. New: `twoFactorEnabled`.
* `Account` — better-auth shape (provider, accountId, accessToken, refreshToken, password hash for credentials provider).
* `Session` — token-based, server-revocable, with `ipAddress`, `userAgent`, `deviceName`, `expiresAt`.
* `Verification` — better-auth verification tokens (email verify, password reset).
* `TwoFactor` **NEW** — TOTP secret + backup codes (encrypted).
* `Passkey` **NEW** — WebAuthn credentials (credentialId, publicKey, signCount, transports, backedUp).

### 4.2 Multi-tenancy (org plugin)

* `Organization` **NEW** — `name`, `slug`, `logo`, `plan` (free/pro/business/enterprise), `metadata`.
* `Member` **NEW** — `userId`, `organizationId`, `role` (owner/admin/member), `joinedAt`.
* `Invitation` **NEW** — pending org invites by email, expiring.
* `Team` **NEW** — sub-group inside an org for round-robin / collective scheduling.
* `TeamMember` **NEW** — user ↔ team mapping, with `priority` for round-robin.

### 4.3 Calendar core (preserved + evolved)

* `Event` — internal calendar events (kept).
* `Availability` — weekly hours (kept).
* `DateOverride` — exceptions (kept).
* `AppointmentType` — kept; gains `priceCents`, `currency`, `requiresPayment`, `paymentType` (full|deposit), `teamId` (for round-robin/collective), `meetingProvider` (zoom|meet|teams|in_person|phone|custom).
* `Appointment` — kept; gains `paymentStatus`, `stripePaymentIntentId`, `meetingUrl`, `meetingProvider`, `aiSummary` (post-meeting), `aiTranscript`.
* `CalendarStream` — kept (external iCal feeds).

### 4.4 External calendar sync **NEW**

* `CalendarAccount` — `userId`, `provider` (google|microsoft|apple_caldav|generic_caldav), `externalId`, `email`, `accessToken` (AES-GCM), `refreshToken` (AES-GCM), `tokenExpiresAt`, `syncToken`, `webhookChannelId`, `webhookExpiresAt`, `lastSyncAt`, `syncStatus` (idle|syncing|error|disconnected).
* `ExternalCalendar` — each CalendarAccount has many calendars (`primary`, `team@example.com`, etc.). Fields: `calendarAccountId`, `externalId`, `summary`, `color`, `isPrimary`, `selected`, `writable`.
* `ExternalEvent` — mirrored events from external calendars. Used for **conflict detection** (we never edit them; we just block the slot). Fields: `externalCalendarId`, `externalId`, `iCalUid`, `summary`, `start`, `end`, `allDay`, `recurrence`, `etag`, `updated`.
* `SyncJob` **NEW** — BullMQ job audit: `accountId`, `type` (full|delta|push|webhook), `status`, `startedAt`, `finishedAt`, `error`, `eventsProcessed`.

### 4.5 AI layer **NEW**

* `AIProvider` — registry seed (id, name, kind, models[]). Static seed: openai, anthropic, google, groq, mistral, openrouter, ollama.
* `UserAICredential` — `userId`, `providerId`, `apiKeyEncrypted` (AES-GCM), `defaultModel`, `baseUrl?` (for Ollama/OpenRouter), `isActive`, `lastTestedAt`, `lastTestedOk`.
* `AIConversation` — per-user chat threads with the scheduling agent. `userId`, `title`, `pinned`, `createdAt`.
* `AIMessage` — `conversationId`, `role`, `content`, `toolCalls` (JSON), `toolResults` (JSON), `model`, `provider`, `inputTokens`, `outputTokens`, `latencyMs`.
* `AIUsageLog` — per-call usage + estimated cost (used for monthly summaries and cost alerts).

### 4.6 Payments **NEW**

* `StripeAccount` — `organizationId` ↔ Stripe Connect account (for marketplace payouts).
* `Payment` — `appointmentId`, `amountCents`, `currency`, `stripePaymentIntentId`, `status`, `refundedAt`.

### 4.7 Misc preserved

* `AuditLog`, `Settings`, `ApiKey` — preserved with minor field additions.

---

## 5. Authentication (better-auth)

### 5.1 Routes mounted

* `POST /api/auth/sign-up/email`
* `POST /api/auth/sign-in/email`
* `POST /api/auth/sign-out`
* `GET  /api/auth/get-session`
* `POST /api/auth/forget-password`
* `POST /api/auth/reset-password`
* `POST /api/auth/verify-email`
* `GET  /api/auth/sign-in/social/:provider` (Google, Microsoft, Apple, Discord)
* `POST /api/auth/two-factor/enable|verify|disable`
* `POST /api/auth/passkey/register|authenticate|list|delete`
* `POST /api/auth/organization/create|update|invite|accept|leave`

### 5.2 Session strategy

* Web: **httpOnly cookie** (`Secure`, `SameSite=Lax`, 7-day rolling).
* Mobile (Expo): **Bearer token** stored in `expo-secure-store`, sent as `Authorization: Bearer ...`.

### 5.3 Security hardening (preserved + enhanced)

* Account lockout (existing) — moved into a custom `signIn` hook in better-auth.
* Audit log on every auth action (existing) — wired via better-auth `events`.
* Rate limit (existing token bucket) — kept on `/api/auth/*` and `/api/booking/*`.
* Password policy (existing 12-char + complexity) — passed to better-auth `passwordValidation`.
* CSRF — better-auth ships a built-in CSRF mechanism for cookies.
* Encryption for OAuth tokens at rest — AES-256-GCM with `MASTER_ENCRYPTION_KEY` (32 bytes).
* Email verification toggle (existing setting `requireEmailVerification`) honored by sign-up flow.

### 5.4 Migration from NextAuth v4

1. Add Postgres datasource + run `prisma migrate dev` against fresh Postgres (no SQLite data carryover for v2 — fresh start; users will be invited to re-register or auto-migrated).
2. **Optional one-time migration script** (`scripts/migrate-from-nextauth.ts`) reads SQLite Prisma DB and inserts users/accounts into Postgres, bcrypt password hashes carried as-is (better-auth's bcrypt verifier accepts cost-12 hashes).
3. Replace `/api/auth/[...nextauth]/route.ts` with `/api/auth/[...all]/route.ts` (better-auth catch-all).
4. Replace `getServerSession(authOptions)` calls with `auth.api.getSession({ headers })`.
5. Replace `next-auth/jwt` `getToken` in `src/proxy.ts` with better-auth session check.
6. Update `useSession`/`signIn`/`signOut` client calls to `authClient` (`better-auth/react`).
7. Remove `next-auth`, `@next-auth/prisma-adapter`, `@auth/prisma-adapter` from `package.json`.

---

## 6. Calendar Sync Engine

### 6.1 Connect flow

1. User clicks "Connect Google Calendar" in `/settings/integrations`.
2. `GET /api/integrations/google/connect` → redirects to Google OAuth (`access_type=offline`, `prompt=consent`, scopes `calendar` + `calendar.events` + `userinfo.email`).
3. Callback `GET /api/integrations/google/callback?code=…` exchanges code, encrypts tokens, creates `CalendarAccount` row, lists calendars, creates `ExternalCalendar` rows (primary auto-selected), enqueues `full-sync` job.
4. Worker performs initial full sync → populates `ExternalEvent`. Stores `nextSyncToken`. Calls `events.watch()` to subscribe to push notifications. Stores `webhookChannelId`/`webhookExpiresAt`.
5. Schedule a daily channel-renewal job 1h before expiry.

### 6.2 Incremental sync

* On webhook ping (`POST /api/integrations/google/webhook`): verify `X-Goog-Channel-Token`, enqueue `delta-sync(accountId)`.
* Worker calls `events.list({ syncToken })`, upserts `ExternalEvent`s, handles `status=cancelled` deletions.
* On `410 Gone` for expired sync token → fall back to full sync.

### 6.3 Outbound sync

* When an `Appointment` is created/updated/cancelled, enqueue `push-event(appointmentId)`.
* Worker creates the matching event on the user's primary calendar with `extendedProperties.private.callyAppointmentId = <id>` so we can deduplicate webhook echoes.
* Inbound webhook handler ignores any event whose `extendedProperties.private.callyAppointmentId` matches a local appointment within the last 5 minutes (loop break).

### 6.4 Conflict detection

* When computing public booking availability, subtract intersection of:
    1. `Appointment` (status≠CANCELLED) starts/ends.
    2. `ExternalEvent` start/ends from `selected` calendars.
    3. `DateOverride` blocks.
    4. `holidays` table for user's country.

### 6.5 Microsoft Outlook / Apple iCloud (CalDAV)

* Same shape as Google: `CalendarAccount` + `ExternalCalendar` + `ExternalEvent`.
* Outlook uses Microsoft Graph (`/me/calendarView`, delta tokens, change notifications via webhooks).
* iCloud + generic CalDAV uses `tsdav` (DAV) library, polled every 5 minutes (no push).

### 6.6 Zoom / Meet / Teams

* `Meet`: free, attached automatically by Google Calendar when `conferenceData.createRequest` is set.
* `Zoom`: requires `ZOOM_CLIENT_ID/SECRET`; OAuth per user; on appointment creation, `POST /v2/users/me/meetings`, store `meetingUrl`.
* `Teams`: via Microsoft Graph `onlineMeetings` endpoint (requires the user's MS account).

---

## 7. AI Layer (BYO-key + Swappable)

### 7.1 Provider registry (seeded)

```ts
{
  openai:     { models: ["gpt-5.2", "gpt-5.1", "gpt-4.1", "gpt-4o-mini"], capabilities: ["chat","tools","vision","json"] },
  anthropic:  { models: ["claude-sonnet-4-6", "claude-opus-4-6", "claude-haiku-4-5"], capabilities: ["chat","tools","vision","json"] },
  google:     { models: ["gemini-3.1-pro", "gemini-3-flash", "gemini-2.5-pro"], capabilities: ["chat","tools","vision","json"] },
  groq:       { models: ["llama-3.3-70b-versatile", "mixtral-8x7b-32768"], capabilities: ["chat","tools"] },
  mistral:    { models: ["mistral-large-latest", "mistral-small-latest"], capabilities: ["chat","tools","json"] },
  openrouter: { models: ["*"], capabilities: ["chat","tools"], requiresBaseUrl: false },
  ollama:     { models: ["*"], capabilities: ["chat"], requiresBaseUrl: true }
}
```

### 7.2 Provider factory (`src/lib/ai/factory.ts`)

```ts
export function getModel(cred: UserAICredential, modelId: string) {
  const key = decrypt(cred.apiKeyEncrypted);
  switch (cred.providerId) {
    case "openai":     return createOpenAI({ apiKey: key })(modelId);
    case "anthropic":  return createAnthropic({ apiKey: key })(modelId);
    case "google":     return createGoogleGenerativeAI({ apiKey: key })(modelId);
    case "groq":       return createGroq({ apiKey: key })(modelId);
    case "mistral":    return createMistral({ apiKey: key })(modelId);
    case "openrouter": return createOpenAICompatible({ baseURL: "https://openrouter.ai/api/v1", apiKey: key })(modelId);
    case "ollama":     return createOpenAICompatible({ baseURL: cred.baseUrl!, apiKey: "ollama" })(modelId);
  }
}
```

### 7.3 Tools the agent has access to

| Tool                       | Purpose                                                          |
| -------------------------- | ---------------------------------------------------------------- |
| `getMyAvailability`        | Resolve weekly hours + overrides + external busy times           |
| `findFreeSlots`            | Given duration + window, return n candidate slots                |
| `bookAppointment`          | Create internal appointment + push to external calendar          |
| `rescheduleAppointment`    | Move with reason; resync                                         |
| `cancelAppointment`        | Soft-cancel + notify                                             |
| `summarizeMeeting`         | Post-meeting summary from transcript/notes                       |
| `draftFollowUp`            | Suggest/send follow-up email                                     |
| `naturalLanguageBooking`   | Parse "next Tuesday afternoon for 30 min" → structured slot      |

### 7.4 Endpoints

* `GET  /api/ai/providers` → list registry + which the user has connected.
* `POST /api/ai/credentials` `{providerId, apiKey, defaultModel, baseUrl?}` → encrypts + tests.
* `DELETE /api/ai/credentials/:id`.
* `POST /api/ai/chat` (streaming) — uses Vercel AI SDK `streamText` with tool definitions.
* `POST /api/ai/agent` — LangChain agent runs autonomous loops (e.g., "find a slot with Mary that works for everyone next week").

### 7.5 Cost & limits

* Every call writes `AIUsageLog`. Admin can set per-org budgets.
* Provider 4xx/5xx surface as graceful chat errors with hint to fix the key.

---

## 8. Mobile App (Expo)

* Separate folder `/mobile` (created in a follow-up session). Shares types via `@cally/shared` (workspace package).
* Auth: `better-auth/expo` plugin. Uses `expo-secure-store`. Bearer token in headers.
* Screens: Login, Calendar (Agenda + Day), Booking management, Notifications, Settings, AI Assistant.
* Push notifications via Expo push service (reminders 24h / 1h before appointment).
* The iOS/Android apps must be built with EAS Build & tested on devices.

---

## 9. Background Workers (BullMQ)

| Queue            | Job                       | Cadence                    |
| ---------------- | ------------------------- | -------------------------- |
| `calendar-sync`  | `full-sync(accountId)`    | On connect, on 410         |
| `calendar-sync`  | `delta-sync(accountId)`   | On webhook                 |
| `calendar-sync`  | `push-event(apptId)`      | On appointment write       |
| `calendar-sync`  | `renew-channel(accountId)`| Hourly check               |
| `reminders`      | `send-reminder(apptId)`   | T-24h, T-1h before start   |
| `email`          | `send(template, to, ctx)` | On demand                  |
| `ai-usage`       | `log(usage)`              | Async after AI call        |
| `webhook-out`    | `dispatch(webhookId)`     | On user-defined events     |

Worker process is a separate Node entrypoint (`src/worker.ts`), run as its own supervisor program.

---

## 10. Multi-Tenancy Model

* **Personal** = single user, no org. Everything works.
* **Team** = an org with multiple members. Bookings can be **round-robin** (rotate among team) or **collective** (all members must be free).
* **Agency** = an org with multiple **teams**, each with their own booking pages. Owner is a paid plan.
* All non-public data queries are scoped by `userId` AND optional `organizationId` from the session context.
* Public booking page slug: `/book/<orgSlug>/<typeSlug>` for orgs, `/book/<userSlug>/<typeSlug>` for personal.

---

## 11. Security Posture

* OWASP ASVS L2 target.
* All OAuth/API tokens encrypted at rest (AES-256-GCM, key from env).
* Helmet-equivalent headers via existing `proxy.ts` (CSP nonce-based).
* Rate-limited public endpoints (`/api/booking`, `/api/auth`, `/api/ai`).
* CSRF (better-auth built-in) for cookie sessions.
* Audit log: every auth, payment, integration, settings change.
* Password: 12-char min, complexity, breached-password check (k-anonymity API).
* IP allowlist for `/admin` (existing setting).
* Maintenance mode flag respected (existing).

---

## 12. Observability

* Structured logs via `pino` (request id, user id, org id).
* `/api/health` returns DB + Redis + queue health (existing endpoint extended).
* Error tracking hook for Sentry (env-flagged).
* Metrics: `prom-client` exposing queue depths, sync latency, AI tokens.

---

## 13. Deployment Modes

| Mode                    | Stack                                                      |
| ----------------------- | ---------------------------------------------------------- |
| **Self-hosted**         | `setup.sh` (existing) + Caddy + Postgres + Redis + systemd |
| **Docker Compose**      | `docker-compose.yml` (web, worker, postgres, redis)        |
| **Cloud (Vercel/Fly)**  | Vercel for web; Neon/Supabase for Postgres; Upstash Redis  |



---

## 14. Phased Delivery Plan

### Phase 0 — Foundation (this session)

1. Architecture document (this file) + ROADMAP.
2. Postgres + Redis services in supervisor.
3. Prisma schema migrated from SQLite → Postgres + new tables.
4. better-auth replacing NextAuth (email+password + Google social, 2FA scaffolded).
5. Google Calendar **Connect + read-only conflict feed** (one-way for v2 MVP; outbound push deferred).
6. AI provider registry + BYO-key + chat endpoint with Vercel AI SDK.
7. Stripe key already present in env; Stripe wiring deferred to Phase 2.
8. Mobile app **deferred to a separate session** (cannot be previewed here).

### Phase 1 — Hardening & Outbound

* Outbound calendar push, webhook channel renewal, conflict resolver.
* Microsoft Outlook + CalDAV connectors.
* Passkeys + email verification end-to-end.
* Stripe Checkout + Connect for paid bookings.

### Phase 2 — Mobile + Marketplace

* Expo app (login, calendar, bookings, AI).
* Public marketplace, multi-tenant booking pages, white-label org branding.
* Zoom + Teams meeting providers.
* Plug-in architecture (#91 of roadmap).

### Phase 3 — Intelligence

* LangChain scheduling agent with autonomous reschedule.
* Meeting transcription + summary (Whisper + AI provider).
* Smart insights dashboard, anomaly detection.

---

## 15. Open Questions / Required Inputs from User

* **Google OAuth** — `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` from Google Cloud Console (used for both auth login AND calendar). Redirect URI: `<APP_URL>/api/auth/callback/google` and `<APP_URL>/api/integrations/google/callback`.
* **AES master key** — auto-generated by setup if absent; stored in `.env` as `MASTER_ENCRYPTION_KEY` (44-char base64).
* **better-auth secret** — auto-generated; `BETTER_AUTH_SECRET`.
* **AI keys** — none required at infrastructure level; users supply their own in-app.
* **SMTP** — required for email verification & reminders (existing setting).

---

End of v2 architecture.

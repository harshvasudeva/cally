# Cally v2 — Product Requirements Document

## Original problem statement

> replace the legacy login system with better production ready method better-auth?
> then suggest what can be done that problems related to calender are not solved
> using usual google calender, cal.com and other booking sites? if all in one
> solution is what i want?

## User-explicit choices

- Stack: **Next.js 16 + better-auth + Prisma + PostgreSQL** with Expo (RN) mobile (deferred), Redis + BullMQ.
- AI: **BYO-key per user** + **Vercel AI SDK** swappable provider.
- Auth methods: email/password as primary + multiple OAuth (Google, Microsoft, Apple, Discord, GitHub, Facebook, X, LinkedIn) + LDAP/SSO later.
- Calendar v1 integrations: Google (working), Outlook (Phase 1 OAuth ready), Apple/CalDAV (Phase 1 stub), Zoom/Teams (Phase 2), Stripe (Phase 1 ready).
- Tenant model: personal + team + agency (better-auth organization plugin).
- Quality bar: "safe, secure, production ready".

## Architecture

See `/app/ARCHITECTURE.md` (v2.0) — single source of truth.

## Phase 0 — Foundation (2026-05-03 morning)

- [x] Architecture document `/app/ARCHITECTURE.md`
- [x] Postgres + Redis + Next.js + API proxy under supervisor (`/etc/supervisor/conf.d/cally.conf`)
- [x] Persistent Postgres data dir at `/app/data/postgres` (survives pod resets)
- [x] Bootstrap script `/app/scripts/bootstrap-services.sh` for pod recovery
- [x] Prisma schema fully migrated to Postgres (24 models)
- [x] **better-auth** server with email/password + 8 OAuth providers (env-gated) + organization plugin + 2FA plugin
- [x] better-auth client + NextAuth compat shim so 30+ existing pages keep working
- [x] AES-256-GCM encryption helper for at-rest secrets
- [x] AI provider registry — OpenAI, Anthropic, Google, Groq, Mistral, OpenRouter, Ollama
- [x] AI BYO-key endpoints (encrypted storage) + streaming chat at `/api/ai/chat`
- [x] AI Settings UI at `/settings/ai`
- [x] Google Calendar Connect endpoints + initial full-sync of primary calendar
- [x] Integrations UI at `/settings/integrations`
- [x] **36/36 backend tests passing** (iteration_1.json)

## Phase 1 — Workers + Org/Team + Stripe + AI Chat + Outlook scaffold (2026-05-03 afternoon)

- [x] **BullMQ worker process** (`/app/src/worker.ts`) running under supervisor program `worker`
  - Queues: `calendar-sync`, `reminders`
  - Job types: `full-sync`, `delta-sync`, `push-event` (create/update/cancel), `renew-channel`
  - Verified: enqueue → worker picks up job within ~1 second
- [x] **Outbound Google Calendar push** in worker — creates/updates/deletes events on user's primary calendar with `extendedProperties.private.callyAppointmentId` for loop-prevention
- [x] **Google Calendar webhook receiver** at `POST /api/integrations/google/webhook` — verifies channel id + token, enqueues delta-sync job
- [x] **Delta-sync** with `syncToken` + 410 fallback to full sync
- [x] **Stripe Checkout** layer:
  - `lib/stripe.ts` (singleton, detects placeholder `sk_test_emergent` as not-configured)
  - `POST /api/stripe/checkout` creates pending Appointment + Stripe Session
  - `POST /api/stripe/webhook` verifies signature, marks paid + CONFIRMED, idempotent via AuditLog
- [x] **Org/Team APIs**:
  - `GET/POST /api/organizations` (with concurrent-safe slug generation via P2002 retry)
  - `GET/POST /api/organizations/[id]/teams` (admin role check)
  - `GET/POST /api/organizations/[id]/invitations` (HMAC-signed acceptUrl)
- [x] **Org/Team UI** at `/organizations` — create org, invite members, list pending invitations
- [x] **AI Chat UI** at `/ai` using `useChat` from `@ai-sdk/react` — streaming responses, model picker, no-credential nudge
- [x] **Microsoft Graph (Outlook) connector** — OAuth URL builder + token exchange + persistAccount in `/app/src/lib/calendar/microsoft.ts` (sync TBD Phase 2)
- [x] **CalDAV connector stub** in `/app/src/lib/calendar/caldav.ts` — credential storage (Phase 2 sync polling)
- [x] **33/33 backend tests passing** (iteration_2.json) — total 69/69 across both phases
- [x] Improvements applied: org POST wraps response in `{organization}`, AI chat returns JSON 401, webhook validates channel token

## Verified working (manual + automated)

| Endpoint                                        | Status |
| ----------------------------------------------- | ------ |
| Auth (register/sign-in/sign-out/get-session)    | ✅     |
| AI credentials CRUD                             | ✅     |
| AI chat 400 (no creds), 401 JSON (no auth)      | ✅     |
| Organizations create/list                       | ✅     |
| Teams create (round_robin or collective)        | ✅     |
| Invitations create with acceptUrl               | ✅     |
| Google webhook 404/401/200                      | ✅     |
| Stripe checkout 503-by-design                   | ✅     |
| Stripe webhook 503-by-design                    | ✅     |
| Worker enqueue → process roundtrip              | ✅     |
| All Phase 0 endpoints regression                | ✅     |

## Backlog (prioritized)

### P0 — credentials & finishing touches
- Provide Google OAuth credentials so the Connect → full-sync round-trip can be tested live
- Provide a real Stripe test key (`sk_test_*` from dashboard) for live Checkout test
- Provide Microsoft OAuth credentials to activate Outlook
- Email verification + password reset full UI flow (better-auth handles backend)
- Wire `enqueueAppointmentPush` into the existing `/api/appointments/*` write paths

### P1 — broader integrations
- Booking page payment flow (`/book/[slug]/[type]/success`)
- CalDAV polling worker (Apple iCloud, Fastmail, generic)
- Zoom + Teams meeting providers on appointment create
- Passkeys + 2FA UI flows end-to-end
- LangChain scheduling agent (autonomous tool-calling: `findFreeSlots`, `bookAppointment`, etc.)
- Org switcher in NavigationRail (set `activeOrganizationId` on session)
- Round-robin slot resolver for booking pages
- Email dispatch for invitations (currently acceptUrl returned to caller only)
- Reminder worker logic (currently stub) — actually send T-24h / T-1h emails

### P2 — mobile, marketplace, intelligence
- Expo (RN) mobile app sharing types via workspace package
- Marketplace, white-label org branding
- Plug-in architecture
- Meeting transcription + AI summary
- Insights dashboard, anomaly detection
- LDAP enterprise SSO via generic OIDC (or Keycloak bridge)

## Personas

- **Solo professional** — booking page, Stripe, calendar sync, AI assistant.
- **Team** — round-robin / collective scheduling, shared availability.
- **Agency owner** — multi-team org, white-label, sub-accounts.
- **Bookee / Guest** — frictionless booking experience.

## Next action items (next session)

1. Provide Google + Microsoft + Stripe OAuth/API keys so the live round-trips can be validated.
2. Build the booking page payment success route + reschedule/cancel buttons that enqueue push-event jobs.
3. Add org switcher to the navigation, scope queries by `session.session.activeOrganizationId`.
4. Implement reminder worker (T-24h / T-1h emails using existing email infra).
5. Implement CalDAV polling worker.
6. Begin Expo (mobile) scaffolding in a `/mobile` workspace.

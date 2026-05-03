# Cally v2 — Product Requirements Document

## Original problem statement

> replace the legacy login system with better production ready method better-auth?
> then suggest what can be done that problems related to calender are not solved
> using usual google calender, cal.com and other booking sites? if all in one
> solution is what i want?

## User-explicit choices

- Stack: **Next.js 16 + better-auth + Prisma + PostgreSQL** with Expo (RN) mobile (deferred), Redis + BullMQ.
- Database: **PostgreSQL** (migrated from SQLite).
- AI: **BYO-key per user** + **Vercel AI SDK + LangChain.js** swappable provider.
- Auth methods: email/password as primary + multiple OAuth (Google, Microsoft, Apple, Discord, GitHub, etc.) + LDAP/SSO later for enterprises.
- Calendar v1 integrations: Google Calendar (working), Outlook/Apple/CalDAV (Phase 1), Zoom/Teams (Phase 2), Stripe (Phase 1).
- Tenant model: personal + team + agency (better-auth organization plugin).
- Quality bar: "safe, secure, production ready".

## Architecture

See `/app/ARCHITECTURE.md` (v2.0) — single source of truth (15 sections, full domain model, security posture, phased delivery).

## Phase 0 — Implemented in this session (2026-05-03)

- [x] Architecture document `/app/ARCHITECTURE.md`
- [x] Postgres + Redis + Next.js + API proxy under supervisor (`/etc/supervisor/conf.d/cally.conf`)
- [x] Persistent Postgres data dir at `/app/data/postgres` (survives pod resets)
- [x] Bootstrap script `/app/scripts/bootstrap-services.sh` for pod recovery
- [x] Prisma schema fully migrated to Postgres (24 models incl. CalendarAccount, ExternalEvent, AIProvider, UserAICredential, Organization, Member, Team, Passkey, TwoFactor, AIConversation, AIMessage, etc.)
- [x] **better-auth** server (`/app/src/lib/auth.ts`) with email/password + 8 OAuth providers (env-gated) + organization plugin + 2FA plugin
- [x] better-auth client (`/app/src/lib/auth-client.ts`) + NextAuth compat shim (`server-session.ts`, `auth-react-compat.tsx`) so 30+ existing pages keep working
- [x] AES-256-GCM encryption helper (`/app/src/lib/crypto.ts`) for OAuth tokens, AI keys, TOTP secrets at rest
- [x] AI provider registry (`/app/src/lib/ai/providers.ts`) — OpenAI, Anthropic, Google, Groq, Mistral, OpenRouter, Ollama
- [x] AI BYO-key endpoints: `GET/POST /api/ai/credentials`, streaming chat at `/api/ai/chat` (Vercel AI SDK)
- [x] AI Settings UI at `/settings/ai`
- [x] Google Calendar Connect endpoints (`/api/integrations/google/connect|callback`) with full-sync of primary calendar
- [x] Calendar sync helpers (`/app/src/lib/calendar/google.ts`) — token refresh, fullSyncCalendar, listCalendars, disconnect
- [x] Integrations UI at `/settings/integrations`
- [x] Smoke test: register, sign-in, get-session, all auth pages and APIs returning 200

## Verified working (manual smoke test)

| Endpoint                          | Result |
| --------------------------------- | ------ |
| POST `/api/auth/register`         | 201    |
| POST `/api/auth/sign-in/email`    | 200    |
| GET `/api/auth/get-session`       | 200    |
| GET `/api/auth/providers-list`    | 200    |
| GET `/dashboard`                  | 200    |
| GET `/settings/ai`                | 200    |
| GET `/settings/integrations`      | 200    |
| GET `/api/ai/credentials`         | 200    |
| GET `/api/integrations`           | 200    |
| GET `/api/integrations/google/connect` | 503 (correct — no Google creds yet) |

## Backlog (prioritized)

### P0 — finish auth & sync foundations
- Outbound Google Calendar push (two-way sync + loop break)
- Webhook channel renewal worker (BullMQ)
- Email verification + password reset full flow with React Email templates
- Replace existing app pages' inline auth checks to use better-auth helpers (currently working via compat shim)
- AI usage logging into `AIMessage`/`AIUsageLog` tables (currently chat works but no logging)

### P1 — broader integrations
- Microsoft Outlook + Apple iCloud + CalDAV connectors
- Stripe Checkout + Connect for paid bookings
- Zoom + Teams meeting providers
- Passkeys + 2FA UI flows end-to-end
- LangChain scheduling agent (autonomous tool-calling: `findFreeSlots`, `bookAppointment`, etc.)
- Multi-tenant org/team UI (org switcher, invitations, round-robin schedules)

### P2 — mobile, marketplace, intelligence
- Expo (RN) mobile app sharing types via workspace package
- Marketplace, white-label org branding
- Plug-in architecture
- Meeting transcription + AI summary (post-meeting flow)
- Insights dashboard, anomaly detection
- LDAP enterprise SSO via generic OIDC (or Keycloak bridge)

## Personas

- **Solo professional** — booking page, Stripe, calendar sync, AI assistant.
- **Team** — round-robin / collective scheduling, shared availability.
- **Agency owner** — multi-team org, white-label, sub-accounts.
- **Bookee / Guest** — frictionless booking experience.

## Next action items (next session)

1. Provide Google OAuth credentials to test end-to-end calendar Connect flow.
2. Implement BullMQ worker process + outbound calendar push.
3. Build the AI chat UI page (`/ai/chat`) consuming `/api/ai/chat` stream.
4. Add organization/team UI (create org, invite members).
5. Wire payment flow (Stripe Checkout) for paid appointment types.
6. Begin Outlook + CalDAV connectors.

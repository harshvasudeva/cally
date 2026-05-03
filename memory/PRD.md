# Cally v2 — Product Requirements Document

## Original problem statement

> replace the legacy login system with better production ready method better-auth?
> then suggest what can be done that problems related to calender are not solved
> using usual google calender, cal.com and other booking sites? if all in one
> solution is what i want?

## User-explicit choices

- Stack: **Next.js 15+ + better-auth + Prisma + PostgreSQL** with Expo (RN) mobile, Redis + BullMQ.
- Database: **PostgreSQL** (migrate from SQLite).
- AI: **BYO-key per user** + **Vercel AI SDK + LangChain.js** swappable provider.
- Calendar v1 integrations: Google Calendar, Microsoft Outlook/365, Apple iCloud (CalDAV), generic CalDAV, Zoom, Google Meet, Microsoft Teams, Stripe.
- Tenant model: personal + team + agency.
- Scope chosen: full architecture doc + DB schema + auth + 1 working calendar (Google) + AI scheduling agent — as this session's MVP.
- Quality bar: "safe, secure, production ready".

## Architecture

See `/app/ARCHITECTURE.md` (v2.0) — single source of truth.

## Implementation status

### ✅ Phase 0 — In progress

- [x] Architecture document
- [ ] Postgres + Redis as supervisor services
- [ ] Prisma schema migrated to Postgres + new models (CalendarAccount, ExternalEvent, AIProvider, UserAICredential, Organization, Member, Team, Passkey, etc.)
- [ ] better-auth replacing NextAuth (email+password + Google social + 2FA scaffold)
- [ ] Google Calendar Connect + conflict feed
- [ ] AI provider registry + BYO-key + chat endpoint
- [ ] Mobile (Expo) — deferred (cannot preview in this env)

## Backlog (prioritized)

### P0
- Outbound Google Calendar push (two-way sync)
- Webhook channel renewal worker
- Email verification + password reset full flow
- Stripe Checkout + Connect for paid bookings
- Existing 100-item roadmap items #1-#75 (security & ops)

### P1
- Microsoft Outlook + CalDAV connectors
- Zoom + Teams meeting providers
- Expo mobile app
- Multi-tenant org/team UI flows
- LangChain scheduling agent (autonomous tool-calling)

### P2
- Plug-in architecture
- Marketplace & white-labeling
- Meeting transcription + AI summary
- Insights dashboard

## Personas

- **Solo professional** (consultant, coach, designer) — needs booking page, Stripe, calendar sync, AI assistant.
- **Team** (small agency, sales team) — round-robin / collective scheduling, shared availability.
- **Agency owner** — multi-team org, white-label, sub-accounts.
- **Bookee / Guest** — just wants to book a slot, no friction.

## Next action items

1. Stand up Postgres + Redis services.
2. Generate new Prisma schema for Postgres + run migrations.
3. Implement better-auth server + client + replace NextAuth pages.
4. Implement Google Calendar Connect + conflict detection.
5. Implement AI BYO-key + provider factory + streaming chat endpoint.
6. Run testing agent on the four critical flows (auth, booking, calendar connect, AI chat).

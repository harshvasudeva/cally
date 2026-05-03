# Cally v2 — All-in-one self-hosted scheduling

> Calendly + Google Calendar + AI assistant + Stripe — fully self-hostable, with **better-auth**, **PostgreSQL**, and **bring-your-own AI key**.

## What's new in v2 (this branch)

| | v1 | v2 |
|---|---|---|
| Auth | NextAuth v4 | **better-auth** (email+password, 8 OAuth providers, 2FA scaffold, organization plugin) |
| DB   | SQLite | **PostgreSQL** (Prisma 7 driver adapter) |
| AI   | none | **BYO-key**: each user picks OpenAI / Anthropic / Gemini / Groq / Mistral / OpenRouter / Ollama and pastes their own key (encrypted AES-256-GCM) |
| Calendar | none | Google Calendar **Connect + conflict-feed** (foundation for two-way sync) |
| Multi-tenancy | none | Organization + Member + Team models (UI in Phase 1) |
| Encryption | n/a | AES-256-GCM helper (`src/lib/crypto.ts`) for OAuth tokens, AI keys, TOTP secrets |
| Background jobs | none | BullMQ + Redis installed (workers in Phase 1) |

See **[`/app/ARCHITECTURE.md`](./ARCHITECTURE.md)** for the full v2 spec.

## Quick start (Emergent preview environment)

The preview pod is configured with:

| Service       | Port | Notes |
|--------------|------|-------|
| Next.js dev   | 3000 | supervisor program `nextjs` |
| api-proxy     | 8001 | forwards `/api/*` from external 8001 → 3000 (because Emergent ingress sends `/api/*` to 8001) |
| PostgreSQL 15 | 5432 | data dir `/app/data/postgres/15/main` (persistent) |
| Redis 7       | 6379 | data dir `/app/data/redis` |

```bash
# After a pod reset, re-bootstrap system packages:
bash /app/scripts/bootstrap-services.sh
sudo supervisorctl restart postgresql redis nextjs api-proxy

# Manual checks:
sudo supervisorctl status
PGPASSWORD=cally_local_dev psql -h 127.0.0.1 -U cally -d cally -c '\dt'
redis-cli ping
```

## Auth flows working today

```bash
# Register (creates user + default availability + default appointment type, all in a transaction)
curl -X POST http://127.0.0.1:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"You","email":"you@example.com","password":"YourPass123"}'

# Sign in (better-auth)
curl -X POST http://127.0.0.1:3000/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"you@example.com","password":"YourPass123"}'

# Get current session
curl http://127.0.0.1:3000/api/auth/get-session -b cookies.txt
```

## OAuth providers

All 8 social providers are pre-wired in `src/lib/auth.ts` — each only renders/activates when its `*_CLIENT_ID` and `*_CLIENT_SECRET` env vars are set. Currently all are blank in `.env`.

- Google, GitHub, Discord, Microsoft, Apple, Facebook, X (Twitter), LinkedIn

To enable Google login + Google Calendar sync (single OAuth client):

1. Create OAuth 2.0 Web app at <https://console.cloud.google.com/apis/credentials>
2. Enable "Google Calendar API" in the same project
3. Authorized redirect URIs:
   - `<APP_URL>/api/auth/callback/google`
   - `<APP_URL>/api/integrations/google/callback`
4. Paste `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` into `/app/.env`
5. `sudo supervisorctl restart nextjs`

## AI BYO-key

Each end user goes to **/settings/ai**, picks a provider, pastes their key, and Cally stores it encrypted. The chat endpoint `POST /api/ai/chat` resolves the user's stored credential and streams via Vercel AI SDK.

Supported providers (all swappable):
- `openai`: gpt-5.2, gpt-5.1, gpt-5, gpt-4.1, gpt-4o…
- `anthropic`: claude-sonnet-4-6, claude-opus-4-6, claude-haiku-4-5…
- `google`: gemini-3.1-pro, gemini-3-flash, gemini-2.5-pro…
- `groq`: llama-3.3-70b, mixtral-8x7b…
- `mistral`: mistral-large, codestral…
- `openrouter`: any model the OpenRouter aggregator carries
- `ollama`: any local model — user provides base URL

## Test credentials

See `/app/memory/test_credentials.md`.

## Project layout (notable)

```
/app
├── ARCHITECTURE.md             ← v2 spec (15 sections)
├── memory/
│   ├── PRD.md                  ← living product doc
│   └── test_credentials.md
├── prisma/
│   ├── schema.prisma           ← 24 models (Postgres)
│   └── migrations/
│       └── 20260503*_init_v2_postgres/
├── prisma.config.ts            ← Prisma 7 datasource config
├── scripts/
│   ├── api-proxy.js            ← 8001 → 3000 forwarder
│   └── bootstrap-services.sh   ← pod-reset recovery
└── src/
    ├── app/api/
    │   ├── auth/[...all]/      ← better-auth catch-all
    │   ├── auth/register/      ← custom register w/ tx + defaults
    │   ├── auth/providers-list/← env-based OAuth provider list
    │   ├── ai/credentials/     ← AI BYO-key CRUD
    │   ├── ai/chat/            ← streaming chat (Vercel AI SDK)
    │   ├── integrations/       ← list / disconnect calendar accounts
    │   └── integrations/google/{connect,callback}/
    ├── app/settings/ai/        ← AI provider UI
    ├── app/settings/integrations/ ← Google connect UI
    └── lib/
        ├── auth.ts             ← better-auth server config
        ├── auth-client.ts      ← better-auth React client
        ├── auth-react-compat.tsx ← NextAuth/react compat shim
        ├── server-session.ts   ← getServerSession() compat
        ├── crypto.ts           ← AES-256-GCM for tokens & keys
        ├── ai/providers.ts     ← provider registry + factory
        └── calendar/google.ts  ← Google Calendar OAuth + sync helpers
```

## Roadmap

See `/app/roadmap-2026.md` (100 items, original) and `/app/ARCHITECTURE.md` § 14 (phased v2 delivery).

# Backend and Mobile Migration Plan

Last updated: 2026-05-04

## Current Shape

Cally is currently a single Next.js app:

- Web UI lives in `src/app/**/page.tsx` and `src/components/**`.
- Backend endpoints live in `src/app/api/**/route.ts`.
- Server-only dependencies are shared through `src/lib/**`, including Prisma, auth, queues, Stripe, mail, calendar integrations, webhooks, and AI providers.
- The database schema is in `prisma/schema.prisma`; generated Prisma code is under `src/generated/prisma/client`.
- The UI is partially migrated to shadcn-style primitives, but many pages still use legacy global classes from `src/app/globals.css`.

This structure can host the web product, but it is not ready for a mobile app because the mobile client would need stable external APIs, mobile-friendly auth/session handling, upload/deep-link flows, push notification flows, and a shared API contract.

## Target Architecture

Recommended target:

```text
apps/
  web/          Next.js web app
  mobile/       Expo React Native app
  api/          standalone HTTP API service
packages/
  api-client/   typed fetch client used by web and mobile
  contracts/    zod schemas, DTOs, API error shapes
  db/           Prisma schema/client/migrations
  core/         scheduling, availability, booking, notification rules
  ui-web/       web-only UI primitives
```

The first migration can be logical before it is physical: move backend code behind service functions and typed contracts while the handlers still run inside Next. Once stable, move those handlers into `apps/api`.

## Backend Separation Phases

### Phase 1: Stabilize the Existing App

- Fix the current type/build blockers before moving code:
  - `prisma/seed.ts` imports `PrismaClient` from `@prisma/client`, but the project uses a custom Prisma generator output.
  - `src/lib/db-init.ts` and `src/bot.ts` still reference `@prisma/adapter-better-sqlite3`, while the app now uses PostgreSQL.
  - `Settings` API uses `sslCertPath` and `sslKeyPath`, but those fields are missing from `prisma/schema.prisma`.
  - Several Prisma JSON writes pass raw `null` or broad records that no longer type-check.
  - `@ai-sdk/react` usage in `src/app/ai/page.tsx` appears out of sync with the installed AI SDK.
  - `src/middleware.ts` uses `request.ip`, which is not available on `NextRequest`.
- Decide whether the repo should use `bun.lock` only and remove the deleted `package-lock.json` from future workflows.
- Stop tracking local database state. The deleted `data/postgres/**` and `data/redis/**` entries indicate runtime data was previously committed.
- Repair lint tooling. `bun run lint` currently crashes before source linting because the installed ESLint 10 stack and `eslint-plugin-react` path are incompatible.

### Phase 2: Introduce API Contracts

- Add request/response schemas for each API domain:
  - auth/session
  - dashboard
  - events
  - appointments
  - appointment types
  - availability
  - date overrides
  - calendar streams
  - integrations
  - settings
  - organizations
  - AI
  - admin
- Use shared DTOs instead of returning raw Prisma records directly.
- Standardize API errors:
  - `{ code, message, details? }`
  - consistent `401`, `403`, `404`, `409`, `422`, `429`, and `500` behavior.
- Add an `api-client` wrapper so web pages stop calling string URLs like `fetch("/api/events")` directly.

### Phase 3: Extract Core Services

- Move business logic out of `route.ts` files into domain services:
  - `core/scheduling`
  - `core/availability`
  - `core/appointments`
  - `core/calendar-sync`
  - `core/notifications`
  - `core/billing`
  - `core/admin`
- Keep route handlers thin: validate input, authorize, call service, serialize response.
- Add service-level tests for the scheduling and booking rules before mobile work begins.

### Phase 4: Create Standalone API

- Create `apps/api` as a Node HTTP server. Fastify or Hono are both reasonable; Fastify is a conservative choice for a stateful backend with plugins, validation, logging, hooks, and long-term Node hosting.
- Move Next route handlers into API routes incrementally, preserving URL compatibility under `/api/v1`.
- Add CORS allowlists for:
  - web production domain
  - web preview domain
  - Expo development origins
  - mobile deep-link callback origins where needed
- Make the API container/server own:
  - Prisma
  - Redis/BullMQ
  - Stripe webhooks
  - Google calendar webhooks
  - email/Discord workers
  - cron/scheduled jobs
- Keep the Next app as a pure web client, with only page rendering and client-side API calls.

### Phase 5: Mobile Readiness

- Auth:
  - Keep better-auth for web, but define a mobile session strategy explicitly.
  - Prefer secure bearer/session token exchange for mobile, stored in secure storage.
  - Add refresh/session introspection endpoints.
- OAuth:
  - Add native redirect/deep-link callback handling for Google/Microsoft/Discord/Apple sign-in.
  - Do not rely on browser-only cookie redirects for mobile.
- Push notifications:
  - Add device token registration endpoints.
  - Store per-device notification preferences.
  - Add background reminder jobs.
- Files/uploads:
  - Replace server-local SSL/upload assumptions with object storage or explicit admin-only server config.
- Pagination/offline:
  - Add cursor pagination to list endpoints.
  - Return `updatedAt` and deletion markers where mobile sync needs them.

## Expo vs Native

Recommendation: start with Expo, not separate native iOS/Android apps.

Reasons:

- Expo is built for universal Android, iOS, and web React Native apps, and its docs position it as a framework for building and maintaining React Native apps at scale.
- Expo Router gives Next-like file-based routing for React Native apps, which fits the team’s existing Next mental model.
- Expo can still support custom native code through config plugins, prebuild, and local Expo modules when needed.
- Fully native Swift/Kotlin should be reserved for requirements like heavy native calendar widgets, deep OS integrations, custom background services, or platform-specific performance that React Native cannot satisfy.

Important caveat: this Next UI cannot be directly converted into Expo. React DOM components, browser CSS/Tailwind classes, FullCalendar, Next routing, and web-specific auth flows must be rebuilt for React Native. The reusable parts are TypeScript types, API contracts, business rules, date/scheduling logic, validation schemas, and product flows.

Official references:

- Expo describes itself as tooling for Android, iOS, and web apps and documents the Expo development workflow at `https://docs.expo.dev/workflow/overview/`.
- Expo Router is documented as a routing library for React Native and web apps at `https://docs.expo.dev/router/introduction/`.
- React Native documents native modules for cases where platform APIs are not available from JavaScript at `https://reactnative.dev/docs/legacy/native-modules-intro`.

## Frontend Cleanup Plan

Safe cleanup already started:

- `src/components/Toast.tsx` is now only a compatibility re-export to the Sonner-backed toast implementation.
- `src/app/settings/notifications/page.tsx` now uses the existing `input` class instead of the stale `input-field` class.

Remaining cleanup:

- Migrate pages still using legacy global classes:
  - `.btn`, `.btn-primary`, `.btn-outline`, `.btn-danger`, `.btn-success`
  - `.card`, `.card-hover`
  - `.input`, `.label`
  - `.glass`, `.gradient-primary`, `.gradient-radial`
  - status badge classes
- Convert those pages to `src/components/ui/*` components.
- Once usage reaches zero, remove the legacy CSS block from `src/app/globals.css`.
- Keep `components.json`, `src/lib/utils.ts`, Radix deps, Sonner, `class-variance-authority`, `clsx`, and `tailwind-merge`; they are part of the active shadcn-style setup, not residue.

## Practical Next Steps

1. Fix type/build blockers and lint tooling.
2. Add `packages/contracts` and `packages/api-client` while keeping current Next routes.
3. Convert direct frontend `fetch("/api/...")` calls to the typed API client.
4. Extract route logic into domain services.
5. Create `apps/api` and move endpoints by domain.
6. Start `apps/mobile` with Expo after the core auth/session and appointment/dashboard APIs are stable.

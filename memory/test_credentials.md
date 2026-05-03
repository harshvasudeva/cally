# Cally v2 — Test Credentials

## Database (Postgres, local)
- **Host**: 127.0.0.1
- **Port**: 5432
- **Database**: cally
- **User**: cally
- **Password**: cally_local_dev
- **Connection string**: `postgresql://cally:cally_local_dev@127.0.0.1:5432/cally?schema=public`

## Test admin user (created during smoke test)
- **Email**: admin@cally.local
- **Password**: TestPass123
- **Role**: ADMIN
- **Slug**: test-admin

## Redis
- **URL**: redis://127.0.0.1:6379

## Service supervisor programs
- `postgresql`, `redis`, `nextjs` (port 3000), `api-proxy` (port 8001 → 3000)

## Notes
- First user created automatically becomes ADMIN.
- All Postgres data persists at `/app/data/postgres/15/main` (survives pod restart).
- Redis data at `/app/data/redis`.
- Run `bash /app/scripts/bootstrap-services.sh` after a pod reset to reinstall packages, then `sudo supervisorctl restart postgresql redis nextjs api-proxy`.

## OAuth credentials (NOT YET PROVIDED)
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are blank in `/app/.env`.
- Once added, restart Next.js (`sudo supervisorctl restart nextjs`) and the "Connect Google Calendar" button on `/settings/integrations` becomes live.

## AI providers
- BYO-key model: each user adds their own API key in Settings → AI.
- Encrypted in DB with AES-256-GCM (`MASTER_ENCRYPTION_KEY` from `/app/.env`).

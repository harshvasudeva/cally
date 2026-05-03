#!/usr/bin/env bash
# Bootstraps Postgres + Redis after a pod reset.
# Re-installs system packages (which are ephemeral) and points Postgres at our
# persistent data directory under /app/data so the cluster survives.
# Idempotent: safe to run multiple times.
set -euo pipefail

log() { echo -e "\033[36m[bootstrap]\033[0m $*"; }

# 1. Ensure system packages
if ! command -v psql >/dev/null 2>&1 || ! command -v redis-server >/dev/null 2>&1; then
  log "Installing PostgreSQL + Redis"
  DEBIAN_FRONTEND=noninteractive apt-get install -y postgresql redis-server >/tmp/bootstrap.log 2>&1
fi

mkdir -p /app/data /app/data/redis
chown -R postgres:postgres /app/data 2>/dev/null || true

# 2. Ensure persistent Postgres cluster
if [ ! -d /app/data/postgres/15/main ]; then
  log "Creating persistent PG cluster"
  pg_dropcluster 15 main --stop 2>/dev/null || true
  pg_createcluster 15 main -d /app/data/postgres/15/main >/dev/null
  chown -R postgres:postgres /app/data/postgres
fi

# Make sure the default cluster points to /app/data/postgres
DATA_DIR=$(pg_lsclusters -h | awk '/^15 +main/ {print $6}')
if [ "$DATA_DIR" != "/app/data/postgres/15/main" ]; then
  log "Re-pointing 15/main → /app/data/postgres/15/main"
  pg_dropcluster 15 main --stop 2>/dev/null || true
  pg_createcluster 15 main -d /app/data/postgres/15/main >/dev/null
  chown -R postgres:postgres /app/data/postgres
fi

# 3. Start cluster
pg_ctlcluster 15 main start >/dev/null 2>&1 || true

# 4. Bootstrap cally user/db (idempotent)
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_user WHERE usename='cally'" | grep -q 1; then
  sudo -u postgres psql -c "CREATE USER cally WITH PASSWORD 'cally_local_dev' CREATEDB;" >/dev/null
fi
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='cally'" | grep -q 1; then
  sudo -u postgres psql -c "CREATE DATABASE cally OWNER cally;" >/dev/null
fi

log "Postgres ready at 127.0.0.1:5432 (db=cally, user=cally)"

# 5. Stop manually-running pg so supervisor can take over
pg_ctlcluster 15 main stop --force >/dev/null 2>&1 || true
log "Bootstrap complete — start supervisor programs now"

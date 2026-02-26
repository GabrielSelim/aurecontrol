#!/bin/bash
# ============================================================
# AureControl - Apply migrations + seed during PostgreSQL init
# Runs inside /docker-entrypoint-initdb.d/ on first boot only
# Has access to psql via unix socket as superuser
# ============================================================
set -e

echo "=== AureControl: Applying app migrations ==="

MIGRATION_DIR="/app-migrations"
APPLIED=0

if [ -d "$MIGRATION_DIR" ]; then
  for f in $(ls "$MIGRATION_DIR"/*.sql 2>/dev/null | sort); do
    filename=$(basename "$f")
    echo "  -> $filename"
    psql -v ON_ERROR_STOP=1 --username "${POSTGRES_USER:-postgres}" --dbname "${POSTGRES_DB:-postgres}" -f "$f"
    APPLIED=$((APPLIED + 1))
  done
fi

echo "=== AureControl: $APPLIED migrations applied ==="

# Apply app seed (no auth dependencies)
if [ -f "/app-seed/seed-app.sql" ]; then
  echo "=== AureControl: Applying seed-app.sql ==="
  psql -v ON_ERROR_STOP=1 --username "${POSTGRES_USER:-postgres}" --dbname "${POSTGRES_DB:-postgres}" -f /app-seed/seed-app.sql
  echo "=== AureControl: Seed applied ==="
fi

echo "=== AureControl: Database initialization complete ==="

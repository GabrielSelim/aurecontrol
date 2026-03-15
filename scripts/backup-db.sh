#!/bin/bash
# =============================================================
# Aurecontrol — Automated PostgreSQL Backup
# Runs daily via system cron at 02:00
# Retention: 30 days
# =============================================================

set -euo pipefail

BACKUP_DIR="/root/backups/aurecontrol"
CONTAINER="aurecontrol-db"
DB_USER="postgres"
DB_NAME="postgres"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/aurecontrol_${DATE}.sql.gz"
LOG_FILE="${BACKUP_DIR}/backup.log"

mkdir -p "$BACKUP_DIR"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "Starting backup → ${BACKUP_FILE}"

# Run pg_dump inside the container and gzip the output
if docker exec "$CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner --no-acl \
    | gzip > "$BACKUP_FILE"; then
  SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
  log "Backup completed successfully — size: ${SIZE}"
else
  log "ERROR: pg_dump failed"
  exit 1
fi

# Rotate: delete backups older than RETENTION_DAYS
DELETED=$(find "$BACKUP_DIR" -name "aurecontrol_*.sql.gz" -mtime "+${RETENTION_DAYS}" -print -delete | wc -l)
log "Rotated ${DELETED} old backup(s) (>${RETENTION_DAYS} days)"

log "Done."

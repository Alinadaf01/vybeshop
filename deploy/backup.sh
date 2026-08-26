#!/usr/bin/env bash
# VYBE backend — daily backup: Postgres dump + media tarball, with
# retention (7 daily + 4 weekly) and optional upload to S3-compatible
# Object Storage (Arvan etc). Invoked by cron (see deploy/setup.sh stage 7)
# and safe to run manually any time — every run is independent, nothing
# here depends on a previous run's state beyond old backup files it prunes.
#
# Exits non-zero on any real failure so cron mails/logs the error — do not
# add `|| true` around the core dump/tar steps.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.prod.yml"
ENV_FILE="$PROJECT_DIR/.env.production"
BACKUPS_DIR="$PROJECT_DIR/deploy/backups"
STAMP="$(date +%Y%m%d-%H%M%S)"
DAY_OF_WEEK="$(date +%u)"  # 1=Monday .. 7=Sunday

mkdir -p "$BACKUPS_DIR"
set -a; source "$ENV_FILE"; set +a

dc() {
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

echo "[$(date -Iseconds)] شروع بک‌آپ..."

DUMP_FILE="$BACKUPS_DIR/daily-${STAMP}.dump.gz"
dc exec -T db pg_dump -U "${POSTGRES_USER:-vybeshop}" -Fc "${POSTGRES_DB:-vybeshop}" | gzip >"$DUMP_FILE"
echo "دیتابیس: $DUMP_FILE ($(du -h "$DUMP_FILE" | cut -f1))"

MEDIA_FILE="$BACKUPS_DIR/daily-${STAMP}-media.tar.gz"
docker run --rm -v vybe_media:/media:ro -v "$BACKUPS_DIR":/backups \
    alpine tar czf "/backups/$(basename "$MEDIA_FILE")" -C /media .
echo "media: $MEDIA_FILE ($(du -h "$MEDIA_FILE" | cut -f1))"

# Sunday's daily backup doubles as this week's weekly backup — just a copy
# under a different name, so weekly retention doesn't need separate logic.
if [[ "$DAY_OF_WEEK" == "7" ]]; then
    cp "$DUMP_FILE" "$BACKUPS_DIR/weekly-${STAMP}.dump.gz"
    cp "$MEDIA_FILE" "$BACKUPS_DIR/weekly-${STAMP}-media.tar.gz"
    echo "امروز یکشنبه است — نسخه هفتگی هم ذخیره شد."
fi

# Retention: keep the 7 newest daily pairs, 4 newest weekly pairs.
prune() {
    local pattern="$1" keep="$2"
    # `ls` on a glob with zero matches exits 2 (and its stderr, though
    # discarded here, would say "No such file or directory") -- under
    # set -e+pipefail that failure propagates through the whole pipe and
    # silently kills the script. This is the normal case on every run
    # until enough backups pile up to actually need pruning (confirmed
    # live: first-ever run had no weekly-*.dump.gz yet and aborted here).
    # `|| true` on the whole pipe converts "nothing to prune" into a
    # non-error, same as its intent always was.
    ls -t "$BACKUPS_DIR"/${pattern}.dump.gz 2>/dev/null | tail -n +$((keep + 1)) | while read -r old; do
        rm -f "$old" "${old%.dump.gz}-media.tar.gz"
        echo "حذف نسخه قدیمی: $old"
    done || true
}
prune "daily-*" 7
prune "weekly-*" 4

# Optional off-server upload — set BACKUP_S3_* in .env.production to enable.
if [[ -n "${BACKUP_S3_BUCKET:-}" ]]; then
    if command -v aws &>/dev/null; then
        AWS_ACCESS_KEY_ID="${BACKUP_S3_ACCESS_KEY:-}" AWS_SECRET_ACCESS_KEY="${BACKUP_S3_SECRET_KEY:-}" \
            aws s3 cp "$DUMP_FILE" "s3://${BACKUP_S3_BUCKET}/$(basename "$DUMP_FILE")" \
            --endpoint-url "${BACKUP_S3_ENDPOINT:-}"
        AWS_ACCESS_KEY_ID="${BACKUP_S3_ACCESS_KEY:-}" AWS_SECRET_ACCESS_KEY="${BACKUP_S3_SECRET_KEY:-}" \
            aws s3 cp "$MEDIA_FILE" "s3://${BACKUP_S3_BUCKET}/$(basename "$MEDIA_FILE")" \
            --endpoint-url "${BACKUP_S3_ENDPOINT:-}"
        echo "آپلود به s3://${BACKUP_S3_BUCKET} انجام شد."
    else
        echo "هشدار: BACKUP_S3_BUCKET تنظیم شده ولی دستور aws نصب نیست — فقط بک‌آپ محلی ذخیره شد." >&2
    fi
else
    echo "هشدار: BACKUP_S3_BUCKET تنظیم نشده — بک‌آپ فقط روی همین سرور است، نه یک فضای جدا." >&2
fi

echo "[$(date -Iseconds)] بک‌آپ تمام شد."

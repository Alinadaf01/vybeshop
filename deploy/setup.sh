#!/usr/bin/env bash
# VYBE backend — staged production deploy script (DEPLOY-TASK.md).
#
# Architecture: Option B — the storefront stays on Vercel, untouched. Only
# api.vybeshop.ir (Django) and admin.vybeshop.ir (the admin panel) live on
# this server.
#
# Usage:
#   sudo ./setup.sh 1     # server hardening: deploy user, firewall, fail2ban, timezone, swap
#   ./setup.sh 2          # (as deploy, after re-login) install Docker + health check
#   ./setup.sh 3          # clone repo, build .env.production with random secrets
#   ./setup.sh 4          # build admin panel, bring services up
#   ./setup.sh 5          # migrate database + media from your dev machine
#   ./setup.sh 6          # SSL via Certbot
#   ./setup.sh 7          # automatic backups + cron
#   ./setup.sh 8          # final check + status report
#
# Each stage prints what it's about to do, asks for confirmation before
# anything destructive, and ends with a "===== STAGE N SUMMARY =====" block
# you can copy straight back. Every stage is safe to re-run — see
# deploy/RUNBOOK.md for the full walkthrough of what to expect from each one.

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration — override any of these by exporting the var before running,
# e.g. `REPO_URL=... ./setup.sh 3`.
# ---------------------------------------------------------------------------
DOMAIN_API="${DOMAIN_API:-api.vybeshop.ir}"
DOMAIN_ADMIN="${DOMAIN_ADMIN:-admin.vybeshop.ir}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"
PROJECT_DIR="${PROJECT_DIR:-/opt/vybeshop}"
REPO_URL="${REPO_URL:-https://github.com/Alinadaf01/vybeshop.git}"
CERTBOT_EMAIL="${CERTBOT_EMAIL:-}"  # asked interactively in stage 6 if unset
SWAP_SIZE_GB="${SWAP_SIZE_GB:-2}"

COMPOSE_FILE="$PROJECT_DIR/docker-compose.prod.yml"
ENV_FILE="$PROJECT_DIR/.env.production"
INCOMING_DIR="$PROJECT_DIR/deploy/incoming"
BACKUPS_DIR="$PROJECT_DIR/deploy/backups"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
C_INFO='\033[1;36m'; C_WARN='\033[1;33m'; C_ERR='\033[1;31m'; C_OK='\033[1;32m'; C_RESET='\033[0m'

log()  { echo -e "${C_INFO}[INFO]${C_RESET} $*"; }
warn() { echo -e "${C_WARN}[WARN]${C_RESET} $*"; }
err()  { echo -e "${C_ERR}[ERROR]${C_RESET} $*" >&2; }
ok()   { echo -e "${C_OK}[OK]${C_RESET} $*"; }

announce() {
    echo
    echo -e "${C_INFO}────────────────────────────────────────────────────────${C_RESET}"
    echo -e "${C_INFO}$*${C_RESET}"
    echo -e "${C_INFO}────────────────────────────────────────────────────────${C_RESET}"
}

summary() {
    echo
    echo "===== STAGE $CURRENT_STAGE SUMMARY ====="
}

# Destructive-step confirmation. Skipped entirely with SETUP_YES=1 (useful
# for stage 8's read-only re-run, never set this for stages 1/5/6).
confirm() {
    local prompt="$1"
    if [[ "${SETUP_YES:-0}" == "1" ]]; then
        log "SETUP_YES=1 — auto-confirming: $prompt"
        return 0
    fi
    read -r -p "$prompt (yes/no) " reply
    if [[ "$reply" != "yes" ]]; then
        err "لغو شد توسط کاربر. اسکریپت متوقف می‌شود."
        exit 1
    fi
}

require_root() {
    if [[ "$(id -u)" -ne 0 ]]; then
        err "این مرحله باید با root اجرا شود (sudo ./setup.sh $CURRENT_STAGE)."
        exit 1
    fi
}

require_deploy_user() {
    if [[ "$(id -u)" -eq 0 ]]; then
        warn "این مرحله را با root اجرا می‌کنی. طبق DEPLOY-TASK.md، از این به بعد باید با کاربر $DEPLOY_USER کار کنی."
        warn "اگر تازه مرحله ۱ را تمام کردی، خارج شو و دوباره با کاربر $DEPLOY_USER وارد شو (ssh ${DEPLOY_USER}@<IP>) — عضویت در گروه docker فقط بعد از یک ورود تازه اعمال می‌شود."
        confirm "با این حال به‌عنوان root ادامه می‌دهی؟"
    fi
}

dc() {
    docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

require_project_dir() {
    if [[ ! -d "$PROJECT_DIR" ]]; then
        err "پوشه پروژه پیدا نشد: $PROJECT_DIR — اول مرحله ۳ را اجرا کن."
        exit 1
    fi
}

require_env_file() {
    if [[ ! -f "$ENV_FILE" ]]; then
        err "$ENV_FILE پیدا نشد — اول مرحله ۳ را اجرا کن."
        exit 1
    fi
}

# ---------------------------------------------------------------------------
# Stage 1 — server hardening
# ---------------------------------------------------------------------------
stage_1() {
    require_root
    announce "مرحله ۱: سخت‌سازی سرور — کاربر $DEPLOY_USER، فایروال (فقط ۲۲/۸۰/۴۴۳)، fail2ban، Asia/Tehran، سواپ ${SWAP_SIZE_GB}GB"

    if id -u "$DEPLOY_USER" &>/dev/null; then
        log "کاربر $DEPLOY_USER از قبل وجود دارد — رد شدن از ساخت کاربر."
    else
        log "ساخت کاربر $DEPLOY_USER..."
        adduser --disabled-password --gecos "" "$DEPLOY_USER"
        ok "کاربر $DEPLOY_USER ساخته شد (بدون رمز — فقط ورود با کلید SSH)."
    fi
    usermod -aG sudo "$DEPLOY_USER"
    # docker group may not exist yet (Docker not installed) — created in stage 2, group added there too if missing now.
    getent group docker &>/dev/null && usermod -aG docker "$DEPLOY_USER" || warn "گروه docker هنوز وجود ندارد — بعد از مرحله ۲ دوباره اضافه می‌شود."

    # Copy root's authorized_keys to the deploy user so whatever key you're
    # using right now to reach root also works for deploy — no new key needed.
    if [[ -f /root/.ssh/authorized_keys ]]; then
        mkdir -p "/home/$DEPLOY_USER/.ssh"
        if [[ ! -f "/home/$DEPLOY_USER/.ssh/authorized_keys" ]]; then
            cp /root/.ssh/authorized_keys "/home/$DEPLOY_USER/.ssh/authorized_keys"
            ok "کلید SSH از root به $DEPLOY_USER کپی شد."
        else
            log "authorized_keys برای $DEPLOY_USER از قبل وجود دارد — دست‌نخورده ماند."
        fi
        chown -R "$DEPLOY_USER:$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"
        chmod 700 "/home/$DEPLOY_USER/.ssh"
        chmod 600 "/home/$DEPLOY_USER/.ssh/authorized_keys"
    else
        warn "/root/.ssh/authorized_keys پیدا نشد — باید خودت کلید SSH کاربر $DEPLOY_USER را دستی اضافه کنی قبل از قطع دسترسی root."
    fi

    # Firewall
    if ! command -v ufw &>/dev/null; then
        log "نصب ufw..."
        apt-get update -qq && apt-get install -y -qq ufw
    fi
    ufw allow 22/tcp comment "SSH" || true
    ufw allow 80/tcp comment "HTTP" || true
    ufw allow 443/tcp comment "HTTPS" || true
    log "پورت‌های ۲۲/۸۰/۴۴۳ مجاز شدند. پورت‌های Postgres (۵۴۳۲) و Redis (۶۳۷۹) هرگز باز نمی‌شوند — فقط داخل شبکه داکلر در دسترس‌اند."

    # ufw's default FORWARD chain policy is DROP — irrelevant until Docker
    # exists (stage 2), but Docker routes every container's outbound traffic
    # through FORWARD, not OUTPUT (that's only for the host's own traffic).
    # With DROP still in place, `curl` on the host works fine while every
    # download *inside* a build (e.g. Playwright fetching Chromium) silently
    # times out — a two-hour rabbit hole the first time this was hit
    # (deploy/STAGE4-FIX-TASK.md). Fixing it here, before Docker is even
    # installed, means a fresh server never re-learns this the hard way.
    sed -i 's/^DEFAULT_FORWARD_POLICY=.*/DEFAULT_FORWARD_POLICY="ACCEPT"/' /etc/default/ufw
    ok "ufw FORWARD policy روی ACCEPT تنظیم شد (برای ترافیک خروجی کانتینرهای داکر)."

    if ufw status | grep -q "Status: active"; then
        log "ufw از قبل فعال است — reload تا FORWARD policy جدید اعمال شود..."
        ufw reload
    else
        confirm "فایروال الان فعال می‌شود (فقط ۲۲/۸۰/۴۴۳ باز می‌ماند). اگر همین الان با SSH وصلی و پورت ۲۲ باز است، امن است. ادامه می‌دهی؟"
        ufw --force enable
        ok "ufw فعال شد."
    fi

    # fail2ban
    if ! command -v fail2ban-client &>/dev/null; then
        log "نصب fail2ban..."
        apt-get update -qq && apt-get install -y -qq fail2ban
    fi
    systemctl enable --now fail2ban
    ok "fail2ban فعال است."

    # Timezone
    timedatectl set-timezone Asia/Tehran
    ok "منطقه زمانی: $(timedatectl show -p Timezone --value)"

    # Swap
    if swapon --show | grep -q .; then
        log "سواپ از قبل فعال است — رد شدن."
        swapon --show
    else
        log "ساخت فایل سواپ ${SWAP_SIZE_GB}GB..."
        fallocate -l "${SWAP_SIZE_GB}G" /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=$((SWAP_SIZE_GB * 1024))
        chmod 600 /swapfile
        mkswap /swapfile
        swapon /swapfile
        if ! grep -q "^/swapfile " /etc/fstab; then
            echo "/swapfile none swap sw 0 0" >>/etc/fstab
        fi
        ok "سواپ ${SWAP_SIZE_GB}GB فعال و در fstab ثبت شد."
    fi

    summary
    echo "کاربر deploy: $(id "$DEPLOY_USER" 2>&1 || echo 'ساخته نشد')"
    echo "ufw: $(ufw status | head -1)"
    echo "fail2ban: $(systemctl is-active fail2ban)"
    echo "timezone: $(timedatectl show -p Timezone --value)"
    echo "swap: $(swapon --show --noheadings | wc -l) دستگاه سواپ فعال"
    echo
    warn "الان از این سشن خارج شو و دوباره با «ssh ${DEPLOY_USER}@<IP سرور>» وارد شو، بعد مرحله ۲ را اجرا کن."
}

# ---------------------------------------------------------------------------
# Stage 2 — Docker install + health check
# ---------------------------------------------------------------------------
stage_2() {
    require_deploy_user
    announce "مرحله ۲: نصب Docker (اگر نیست) و بررسی سلامت"

    if command -v docker &>/dev/null && docker version &>/dev/null; then
        ok "Docker از قبل نصب و در دسترس است — رد شدن از نصب."
    else
        log "نصب Docker با اسکریپت رسمی..."
        curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
        sudo sh /tmp/get-docker.sh
        rm -f /tmp/get-docker.sh
        sudo usermod -aG docker "$USER"
        ok "Docker نصب شد."
        warn "اگر گروه docker همین الان اضافه شد، دوباره باید از این سشن خارج شوی و وارد شوی."
    fi

    sudo apt-get install -y -qq docker-compose-plugin 2>/dev/null || true

    # The link from this server to registries (GHCR/Docker Hub) has been
    # observed to be slow/unstable rather than blocked — TLS handshakes
    # sometimes take 7-11s when they'd take <1s to github.com itself.
    # Downloading every image layer in parallel (Docker's default) makes a
    # marginal connection much more likely to hit a timeout on *one* of them
    # and fail the whole pull. Capping to 1 is slower per-pull but far more
    # likely to actually finish (see deploy/STAGE4-FIX-TASK.md's retry logic
    # in stage 4, which exists for the same underlying reason).
    log "تنظیم max-concurrent-downloads=1 در /etc/docker/daemon.json..."
    sudo mkdir -p /etc/docker
    local needs_restart
    needs_restart=$(sudo python3 - <<'PYEOF'
import json, pathlib
path = pathlib.Path("/etc/docker/daemon.json")
data = {}
if path.exists() and path.stat().st_size > 0:
    try:
        data = json.loads(path.read_text())
    except json.JSONDecodeError:
        data = {}
if data.get("max-concurrent-downloads") == 1:
    print("no")
else:
    data["max-concurrent-downloads"] = 1
    path.write_text(json.dumps(data, indent=2) + "\n")
    print("yes")
PYEOF
)
    if [[ "$needs_restart" == "yes" ]]; then
        sudo systemctl restart docker
        ok "max-concurrent-downloads=1 تنظیم شد و Docker ری‌استارت شد."
    else
        log "max-concurrent-downloads از قبل روی ۱ بود — رد شدن."
    fi

    log "بررسی سلامت..."
    docker run --rm hello-world >/tmp/hello-world.log 2>&1 && ok "docker run سالم است." || {
        err "docker run hello-world شکست خورد. اگر خطای permission denied دیدی، از سشن خارج شو و دوباره وارد شو."
        cat /tmp/hello-world.log
        exit 1
    }
    docker compose version &>/dev/null && ok "docker compose (پلاگین v2) در دسترس است." || {
        err "docker compose پیدا نشد."
        exit 1
    }

    summary
    echo "docker: $(docker --version)"
    echo "docker compose: $(docker compose version --short 2>/dev/null || echo 'نامشخص')"
    echo "hello-world test: پاس"
    echo "max-concurrent-downloads: $(grep -o '"max-concurrent-downloads": *[0-9]*' /etc/docker/daemon.json 2>/dev/null || echo 'تنظیم نشد')"
}

# ---------------------------------------------------------------------------
# Stage 3 — clone repo, build .env.production
# ---------------------------------------------------------------------------
stage_3() {
    require_deploy_user
    announce "مرحله ۳: کلون ریپو در $PROJECT_DIR و ساخت .env.production"

    if [[ -d "$PROJECT_DIR/.git" ]]; then
        log "ریپو از قبل در $PROJECT_DIR کلون شده — git pull..."
        sudo git -C "$PROJECT_DIR" pull
    else
        log "کلون $REPO_URL به $PROJECT_DIR..."
        sudo mkdir -p "$PROJECT_DIR"
        sudo chown "$USER:$USER" "$PROJECT_DIR"
        git clone "$REPO_URL" "$PROJECT_DIR"
    fi
    ok "کد در $PROJECT_DIR آماده است ($(git -C "$PROJECT_DIR" rev-parse --short HEAD))."

    mkdir -p "$INCOMING_DIR" "$BACKUPS_DIR"

    if [[ -f "$ENV_FILE" ]]; then
        log "$ENV_FILE از قبل وجود دارد — رمزهای موجود دست‌نخورده می‌مانند (این مرحله هرگز رمز موجود را بازنویسی نمی‌کند)."
    else
        log "ساخت .env.production از روی .env.production.example با رمزهای تصادفی جدید..."
        cp "$PROJECT_DIR/.env.production.example" "$ENV_FILE"

        SECRET_KEY_VAL="$(openssl rand -base64 64 | tr -d '\n')"
        JWT_KEY_VAL="$(openssl rand -base64 64 | tr -d '\n')"
        FERNET_KEY_VAL="$(openssl rand -base64 32 | tr '+/' '-_')"
        PG_PASS_VAL="$(openssl rand -hex 24)"

        # sed -i with '|' delimiter — the values above never contain '|'.
        sed -i "s|^SECRET_KEY=.*|SECRET_KEY=${SECRET_KEY_VAL}|" "$ENV_FILE"
        sed -i "s|^JWT_SIGNING_KEY=.*|JWT_SIGNING_KEY=${JWT_KEY_VAL}|" "$ENV_FILE"
        sed -i "s|^FIELD_ENCRYPTION_KEY=.*|FIELD_ENCRYPTION_KEY=${FERNET_KEY_VAL}|" "$ENV_FILE"
        sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=${PG_PASS_VAL}|" "$ENV_FILE"
        sed -i "s|^DATABASE_URL=.*|DATABASE_URL=postgres://vybeshop:${PG_PASS_VAL}@db:5432/vybeshop|" "$ENV_FILE"

        chmod 600 "$ENV_FILE"
        ok ".env.production ساخته شد با رمزهای تصادفی."
        warn "FIELD_ENCRYPTION_KEY را همین الان یک‌جای دیگر (خارج از سرور) بک‌آپ بگیر — گمشدنش یعنی کلیدهای کاوه‌نگار/زرین‌پال ذخیره‌شده دیگر قابل خواندن نیستند:"
        echo "    FIELD_ENCRYPTION_KEY=${FERNET_KEY_VAL}"
    fi

    summary
    echo "پروژه: $PROJECT_DIR (commit $(git -C "$PROJECT_DIR" rev-parse --short HEAD))"
    echo ".env.production: $([ -f "$ENV_FILE" ] && echo 'موجود' || echo 'ساخته نشد!')"
    echo "پوشه‌های آماده برای مرحله ۵: $INCOMING_DIR"
}

# ---------------------------------------------------------------------------
# Stage 4 — build admin panel + bring services up
# ---------------------------------------------------------------------------
stage_4() {
    require_deploy_user
    require_project_dir
    require_env_file
    announce "مرحله ۴: بیلد پنل ادمین، pull ایمیج بک‌اند از Docker Hub، و بالا آوردن سرویس‌ها"

    if ! command -v node &>/dev/null || ! command -v npm &>/dev/null; then
        err "Node.js/npm روی این سرور نصب نیست — بیلد پنل ادمین به آن نیاز دارد."
        err "نصب کن (Node 22 LTS از NodeSource) و دوباره همین مرحله را اجرا کن:"
        err "  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -"
        err "  sudo apt-get install -y nodejs"
        exit 1
    fi

    log "بیلد پنل ادمین..."
    (
        cd "$PROJECT_DIR/admin"
        npm ci --silent
        VITE_ADMIN_API_BASE_URL="https://${DOMAIN_ADMIN}/api/admin" npm run build
    )
    ok "admin/dist ساخته شد."

    # backend/web, celery-worker, celery-beat are NOT built on this server —
    # `playwright install --with-deps chromium` inside backend/Dockerfile
    # downloads Chromium from cdn.playwright.dev, which geoblocks Iranian
    # IPs with a 403 (confirmed deliberate, not a local network/firewall
    # issue — see deploy/STAGE4-FIX-TASK.md). The image is built on GitHub
    # Actions instead (.github/workflows/build-backend-image.yml) and pushed
    # to Docker Hub; this server only ever pulls it. (GHCR was tried first —
    # behind Fastly, it was consistently unreachable from here with TLS
    # handshake timeouts, even with retries. Docker Hub works reliably.)
    set -a; source "$ENV_FILE"; set +a
    if [[ -z "${DOCKERHUB_TOKEN:-}" ]] || [[ -z "${DOCKERHUB_USER:-}" ]]; then
        err "DOCKERHUB_TOKEN و DOCKERHUB_USER در .env.production خالی‌اند — بدون این‌ها نمی‌شود ایمیج خصوصی را از Docker Hub کشید."
        err "یک Docker Hub Access Token با دسترسی فقط read-only بساز و در .env.production بگذار."
        exit 1
    fi
    # The link from this server to a registry has been observed to be
    # slow/unstable rather than blocked — plain TLS handshakes sometimes
    # take 7-11s when github.com itself is sub-second. Retrying with backoff
    # turns "occasionally times out" into "occasionally slow", which is the
    # actual situation. Login and pull are retried SEPARATELY — login can
    # succeed on attempt 1 while the pull that follows times out on attempt
    # 3, and conflating them would restart from the wrong step.
    local retry_delays=(10 20 30 45)

    log "ورود به Docker Hub (تا ۵ تلاش — لینک ایران به رجیستری‌ها گاهی کند/ناپایدار است، نه بلاک‌شده)..."
    local login_ok=0
    for attempt in 1 2 3 4 5; do
        if echo "$DOCKERHUB_TOKEN" | docker login -u "$DOCKERHUB_USER" --password-stdin; then
            login_ok=1
            break
        fi
        if [[ $attempt -lt 5 ]]; then
            local delay="${retry_delays[$((attempt - 1))]}"
            warn "ورود به Docker Hub — تلاش $attempt از ۵ شکست خورد (شبکه کند/ناپایدار، نه لزوماً خطای واقعی). ${delay} ثانیه صبر و تلاش دوباره — این یعنی در حال تلاش است، هنگ نکرده."
            sleep "$delay"
        fi
    done
    if [[ $login_ok -ne 1 ]]; then
        err "بعد از ۵ تلاش، ورود به Docker Hub موفق نشد."
        err "شبکه به Docker Hub ناپایدار است — چند دقیقه بعد دوباره ./setup.sh 4 را بزنید."
        exit 1
    fi
    ok "ورود به Docker Hub موفق بود."

    log "کشیدن ایمیج بک‌اند (تگ: ${BACKEND_IMAGE_TAG:-latest}) — تا ۵ تلاش..."
    local pull_ok=0
    for attempt in 1 2 3 4 5; do
        if dc pull; then
            pull_ok=1
            break
        fi
        if [[ $attempt -lt 5 ]]; then
            local delay="${retry_delays[$((attempt - 1))]}"
            warn "کشیدن ایمیج — تلاش $attempt از ۵ شکست خورد (شبکه کند/ناپایدار، نه لزوماً خطای واقعی). ${delay} ثانیه صبر و تلاش دوباره — این یعنی در حال تلاش است، هنگ نکرده."
            sleep "$delay"
        fi
    done
    if [[ $pull_ok -ne 1 ]]; then
        err "بعد از ۵ تلاش، کشیدن ایمیج از Docker Hub موفق نشد."
        err "شبکه به Docker Hub ناپایدار است — چند دقیقه بعد دوباره ./setup.sh 4 را بزنید."
        exit 1
    fi
    ok "ایمیج کشیده شد."

    # nginx is deliberately NOT started here. nginx.conf requires SSL certs
    # under /etc/letsencrypt/live/${DOMAIN_API}/ that don't exist until
    # stage 6 runs (which handles the cert chicken-and-egg problem itself,
    # by temporarily swapping in nginx.bootstrap.conf before ever starting
    # nginx for the first time). Starting nginx here would just crash-loop
    # it until stage 6 fixes the config -- confirmed live.
    log "بالا آوردن سرویس‌ها (db, redis, web, celery-worker, celery-beat — nginx در مرحله ۶ بالا می‌آید)..."
    dc up -d --remove-orphans db redis web celery-worker celery-beat

    # A brand-new named volume has no pre-existing content in the image to
    # copy ownership from on first mount, so Docker creates the mountpoint
    # as root -- but web/celery run as the non-root `vybe` user (Dockerfile),
    # so collectstatic/media writes fail with PermissionError until this
    # runs. A no-op on every run after the first (chown is idempotent).
    log "تنظیم مالکیت volume های static/media برای کاربر غیر-root ایمیج (uid 1000)..."
    docker run --rm -v vybe_static:/static -v vybe_media:/media alpine chown -R 1000:1000 /static /media
    dc restart web >/dev/null

    log "منتظر سالم شدن سرویس‌ها (تا ۹۰ ثانیه)..."
    for i in $(seq 1 18); do
        if dc ps web 2>/dev/null | grep -q "healthy"; then
            break
        fi
        sleep 5
    done
    dc ps

    summary
    echo "منبع ایمیج بک‌اند: $(docker inspect --format '{{.Config.Image}}' "$(dc ps -q web)" 2>/dev/null || echo 'نامشخص') (باید ${DOCKERHUB_USER:-<کاربر>}/vybeshop-backend باشد، نه یک بیلد محلی)"
    dc ps
    echo
    echo "لاگ آخر web (اگر خطا هست همین‌جا دیده می‌شود):"
    dc logs --tail=20 web
    echo
    echo "توجه: nginx عمداً بالا نیامد — گواهی SSL هنوز نیست. مرحله ۶ آن را بالا می‌آورد."
}

# ---------------------------------------------------------------------------
# Stage 5 — data migration (most sensitive stage)
# ---------------------------------------------------------------------------
stage_5() {
    require_deploy_user
    require_project_dir
    require_env_file
    announce "مرحله ۵: انتقال دیتابیس و media از دستگاه توسعه — حساس‌ترین مرحله"

    local db_dump="$INCOMING_DIR/db.dump"
    local media_tarball="$INCOMING_DIR/media.tar.gz"

    if [[ ! -f "$db_dump" ]]; then
        err "پیدا نشد: $db_dump — طبق RUNBOOK.md اول باید دامپ را از دستگاه خودت اینجا آپلود کنی."
        exit 1
    fi
    if [[ ! -f "$media_tarball" ]]; then
        err "پیدا نشد: $media_tarball — طبق RUNBOOK.md اول باید پوشه media را از دستگاه خودت اینجا آپلود کنی."
        exit 1
    fi
    ok "هر دو فایل پیدا شدند: $(du -h "$db_dump" | cut -f1) دامپ، $(du -h "$media_tarball" | cut -f1) media."

    # shellcheck source=/dev/null
    set -a; source "$ENV_FILE"; set +a

    warn "این مرحله دیتابیس فعلی سرور را با محتوای $db_dump جایگزین می‌کند."
    warn "قبل از هر کاری، یک بک‌آپ کامل از دیتابیس فعلی سرور گرفته می‌شود تا اگر چیزی خراب شد برگردیم."
    confirm "ادامه می‌دهی؟"

    mkdir -p "$BACKUPS_DIR"
    local pre_backup="$BACKUPS_DIR/pre-migration-$(date +%Y%m%d-%H%M%S).dump"
    log "گرفتن بک‌آپ پیش از انتقال: $pre_backup"
    dc exec -T db pg_dump -U "${POSTGRES_USER:-vybeshop}" -Fc "${POSTGRES_DB:-vybeshop}" >"$pre_backup"
    ok "بک‌آپ پیش از انتقال آماده شد ($(du -h "$pre_backup" | cut -f1))."

    log "بازیابی دامپ جدید..."
    set +e
    cat "$db_dump" | dc exec -T db pg_restore -U "${POSTGRES_USER:-vybeshop}" -d "${POSTGRES_DB:-vybeshop}" \
        --clean --if-exists --no-owner --no-privileges --single-transaction
    local restore_status=$?
    set -e

    if [[ $restore_status -ne 0 ]]; then
        err "بازیابی شکست خورد (کد خروج $restore_status). برگرداندن به وضعیت قبل از انتقال..."
        set +e
        cat "$pre_backup" | dc exec -T db pg_restore -U "${POSTGRES_USER:-vybeshop}" -d "${POSTGRES_DB:-vybeshop}" \
            --clean --if-exists --no-owner --no-privileges --single-transaction
        local rollback_status=$?
        set -e
        if [[ $rollback_status -ne 0 ]]; then
            err "برگرداندن هم شکست خورد! دیتابیس ممکن است الان در وضعیت نامشخصی باشد."
            err "فایل بک‌آپ دستی هنوز سالم است: $pre_backup — همین الان متوقف شو و دستی وضعیت دیتابیس را بررسی کن، بیشتر ادامه نده."
            exit 1
        fi
        err "به وضعیت قبل از انتقال برگشت. فایل $db_dump را بررسی کن (فرمت درست: pg_dump -Fc) و دوباره تلاش کن."
        exit 1
    fi
    ok "بازیابی دیتابیس موفق بود."

    log "استخراج media به داخل volume..."
    docker run --rm \
        -v vybe_media:/media \
        -v "$INCOMING_DIR":/incoming:ro \
        alpine sh -c "tar xzf /incoming/media.tar.gz -C /media"
    ok "media استخراج شد."

    log "اجرای مجدد migrate (بی‌اثر اگر همه چیز از قبل اعمال شده)..."
    dc exec -T web python manage.py migrate --noinput

    log "ری‌استارت web تا اتصال‌های دیتابیس تازه شوند..."
    dc restart web

    log "بررسی: چند محصول در دیتابیس هست..."
    local product_count
    product_count="$(dc exec -T web python manage.py shell -c "from apps.catalog.models import Product; print(Product.objects.count())" | tail -1)"
    local blog_count
    blog_count="$(dc exec -T web python manage.py shell -c "from apps.content.models import BlogPost; print(BlogPost.objects.count())" | tail -1)"

    log "بررسی اینکه حداقل یک تصویر واقعی دیده می‌شود (نه فقط رکورد در دیتابیس)..."
    local sample_url
    sample_url="$(dc exec -T web python manage.py shell -c "
from apps.catalog.models import ProductImage
img = ProductImage.objects.exclude(image='').first()
print(img.image.url if img else '')
" | tail -1)"
    local image_check="رد شد (هیچ تصویر آپلودشده‌ای پیدا نشد)"
    if [[ -n "$sample_url" ]]; then
        if dc exec -T web curl -sf "http://localhost:8000${sample_url}" -o /dev/null; then
            image_check="پاس — $sample_url با موفقیت لود شد"
        else
            image_check="⚠️ رکورد تصویر هست ولی فایل $sample_url لود نشد — پوشه media درست منتقل نشده"
        fi
    fi

    summary
    echo "بک‌آپ پیش از انتقال: $pre_backup"
    echo "تعداد محصولات: $product_count"
    echo "تعداد مقالات بلاگ: $blog_count"
    echo "تست تصویر واقعی: $image_check"
    echo
    warn "همین الان چند محصول را از پنل ادمین (بعد از مرحله ۶) دستی چک کن که عکس‌هایشان واقعاً دیده می‌شود."
}

# ---------------------------------------------------------------------------
# Stage 6 — SSL via Certbot
# ---------------------------------------------------------------------------
stage_6() {
    require_deploy_user
    require_project_dir
    require_env_file
    announce "مرحله ۶: گواهی SSL با Certbot برای $DOMAIN_API و $DOMAIN_ADMIN"

    mkdir -p "$PROJECT_DIR/certbot/conf" "$PROJECT_DIR/certbot/www"
    local cert_path_in_volume="/etc/letsencrypt/live/${DOMAIN_API}/fullchain.pem"

    # Certbot creates certbot/conf/live and /archive as root-owned, mode
    # 0700 (it protects private key material this way by design) -- but
    # this whole script runs as the unprivileged `deploy` user, which
    # can't even stat inside that directory. A host-side `[[ -f ... ]]`
    # silently reads as "not found" on a permission-denied path, so this
    # always took the "no cert yet" branch and hit certbot's interactive
    # "renew anyway?" prompt with no stdin -- confirmed live, forever
    # broken on every run after the first. Checking from inside a
    # container (which mounts the volume with root's own view of it)
    # sidesteps the host-permission mismatch entirely.
    if docker run --rm -v "$PROJECT_DIR/certbot/conf:/etc/letsencrypt:ro" alpine test -f "$cert_path_in_volume"; then
        log "گواهی از قبل وجود دارد — تلاش برای تمدید (بی‌اثر اگر هنوز زود است)..."
        docker run --rm \
            -v "$PROJECT_DIR/certbot/conf:/etc/letsencrypt" \
            -v "$PROJECT_DIR/certbot/www:/var/www/certbot" \
            certbot/certbot renew --webroot -w /var/www/certbot
        dc restart nginx
        ok "بررسی تمدید انجام شد."
    else
        if [[ -z "$CERTBOT_EMAIL" ]]; then
            read -r -p "ایمیل واقعی برای Let's Encrypt (اعلان انقضای گواهی): " CERTBOT_EMAIL
        fi
        confirm "گواهی جدید برای $DOMAIN_API و $DOMAIN_ADMIN گرفته می‌شود. مطمئنی رکوردهای DNS هر دو دامنه به IP همین سرور اشاره می‌کنند؟"

        log "بالا آوردن Nginx با پیکربندی موقت (فقط HTTP) برای چالش ACME..."
        cp "$PROJECT_DIR/nginx/nginx.conf" "$PROJECT_DIR/nginx/nginx.conf.bak"
        cp "$PROJECT_DIR/nginx/nginx.bootstrap.conf" "$PROJECT_DIR/nginx/nginx.conf"
        dc up -d nginx
        sleep 3

        log "درخواست گواهی..."
        set +e
        docker run --rm \
            -v "$PROJECT_DIR/certbot/conf:/etc/letsencrypt" \
            -v "$PROJECT_DIR/certbot/www:/var/www/certbot" \
            certbot/certbot certonly --webroot -w /var/www/certbot \
            -d "$DOMAIN_API" -d "$DOMAIN_ADMIN" \
            --email "$CERTBOT_EMAIL" --agree-tos --no-eff-email
        local certbot_status=$?
        set -e

        log "برگرداندن پیکربندی کامل Nginx (با بلوک‌های HTTPS)..."
        mv "$PROJECT_DIR/nginx/nginx.conf.bak" "$PROJECT_DIR/nginx/nginx.conf"

        # `dc up -d` is a no-op here -- nginx is already running (started
        # above for the ACME challenge) and Compose only recreates a
        # container when the *service definition* changes, not when a
        # bind-mounted file's content changes on disk. Without a real
        # restart, nginx keeps serving the bootstrap config from memory
        # indefinitely (confirmed live: port 443 refused connections and
        # port 80 kept serving the bootstrap's placeholder response to
        # every path, including scanner probes, until restarted).
        if [[ $certbot_status -ne 0 ]]; then
            err "گرفتن گواهی شکست خورد. DNS و پورت ۸۰ را بررسی کن و دوباره مرحله ۶ را اجرا کن."
            dc restart nginx || true
            exit 1
        fi
        ok "گواهی گرفته شد."
        dc restart nginx
    fi

    log "تست HTTPS..."
    sleep 5
    if curl -sf "https://${DOMAIN_API}/api/settings/" -o /dev/null; then
        ok "https://${DOMAIN_API}/api/settings/ پاسخ ۲۰۰ داد."
    else
        warn "هنوز پاسخ درستی از https://${DOMAIN_API} نگرفتم — چند ثانیه صبر کن و دستی چک کن."
    fi

    log "تنظیم تمدید خودکار (cron هفتگی)..."
    local renew_cron="0 3 * * 0 cd $PROJECT_DIR && docker run --rm -v $PROJECT_DIR/certbot/conf:/etc/letsencrypt -v $PROJECT_DIR/certbot/www:/var/www/certbot certbot/certbot renew --webroot -w /var/www/certbot -q && docker compose --env-file $ENV_FILE -f $COMPOSE_FILE restart nginx"
    # `grep -v` exits 1 when nothing survives the filter -- the normal case
    # on a fresh crontab with no prior entry -- which under set -e+pipefail
    # aborted this whole line before `echo` ever ran, so the cron job was
    # silently never installed (confirmed live: crontab -l came back empty
    # after a "successful" stage 6 run). `|| true` makes "no prior entry"
    # a non-error, same as it always was meant to be.
    (crontab -l 2>/dev/null | grep -vF "certbot/certbot renew" || true; echo "$renew_cron") | crontab -
    ok "cron تمدید گواهی هفتگی (یکشنبه ساعت ۳ صبح) تنظیم شد."

    summary
    echo "وضعیت گواهی:"
    # `certificates` always wants to write its lock file directly inside
    # --config-dir, no matter what --work-dir/--logs-dir are set to -- so
    # a :ro mount can never satisfy it (confirmed live). Not mounting :ro
    # here is fine: this is an ephemeral --rm container that only reports
    # status, same trust level as every other certbot/certbot invocation
    # in this script.
    docker run --rm -v "$PROJECT_DIR/certbot/conf:/etc/letsencrypt" certbot/certbot \
        certificates 2>/dev/null | grep -A2 "Certificate Name" || echo "پیدا نشد"
    echo "تست HTTPS api: $(curl -sf "https://${DOMAIN_API}/api/settings/" -o /dev/null && echo پاس || echo 'رد شد — دستی چک کن')"
    echo "تست HTTPS admin: $(curl -sf "https://${DOMAIN_ADMIN}/" -o /dev/null && echo پاس || echo 'رد شد — دستی چک کن')"
    echo "cron تمدید: نصب شد (crontab -l برای دیدن)"
}

# ---------------------------------------------------------------------------
# Stage 7 — automatic backups + cron
# ---------------------------------------------------------------------------
stage_7() {
    require_deploy_user
    require_project_dir
    require_env_file
    announce "مرحله ۷: بک‌آپ خودکار روزانه + cron"

    chmod +x "$PROJECT_DIR/deploy/backup.sh"

    log "اجرای یک بک‌آپ آزمایشی الان..."
    "$PROJECT_DIR/deploy/backup.sh"

    local latest_dump
    latest_dump="$(ls -t "$BACKUPS_DIR"/daily-*.dump.gz 2>/dev/null | head -1)"
    if [[ -z "$latest_dump" ]]; then
        err "بک‌آپ آزمایشی فایلی نساخت — قبل از ادامه به مرحله ۸، خروجی deploy/backup.sh را بررسی کن."
        exit 1
    fi
    ok "بک‌آپ آزمایشی ساخته شد: $latest_dump ($(du -h "$latest_dump" | cut -f1))"

    log "تست واقعی بازیابی — در یک دیتابیس موقت جدا، نه دیتابیس اصلی..."
    set -a; source "$ENV_FILE"; set +a
    dc exec -T db psql -U "${POSTGRES_USER:-vybeshop}" -c "DROP DATABASE IF EXISTS restore_test;" postgres
    dc exec -T db psql -U "${POSTGRES_USER:-vybeshop}" -c "CREATE DATABASE restore_test;" postgres
    set +e
    gunzip -c "$latest_dump" | dc exec -T db pg_restore -U "${POSTGRES_USER:-vybeshop}" -d restore_test --no-owner --no-privileges
    local test_restore_status=$?
    set -e
    local table_count
    table_count="$(dc exec -T db psql -U "${POSTGRES_USER:-vybeshop}" -d restore_test -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';")"
    dc exec -T db psql -U "${POSTGRES_USER:-vybeshop}" -c "DROP DATABASE restore_test;" postgres

    if [[ $test_restore_status -ne 0 ]] || [[ "${table_count//[[:space:]]/}" -lt 1 ]]; then
        err "تست بازیابی شکست خورد — این بک‌آپ قابل‌اعتماد نیست. دیتابیس اصلی دست‌نخورده ماند (فقط در restore_test موقت تست شد)."
        exit 1
    fi
    ok "تست بازیابی موفق بود — $table_count جدول در دیتابیس آزمایشی ساخته شد."

    log "تنظیم cron روزانه (۴ صبح به وقت تهران)..."
    local backup_cron="0 4 * * * $PROJECT_DIR/deploy/backup.sh >> $PROJECT_DIR/deploy/backup.log 2>&1"
    # Same grep-exits-1-on-empty-input pitfall as stage 6's cron line (see
    # comment there) -- `|| true` so a fresh crontab with no prior entry
    # doesn't abort this line under set -e+pipefail before echo runs.
    (crontab -l 2>/dev/null | grep -vF "deploy/backup.sh" || true; echo "$backup_cron") | crontab -
    ok "cron بک‌آپ روزانه تنظیم شد."

    if [[ -z "${BACKUP_S3_BUCKET:-}" ]]; then
        warn "BACKUP_S3_BUCKET در .env.production تنظیم نشده — بک‌آپ فقط محلی روی همین سرور ذخیره می‌شود، نه یک فضای جدا. طبق DEPLOY-TASK.md بخش د، این باید یک باکت Object Storage جدا باشد."
    fi

    summary
    echo "بک‌آپ آزمایشی: $latest_dump"
    echo "تست بازیابی: پاس ($table_count جدول)"
    echo "cron روزانه: نصب شد (۴ صبح تهران)"
    echo "آپلود خارج از سرور: $([ -n "${BACKUP_S3_BUCKET:-}" ] && echo 'تنظیم شده' || echo '⚠️ تنظیم نشده — به من بگو تا کمکت کنم')"
}

# ---------------------------------------------------------------------------
# Stage 8 — final check + status report
# ---------------------------------------------------------------------------
stage_8() {
    require_deploy_user
    require_project_dir
    require_env_file
    announce "مرحله ۸: بررسی نهایی و گزارش وضعیت"

    set -a; source "$ENV_FILE"; set +a
    local pass=0 fail=0
    local report=""

    check() {
        local label="$1"; shift
        if "$@" &>/tmp/check.log; then
            report+="✅ $label"$'\n'
            pass=$((pass + 1))
        else
            report+="❌ $label — جزئیات: $(tail -3 /tmp/check.log | tr '\n' ' ')"$'\n'
            fail=$((fail + 1))
        fi
    }

    # bash -c below spawns a fresh bash process that does NOT inherit the
    # `dc` shell function or unexported vars from this script, so every
    # command inside is fully inlined (docker compose ... directly) rather
    # than relying on `dc`.
    check "admin.vybeshop.ir با HTTPS بالا می‌آید" curl -sf "https://${DOMAIN_ADMIN}/" -o /dev/null
    check "api.vybeshop.ir/api/products/ پاسخ می‌دهد" curl -sf "https://${DOMAIN_API}/api/products/" -o /dev/null
    check "مسیر کلاینت‌ساید /login در پنل ادمین مستقیم لود می‌شود (نه ۴۰۴)" curl -sf "https://${DOMAIN_ADMIN}/login" -o /dev/null
    check "صفحه ناموجود روی admin ۴۰۴ واقعی نشان می‌دهد" bash -c "[[ \$(curl -s -o /dev/null -w '%{http_code}' 'https://${DOMAIN_ADMIN}/a-totally-wrong-path') == 200 ]]"
    check "استاتیک با هدر کش سرو می‌شود" bash -c "curl -sI 'https://${DOMAIN_API}/static/admin/css/base.css' | grep -qi 'cache-control'"
    check "Celery worker در حال اجراست" bash -c "docker compose --env-file '$ENV_FILE' -f '$COMPOSE_FILE' ps celery-worker | grep -q 'Up'"
    check "Celery beat در حال اجراست" bash -c "docker compose --env-file '$ENV_FILE' -f '$COMPOSE_FILE' ps celery-beat | grep -q 'Up'"
    check "DEBUG واقعاً False است (بدون traceback روی خطا)" bash -c "! curl -s 'https://${DOMAIN_API}/api/a-wrong-endpoint-xyz/' | grep -qi traceback"
    check "هدرهای امنیتی/HSTS فعال‌اند" bash -c "curl -sI 'https://${DOMAIN_API}/api/products/' | grep -qi 'strict-transport-security'"
    check "Chromium داخل کانتینر بالا می‌آید (پیش‌نیاز تولید PDF)" dc exec -T web python -c "from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch()
    b.close()"

    echo "$report"

    log "چک کردن لاگ‌ها برای خطای تکراری (۵۰ خط آخر web)..."
    dc logs --tail=50 web | grep -i "error\|traceback" | tail -10 || log "خطای واضحی در لاگ اخیر دیده نشد."

    log "نرخ‌محدودسازی OTP — چند بار پشت‌هم درخواست می‌زنم، باید یک‌جا ۴۲۹ بگیرم..."
    # Every [[ ]] test below is inside an explicit if — under `set -e`, a
    # bare `[[ cond ]] && action` as a standalone statement aborts the whole
    # script the moment cond is false, which for a loop like this means it
    # would exit on the very first non-429 response (i.e. always).
    local rate_limited="no"
    for i in $(seq 1 8); do
        code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "https://${DOMAIN_API}/api/auth/otp/request/" \
            -H "Content-Type: application/json" -d '{"phone":"09120000000"}')
        if [[ "$code" == "429" ]]; then
            rate_limited="yes ($i درخواست)"
            break
        fi
    done
    if [[ "$rate_limited" == "no" ]]; then
        report+="⚠️ rate limit روی OTP بعد از ۸ درخواست پشت‌هم فعال نشد — دستی بررسی کن"$'\n'
    fi

    summary
    echo "$report"
    echo "rate limit OTP: $rate_limited"
    echo
    echo "نتیجه کلی: $pass پاس، $fail رد شد"
    echo
    echo "چک‌های دستی باقی‌مانده (این‌ها را از پنل واقعی امتحان کن، نه از این اسکریپت):"
    echo "  — یک PDF فاکتور واقعی از یک سفارش واقعی بگیر و باز کن"
    echo "  — یک خروجی اکسل واقعی بگیر و باز کن"
    echo "  — فروشگاه روی Vercel با VITE_API_BASE_URL جدید واقعاً به این بک‌اند وصل است (از تب Network چک کن، نه ظاهر صفحه)"
    echo "  — یک بار سرور را کامل ریستارت کن (sudo reboot) و بعد از بالا آمدن دوباره همین مرحله ۸ را اجرا کن تا مطمئن شوی همه‌چیز خودکار بالا آمده"

    if [[ $fail -gt 0 ]]; then
        exit 1
    fi
}

# ---------------------------------------------------------------------------
# Dispatcher
# ---------------------------------------------------------------------------
usage() {
    cat <<EOF
استفاده: $0 <شماره مرحله ۱ تا ۸>

  1  سخت‌سازی سرور (کاربر deploy، فایروال، fail2ban، timezone، سواپ) — نیاز به root
  2  نصب Docker + بررسی سلامت
  3  کلون ریپو + ساخت .env.production
  4  بیلد پنل ادمین + بالا آوردن سرویس‌ها
  5  انتقال دیتابیس و media (حساس‌ترین مرحله)
  6  SSL با Certbot
  7  بک‌آپ خودکار + cron
  8  بررسی نهایی و گزارش

جزئیات کامل هر مرحله: deploy/RUNBOOK.md
EOF
}

if [[ $# -ne 1 ]]; then
    usage
    exit 1
fi

CURRENT_STAGE="$1"
case "$CURRENT_STAGE" in
    1) stage_1 ;;
    2) stage_2 ;;
    3) stage_3 ;;
    4) stage_4 ;;
    5) stage_5 ;;
    6) stage_6 ;;
    7) stage_7 ;;
    8) stage_8 ;;
    *) usage; exit 1 ;;
esac

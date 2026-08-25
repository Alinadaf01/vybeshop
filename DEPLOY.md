# راهنمای دیپلوی — VYBE

> ⚠️ **این سند پیش از تصمیم معماری Option B نوشته شده و دستورات دستی‌اش فرض می‌کند فروشگاه هم روی همین سرور سرو می‌شود.** طبق `DEPLOY-TASK.md`، فروشگاه روی Vercel می‌ماند و فقط `api.vybeshop.ir` و `admin.vybeshop.ir` به این سرور می‌آیند — `nginx/nginx.conf`، `docker-compose.prod.yml` و `.env.production.example` قبلاً مطابق همین معماری به‌روز شده‌اند. برای اجرای واقعی از **`deploy/RUNBOOK.md`** و `deploy/setup.sh` استفاده کن، نه دستورات دستی زیر — این‌ها فقط برای زمینه/پس‌زمینه نگه داشته شده‌اند.

این سند مراحل واقعی انتشار سایت روی سرور را قدم‌به‌قدم توضیح می‌دهد. تا اینجا فقط فایل‌های لازم (Dockerfile، docker-compose.prod.yml، nginx.conf، `.env.production.example`) آماده شده‌اند — **این مراحل هنوز اجرا نشده‌اند.**

پیش‌نیاز: یک سرور (VPS) با Docker و Docker Compose نصب‌شده، و دامنه‌ای که رکورد A آن به IP سرور اشاره کند (برای `vybeshop.ir`، `www.vybeshop.ir` و `admin.vybeshop.ir`).

---

## ۱. آماده‌سازی کد روی سرور

```bash
git clone <آدرس ریپازیتوری> vybeshop
cd vybeshop
```

## ۲. ساخت خروجی فرانت‌اند (استاتیک)

فرانت‌اند‌ها داخل Docker ساخته نمی‌شوند — خروجی `dist/` آن‌ها مستقیم توسط Nginx سرو می‌شود. باید قبل از بالا آوردن کانتینرها ساخته شوند:

```bash
# فروشگاه
npm ci
VITE_SITE_URL=https://vybeshop.ir VITE_API_BASE_URL=https://vybeshop.ir/api npm run build

# پنل ادمین
cd admin
npm ci
VITE_ADMIN_API_BASE_URL=https://admin.vybeshop.ir/api/admin npm run build
cd ..
```

نتیجه: `dist/` (ریشه پروژه) و `admin/dist/` — دقیقاً همان پوشه‌هایی که `docker-compose.prod.yml` به Nginx مونت می‌کند.

## ۳. متغیرهای محیطی

```bash
cp .env.production.example .env.production
```

مقادیر زیر را حتماً واقعی کن (توضیح هرکدام داخل خود فایل است):

- `SECRET_KEY` و `JWT_SIGNING_KEY` — با دستور پیشنهادشده در فایل تولید کن (دو مقدار جدا، هرکدام یک‌بار).
- `FIELD_ENCRYPTION_KEY` — با دستور Fernet در فایل تولید کن. **جایی خارج از سرور هم بک‌آپ بگیر** — گم‌شدنش یعنی کلیدهای کاوه‌نگار/زرین‌پال ذخیره‌شده در دیتابیس دیگر قابل خواندن نیستند.
- `POSTGRES_PASSWORD` و `DATABASE_URL` (باید هم‌خوان باشند).
- `ALLOWED_HOSTS` و `CORS_ALLOWED_ORIGINS` — اگر دامنه فرق دارد، این‌ها را عوض کن، نه فقط `nginx/nginx.conf` را.

اگر دامنه واقعی با `vybeshop.ir` فرق دارد، همین حالا در سه جا هم‌زمان عوضش کن: `.env.production`، `nginx/nginx.conf` (`server_name` در هر سه بلوک + مسیر گواهی SSL)، و دستورات بخش ۲ بالا.

## ۴. گواهی SSL (Let's Encrypt) — راه‌اندازی دو مرحله‌ای

`nginx/nginx.conf` فرض می‌کند گواهی SSL از قبل در `./certbot/conf/live/vybeshop.ir/` وجود دارد — ولی برای گرفتن آن گواهی، Certbot به یک Nginx در حال اجرا روی پورت ۸۰ نیاز دارد. این تناقض مرغ‌و‌تخم‌مرغ را با یک پیکربندی موقت حل کن:

```bash
mkdir -p certbot/conf certbot/www

# یک nginx.conf موقت فقط با بلوک HTTP (بدون بلوک‌های SSL) بساز و بالا بیار،
# یا موقتاً بلوک‌های 443 را از nginx/nginx.conf کامنت کن و:
docker compose --env-file .env.production -f docker-compose.prod.yml up -d nginx

docker run --rm \
  -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
  -v "$(pwd)/certbot/www:/var/www/certbot" \
  certbot/certbot certonly --webroot -w /var/www/certbot \
  -d vybeshop.ir -d www.vybeshop.ir -d admin.vybeshop.ir \
  --email <ایمیل واقعی> --agree-tos --no-eff-email

# حالا بلوک‌های 443 را در nginx/nginx.conf برگردان (یا نسخه کامل را جایگزین کن)
docker compose --env-file .env.production -f docker-compose.prod.yml restart nginx
```

تمدید گواهی هر ۹۰ روز لازم است — یک cron job سمت سرور که همان دستور `certbot renew` را اجرا و Nginx را reload کند کافی است (جزئیات بیرون از دامنه این تسک است، ولی فراموش نشود).

## ۵. بالا آوردن سرویس‌ها

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

این کار Postgres، Redis، بک‌اند Django (که خودش قبل از gunicorn دستور `migrate` و `collectstatic` را اجرا می‌کند)، Celery worker، Celery beat، و Nginx را بالا می‌آورد.

بررسی سلامت:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f web
```

## ۶. حساب ادمین اول

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec web python manage.py createsuperuser
```

شماره موبایل واقعی خودت را وارد کن — این نام کاربری ورود پنل ادمین است.

## ۷. seed اولیه (اختیاری)

اگر می‌خواهی کاتالوگ دمو (۲۵ محصول تستی VYBE) به‌عنوان نقطه شروع لود شود:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec web python manage.py seed_storefront
```

**توجه:** این محصولات دمو هستند، نه محصولات واقعی کارفرما — طبق چک‌لیست `SETUP-GUIDE.md` باید قبل از عمومی شدن سایت با محتوای واقعی جایگزین یا حذف شوند.

## ۸. بعد از بالا آمدن — چک‌لیست تکمیلی

از اینجا به بعد را `SETUP-GUIDE.md` قدم‌به‌قدم پوشش می‌دهد: اتصال کاوه‌نگار (پیامک)، اتصال زرین‌پال (پرداخت، خاموش کردن sandbox)، شماره اعلان کارفرما، سرچ کنسول، نماد اعتماد، روش‌های ارسال، و — **مهم** — پاک کردن هر حساب staff تستی که در این فرآیند ساخته شده.

## ۹. بک‌آپ

حداقل دیتابیس Postgres باید به‌صورت دوره‌ای بک‌آپ گرفته شود:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec db pg_dump -U vybeshop vybeshop | gzip > backup-$(date +%F).sql.gz
```

یک cron روزانه با این دستور (+ آپلود به یک storage خارج از همان سرور) توصیه می‌شود — این تسک فقط دستور را آماده می‌گذارد، زمان‌بندی‌اش را کارفرما/تیم عملیات باید تنظیم کند.

## ۱۰. آپدیت بعدی

```bash
git pull
npm ci && npm run build                          # فروشگاه
(cd admin && npm ci && npm run build)             # ادمین
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build web celery-worker celery-beat
docker compose --env-file .env.production -f docker-compose.prod.yml restart nginx
```

`migrate`/`collectstatic` خودکار در دستور استارت `web` هستند (بخش ۵)، پس نیازی به اجرای دستی نیست مگر یک migration خاص نیاز به مرحله دستی داشته باشد.


# Architecture Decision Records (ADR)

این فایل تصمیم‌های معماری مهم برای Ambient Background Music Generator API را ثبت می‌کند.

هر ADR شامل: **Context**, **Decision**, **Status**, **Consequences** است.

---

## ADR-001 – Backend Stack: Node.js 20 + Fastify + TypeScript

- **Status:** Accepted
- **Context:**
  - نیاز به یک بک‌اند سبک، سریع و مناسب برای API-first.
  - اکوسیستم غنی برای TypeScript و کتابخانه‌های مدرن.
- **Decision:**
  - استفاده از **Node.js 20** به‌عنوان runtime.
  - استفاده از **Fastify** به‌عنوان فریم‌ورک HTTP.
  - استفاده از **TypeScript** برای type-safety و DX بهتر.
- **Consequences:**
  - امکان ساخت APIهای سریع با پلاگین‌های Fastify.
  - هزینه یادگیری برای توسعه‌دهندگانی که با TS آشنا نیستند، کمی بیشتر است.

---

## ADR-002 – استفاده از Supabase (Postgres + Auth + Storage) به‌عنوان Platform اصلی

- **Status:** Accepted
- **Context:**
  - نیاز به یک راه‌حل یکپارچه برای DB، Auth و Storage بدون مدیریت زیرساخت پیچیده.
  - MVP باید سریع لانچ شود و در عین حال امکان scale‌کردن در آینده را داشته باشد.
- **Decision:**
  - استفاده از **Supabase** برای:
    - پایگاه‌داده Postgres.
    - مدیریت Auth و userها (در صورت نیاز).
    - Storage برای نگه‌داری فایل‌های صوتی و watermark.
- **Consequences:**
  - کاهش پیچیدگی اولیه (نیازی به مدیریت جداگانه Postgres + S3 + Auth نیست).
  - برای مهاجرت به زیرساخت self-hosted یا Cloud provider دیگر، باید لایه‌ی Storage/DB به‌صورت abstract طراحی شود (در soft-design لحاظ شده است).

---

## ADR-003 – عدم استفاده از Redis و Job Queue در v1 (MVP)

- **Status:** Accepted (for v1)
- **Context:**
  - Redis و BullMQ معماری را پیچیده‌تر می‌کنند.
  - حجم اولیه ترافیک و latency مورد انتظار نسبتاً پایین است.
  - می‌خواهیم MVP را با حداقل اجزای زیرساختی بسازیم.
- **Decision:**
  - در **v1** از Redis برای rate limiting و از BullMQ (یا صف مشابه) برای async jobs استفاده نمی‌شود.
  - مدیریت quota روزانه فقط از طریق **Supabase Postgres** و جدول `UsageDaily` انجام می‌شود.
- **Consequences:**
  - معماری ساده‌تر و deployment راحت‌تر.
  - برای ترافیک خیلی بالا و نیاز به rate limit کوتاه‌مدت، در آینده باید Redis یا سرویس مشابه به‌عنوان **Future** اضافه شود (به‌عنوان Future در soft-design آمده است).
  - در v1 هم‌زمانی (concurrency peaks) از طریق **transaction-level locking** در Postgres روی جدول `UsageDaily` مدیریت می‌شود (جزئیات در ADR-008).

---

## ADR-004 – Storage: Supabase Storage Bucket به‌عنوان منبع اصلی فایل‌های صوتی

- **Status:** Accepted
- **Context:**
  - نیاز به ذخیره‌ی امن فایل‌های MP3/WAV و امکان ساخت Signed URL.
  - هماهنگی با انتخاب Supabase به‌عنوان Platform.
- **Decision:**
  - ذخیره‌ی تمام ترک‌های تولید‌شده و فایل watermark در **Supabase Storage bucket**.
  - استفاده از Signed URL با TTL محدود برای دانلود.
- **Consequences:**
  - سادگی در مدیریت فایل و دسترسی.
  - برای مهاجرت احتمالی به S3 یا Cloud Storage دیگر، `storage_path` و لایه‌ی Storage abstraction باید طوری طراحی شود که API تغییری نکند (در soft-design توضیح داده شده است).

---

## ADR-005 – Audio Provider در v1: تک‌پرووایدر (OpenAI Audio یا Suno)

- **Status:** Accepted (single provider in v1)
- **Context:**
  - پشتیبانی هم‌زمان چند provider در نسخه‌ی اول، complexity و سطح تست را بالا می‌برد.
  - MVP نیاز به یک provider قابل‌اعتماد برای تولید موسیقی ambient دارد.
- **Decision:**
  - در **v1** فقط از **یک Audio provider** (مثلاً OpenAI Audio یا Suno) استفاده می‌شود.
  - در metadata فیلد `provider` نگه‌داری می‌شود تا در **v2** بتوان multi-provider و fallback را اضافه کرد.
- **Consequences:**
  - پیاده‌سازی ساده‌تر و focus روی یک integration.
  - انعطاف‌پذیری برای اضافه کردن providerهای دیگر در roadmap v2 (همراه با فیلد `provider_version`).

---

## ADR-006 – مدل Quota و پلن‌های درآمدی (Free/Basic/Pro/Ultra)

- **Status:** Accepted
- **Context:**
  - نیاز به یک مدل ساده ولی توسعه‌پذیر برای مصرف API و monetization.
- **Decision:**
  - تعریف پلن‌ها به‌صورت:
    - **Free:** 1 درخواست در روز، خروجی watermarked.
    - **Basic (9€/month):** 5 درخواست در روز، MP3 192kbps.
    - **Pro (19€/month):** 20 درخواست در روز، MP3 + WAV، priority بالاتر.
    - **Ultra (49€/month):** 100 درخواست در روز، commercial license.
  - ذخیره‌ی plan در جدول `User` و استفاده از جدول `UsageDaily` برای پیاده‌سازی quota روزانه.
- **Consequences:**
  - سادگی در پیاده‌سازی اولیه.
  - reset شدن quota روزانه بر اساس **نیمه‌شب UTC** (00:00:00 UTC) انجام می‌شود؛ در آینده، در صورت نیاز می‌توان timezone کاربر را نیز در نظر گرفت.
  - در صورت نیاز به تاریخچه‌ی پیچیده‌تر Subscription، می‌توان در آینده جدول جداگانه‌ی `Subscription` اضافه کرد بدون شکستن API.

---

## ADR-007 – Watermarking برای پلن Free

- **Status:** Accepted
- **Context:**
  - لازم است Free plan خروجی قابل استفاده ولی محدود داشته باشد تا انگیزه‌ی ارتقا ایجاد شود.
- **Decision:**
  - استفاده از یک **فایل watermark ثابت** (مثلاً WAV کوتاه) که در Supabase Storage نگه‌داری شده و با ffmpeg روی ترک نهایی در ۳–۵ ثانیه‌ی پایانی میکس می‌شود.
  - در metadata خروجی فیلدهای `watermarked` و `commercial_license` اضافه می‌شوند.
- **Consequences:**
  - کنترل ساده روی behavior پلن Free.
  - سمت کلاینت به‌راحتی می‌تواند تشخیص دهد آیا ترک برای استفاده‌ی تجاری مناسب است یا خیر.

---

## ADR-008 – استفاده از UsageDaily در DB به‌جای Redis برای مدیریت Quota در v1

- **Status:** Accepted (for v1)
- **Context:**
  - می‌خواهیم بدون افزودن Redis، quota روزانه را مدیریت کنیم.
  - Consistency مهم است (عدم دوبار شمارش درخواست‌ها در زمان concurrent calls).
- **Decision:**
  - تعریف جدول `UsageDaily` با ستون‌های `user_id`, `date`, `requests_count` و محدودیت `UNIQUE(user_id, date)`.
  - قبل از هر `generate` یک transaction باز می‌شود و رکورد `(user_id, date)` با upsert + lock به‌روزرسانی می‌شود.
- **Consequences:**
  - نیاز به طراحی دقت‌مند transactionها در DB.
  - اگر traffic خیلی زیاد شود، باید در آینده Redis یا rate limiter دیگری اضافه شود (به‌عنوان Future در soft-design آمده است).

---

## ADR-009 – ساختار ثابت Error Response

- **Status:** Accepted
- **Context:**
  - توسعه‌دهندگان کلاینت به یک error model پایدار و قابل‌اتکا نیاز دارند.
- **Decision:**
  - همه‌ی Endpointها در صورت خطا، پاسخی با ساختار زیر برمی‌گردانند:
    ```json
    {
      "error": {
        "code": "quota_exceeded",
        "message": "Daily quota exceeded for this plan",
        "status": 429
      }
    }
    ```
  - `code` برای ماشین و مستندات، `message` برای انسان، و `status` تکرار HTTP status است.
- **Consequences:**
  - DX بهتر برای مصرف‌کنندگان API.
  - نیاز است تمام خطاها در لایه‌ی API به همین فرمت نرمالایز شوند.

---

## ADR-010 – Sync Generation در v1 و آمادگی برای Async در v2

- **Status:** Accepted (for v1)
- **Context:**
  - برای MVP، ساده‌ترین UX این است که درخواست `generate` بلاکینگ باشد و خروجی را مستقیماً برگرداند.
  - در آینده ممکن است latency مدل‌ها بالا برود یا حجم ترافیک خیلی زیاد شود.
- **Decision:**
  - در **v1**، `POST /api/generate` یک عملیات **هم‌زمان (synchronous)** است و `status` پاسخ همیشه `"completed"` خواهد بود.
  - در **v2**، الگوی async با صف (job queue) و status endpoint در نظر گرفته شده و فیلد `status` برای مقادیر `pending`/`processing` آماده است.
  - یک الگوی پیشنهادی برای v2 می‌تواند اضافه‌کردن endpointی مانند `GET /api/generate/:id/status` برای polling وضعیت job باشد (یا برگرداندن status در همان `GET /api/tracks/:id`).
- **Consequences:**
  - پیاده‌سازی ساده‌تر در v1.
  - امکان مهاجرت به async در آینده بدون تغییر شدید در contract پاسخ.

---

## ADR-011 – API-Only MVP (بدون Dashboard/UI)

- **Status:** Accepted (for v1)
- **Context:**
  - هدف اصلی، ارائه‌ی یک API برای developerها و ابزارها است.
  - ساخت dashboard وب جداگانه زمان و هزینه اضافه می‌آورد.
- **Decision:**
  - MVP فقط شامل **HTTP API** است و هیچ dashboard/UI رسمی ندارد.
  - Endpoint `POST /api/keys` بیشتر برای استفاده‌ی داخلی/CLI است؛ در آینده می‌تواند پشت یک پنل وب قرار بگیرد.
  - این endpoint با **user-auth** (مثلاً session/JWT) محافظت می‌شود، نه با API key؛ API keyها فقط برای مصرف public API استفاده می‌شوند.
- **Consequences:**
  - تمرکز تیم روی کیفیت API و زیرساخت.
  - در نسخه‌های بعدی می‌توان یک dashboard web (مثلاً Next.js) اضافه کرد بدون تغییر در قراردادهای API.


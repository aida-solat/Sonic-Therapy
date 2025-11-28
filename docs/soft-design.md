
## Ambient Background Music Generator API – Soft Design

### 1. ویژن و نقش محصول

یک **API بک‌گراند موزیک جنریتور** که برای ویدیو/کانتنت/بازی، موسیقی کوتاه و اتمسفریک تولید می‌کند، بدون نیاز به موزیسین.

- **مخاطب‌ها**
  - ویدیو ادیتورها
  - یوتیوبرها و استریمرها
  - طراحان موشن و تبلیغات
  - بازی‌سازها و طراحان تجربه کاربری

- **خروجی‌ها**
  - فایل صوتی `MP3` با bitrate حداقل `192kbps` (همه پلن‌ها غیر از watermark)
  - فایل صوتی `WAV` (برای پلن Pro و بالاتر)
  - `metadata JSON` شامل پارامترهای ورودی و اطلاعات تولید‌شده (مدت، فرمت، provider و …)
  - (اختیاری آینده) نسخه preview کوتاه یا watermarked

- **دامنه زمانی ترک‌ها**
  - MVP: 30–90 ثانیه
  - طرح نهایی Prompt Engine: 30–120 ثانیه (LENGTH)


### 2. سطح API و پارامترها

#### 2.1 ورودی‌های اصلی Generate

Body پایه برای `POST /api/generate`:

```json
{
  "mood": "calm",
  "style": "ambient",
  "tempo": 60,
  "length": 45,
  "intensity": "soft" // اختیاری، پیش‌فرض "medium" در صورت عدم ارسال
}
```

- **mood**: یکی از مقدارهای مجاز
  - `calm | dreamy | cinematic | dark | uplifting | sci-fi | ethereal`
- **style**: یکی از مقدارهای مجاز
  - `ambient | drone | chillwave | lo-fi ambient | cosmic`
- **tempo**: عدد صحیح بین `50–90` BPM
- **length**: ثانیه، بازه `30–120`
- **intensity** (پیشنهادی): `soft | medium | high`
  - روی داینامیک، حجم لایه‌ها و presence پرکاشن‌ها اثر می‌گذارد.
  - اگر `intensity` ارسال نشود، مقدار پیش‌فرض `"medium"` در نظر گرفته می‌شود.

در نسخه‌های بعدی می‌توان پارامترهای زیر را اضافه کرد (در این داک به‌عنوان **Future** علامت‌گذاری می‌شوند):

- **seed**: برای reproducibility
- **loopable**: `boolean` برای بهینه کردن پایان/آغاز جهت لوپ شدن
- **variation_of_track_id**: تولید نسخه جایگزین از یک ترک قبلی


#### 2.2 خروجی API Generate

```json
{
  "id": "track_23423",
  "status": "completed",
  "download_url": "https://.../track_23423.mp3",
  "format": "mp3",
  "expires_in": 3600,
  "metadata": {
    "tempo": 60,
    "mood": "calm",
    "duration": 45,
    "style": "ambient",
    "intensity": "soft",
    "provider": "openai",
    "plan": "free",
    "watermarked": true,
    "commercial_license": false
  }
}
```

در صورت فعال بودن خروجی `WAV`، فیلدهای `download_url_wav` و `format_wav` نیز اضافه می‌شوند (فقط پلن Pro و Ultra).

- **توضیحات:**
  - `status`: در v1 همیشه مقدار `"completed"` است (generation هم‌زمانی است)، اما برای v2 (async jobs) از مقدارهایی مانند `pending` و `processing` نیز استفاده خواهد شد.
  - `expires_in`: مدت اعتبار لینک دانلود بر حسب ثانیه است (مثلاً `3600` = یک ساعت). بعد از این زمان، Signed URL نامعتبر می‌شود و کاربر باید ترک جدید generate کند یا (در آینده) از endpoint status/regen استفاده کند.
  - `provider`: در v1 فقط یک provider (مثلاً `openai` یا `suno`) استفاده می‌شود. این فیلد از الان برای پشتیبانی multi-provider در v2 طراحی شده است.
  - `watermarked`: برای پلن Free مقدار `true` است و برای پلن‌های پولی `false`، تا سمت کلاینت بتواند به‌راحتی تشخیص دهد خروجی قابل استفاده تجاری است یا خیر.
  - `commercial_license`: برای پلن Ultra مقدار `true` خواهد بود (برای سایر پلن‌ها `false`).


### 3. نیازمندی‌های غیرعملکردی (NFR)

- **Latency هدف**
  - برای ترک ۳۰–۶۰ ثانیه: زیر ۱۵–۳۰ ثانیه end-to-end
  - این latency شامل زمان پاسخ provider ثالث، پردازش ffmpeg و آپلود به Supabase Storage است.
- **Scalability**
  - افقی با scale کردن API و workerها
- **Reliability**
  - حداقل 99% uptime برای API public
- **Observability**
  - لاگ ساختاریافته (JSON)
  - متریک‌ها: تعداد درخواست، زمان پاسخ، نرخ خطا، هزینه متوسط هر ترک
- **Security**
  - فقط HTTPS
  - API Key per user، ذخیره فقط hash
  - Signed URL برای دسترسی به فایل‌ها در Supabase Storage
- **Cost-control**
  - quota روزانه بر اساس DB (Supabase Postgres)
  - در نسخه فعلی Redis استفاده نمی‌شود؛ در صورت نیاز می‌توان بعداً برای rate limiting اضافه کرد


### 4. معماری سطح بالا

استک اصلی:

- **Backend:** Node.js 20 + Fastify + TypeScript
- **Platform (DB/Auth/Storage):** Supabase (PostgreSQL + Auth + Storage Buckets)
- **Billing:** Stripe
- **Quota & Usage Tracking:** Supabase DB (بدون Redis در نسخه فعلی)
- **Audio Provider:** یک provider واحد (OpenAI Audio یا Suno) از طریق یک adapter ساده

فلو سطح بالا:

1. Client → درخواست `POST /api/generate` با `Bearer API_KEY`
2. Fastify:
   - اعتبارسنجی API key
   - استخراج user و plan
   - بررسی quota و rate limiting
3. Prompt Engine → ساخت prompt متن‌محور
4. Audio Generation Engine:
   - انتخاب provider مناسب (OpenAI / Suno / …)
   - فراخوانی API خارجی
5. پس از دریافت فایل خام:
   - Post-processing (normalize, watermark, format convert)
   - آپلود در Supabase Storage bucket
   - ذخیره metadata در DB
6. برگرداندن `download_url` (Signed URL با TTL) + `metadata` به کاربر

الگوی معماری:

- **API Layer (Fastify)**
- **Domain Services:**
  - Auth & API Keys Service
  - Billing & Plan Service
  - Generate Track Service (Prompt + Provider + Storage)
  - Usage & Quota Service
- **Infrastructure:**
  - Supabase (Auth + Postgres + Storage)، Stripe، Audio Provider


### 5. کامپوننت‌ها

- **API Gateway / HTTP Server (Fastify)**
  - مدیریت routing، validation، error handling استاندارد JSON

- **Auth & API Key Management**
  - ذخیره hash کلید در Supabase Postgres
  - امکان multi-key per user
  - وضعیت کلید: `active | disabled | revoked`

- **Billing & Subscription (Stripe)**
  - مدل:
    - **Free**: بدون کارت، لینک مستقیم API
    - **Basic / Pro / Ultra**: از طریق Checkout Session و Webhook
  - sync شدن plan و quota بعد از webhook

- **Usage Tracking & Rate Limiting**
  - استفاده از جدول `UsageDaily` در Supabase DB برای quota روزانه
  - (اختیاری آینده) اضافه‌کردن rate limit کوتاه‌مدت در صورت نیاز به scale بالاتر
  - در صورت تجاوز از حد مجاز → HTTP 429 یا 402

- **Audio Generation Engine**
  - ماژول `PromptEngine`
  - ماژول `AudioProviderAdapter` (در v1 فقط یک provider: OpenAI Audio یا Suno)
  - ماژول Post-processing (ffmpeg wrapper)

- **Storage Layer**
  - ساخت مسیر ذخیره‌سازی بر اساس `user_id` و `track_id`
  - ساخت Signed URL با TTL امن
  - (Future) در صورت نیاز به مهاجرت از Supabase Storage به S3 یا Cloud Storage دیگر، با نگه‌داشتن `storage_path` به‌صورت abstract می‌توان این انتقال را بدون تغییر در API انجام داد.

- **Background Jobs (Future)**
  - سیستم صف (job queue) برای ترک‌های طولانی‌تر یا ترافیک بالا (خارج از محدوده MVP فعلی)
  - Async generation + callback / polling endpoint


### 6. طراحی Prompt Engine

#### 6.1 Template اصلی

متن پایه (انگلیسی) که به مدل صوتی داده می‌شود:

```text
Generate an ambient background music track with:
Mood: {MOOD}
Style: {STYLE}
BPM: {TEMPO}
Duration: {LENGTH} seconds
Intensity: {INTENSITY}
Characteristics: soft pads, warm textures, smooth transitions, minimal percussions, no vocals, no sudden changes.
Output must be smooth, atmospheric, and loop-friendly.
```

- **پارامترها**
  - `MOOD`: `calm | dreamy | cinematic | dark | uplifting | sci-fi | ethereal`
  - `STYLE`: `ambient | drone | chillwave | lo-fi ambient | cosmic`
  - `TEMPO`: `50–90` BPM
  - `LENGTH`: `30–120` ثانیه
  - `INTENSITY`: `soft | medium | high`
  - اگر کاربر مقداری برای `intensity` ارسال نکند، `PromptEngine` مقدار پیش‌فرض `"medium"` را جایگزین کرده و در prompt استفاده می‌کند؛ بنابراین INTENSITY در prompt همیشه مقدار معتبر دارد.

#### 6.2 Responsibilities

- نگه داشتن mapping بین ورودی‌های API و prompt نهایی
- امکان تعریف templateهای متفاوت برای providerهای مختلف (مثلاً Suno vs OpenAI)
- Logging نسخه‌ی template برای reproducibility


### 7. طراحی Endpointها

#### 7.1 POST /api/generate – تولید موسیقی

- **Auth:** `Authorization: Bearer API_KEY`
- **Body:**
  - `mood`, `style`, `tempo`, `length`, `intensity` (اختیاری)
- **Validation:**
  - چک کردن rangeها و enumها
  - اگر پارامتر خارج از range بود → HTTP 400 با کد خطای مشخص

- **Business Logic:**
  - گرفتن user از روی API key
  - چک کردن plan و quota روزانه
  - چک کردن quota از روی جدول `UsageDaily` در DB (بدون Redis در v1)
  - ساخت prompt از طریق `PromptEngine`
  - صدا زدن provider انتخاب‌شده
  - ذخیره فایل در Supabase Storage bucket + metadata در DB
  - افزودن watermark برای پلن Free

- **Response 200:**
  - مطابق نمونه در بخش 2.2

- **Error Codes پیشنهادی:**
  - `400` – invalid_parameter / validation_error
  - `401` – invalid_api_key / missing_authorization_header / invalid_authorization_header
  - `402` – payment_required / plan_inactive
  - `429` – quota_exceeded
  - `500` – provider_error / storage_error / db_error / internal_error / unknown_error

- **ساختار ثابت خطا (برای همه Endpointها):**

  همه Endpointها در صورت خطا، پاسخی با ساختار زیر برمی‌گردانند:

  ```json
  {
    "error": {
      "code": "quota_exceeded",
      "message": "Daily quota exceeded for this plan",
      "status": 429
    }
  }
  ```

  - `code`: شناسه‌ی ماشین‌خوان، پایدار برای هر نوع خطا (مثلاً `invalid_parameter`, `invalid_api_key`, `quota_exceeded`).
  - `message`: متن قابل خواندن برای انسان (می‌تواند برای نمایش مستقیم به کاربر نهایی استفاده شود).
  - `status`: تکرار وضعیت HTTP برای راحتی مصرف‌کننده‌ی API.


#### 7.2 POST /api/keys – تولید API Key جدید

این endpoint برای استفاده داخلی و ابزارهای خط فرمان طراحی شده است؛ در آینده می‌تواند پشت یک **پنل وب** قرار بگیرد.

- **Auth (v1):** `Authorization: Bearer API_KEY` (در آینده می‌تواند به user-auth مبتنی بر سشن/JWT مهاجرت کند)
- **Body:**
  - `label` (اختیاری – نام دلخواه برای key)

- **Logic:**
  - تولید یک secret random key (مثلاً `amb_<64-hex>`)
  - محاسبه‌ی `key_hash` با SHA-256 و ذخیره در جدول `api_keys` (نه raw key)
  - نگه‌داشتن raw key فقط در حافظه برای ساخت response (هرگز در DB ذخیره نشود)
  - امکان محدودیت تعداد کلید فعال در هر کاربر (مثلاً حداکثر ۵) در آینده

- **Response (v1):**
  - `id`: شناسه‌ی کلید در DB
  - `apiKey`: مقدار کامل secret key (فقط یک‌بار نمایش داده می‌شود)
  - `label`: برچسب اختیاری کلید (یا null)
  - `createdAt`: زمان ایجاد کلید (ISO 8601)


#### 7.3 GET /api/me – نمایش مصرف

- **Auth:** `Authorization: Bearer API_KEY`
- **Response شامل:**
  - `userId`: شناسه کاربر
  - `plan`: پلن فعلی (`free | basic | pro | ultra`)
  - `dailyQuota`: سقف درخواست روزانه بر اساس پلن
  - `usedToday`: تعداد درخواست‌های استفاده‌شده‌ی امروز
  - `remainingToday`: quota باقیمانده برای امروز

نمونه پاسخ:

```json
{
  "userId": "usr_123",
  "plan": "pro",
  "dailyQuota": 20,
  "usedToday": 3,
  "remainingToday": 17
}
```


#### 7.4 Stripe Webhook – تأیید پرداخت‌ها

- **Endpoint:** `POST /webhooks/stripe`
- **Security:**
  - استفاده از `Stripe-Signature` header و secret
  - رد کردن درخواست‌هایی که signature آن‌ها اعتبارسنجی نمی‌شود

- **رویدادهای مهم:**
  - `checkout.session.completed` → فعال‌سازی پلن کاربر
  - `customer.subscription.updated` → آپدیت پلن، تاریخ پایان دوره، وضعیت
  - `invoice.payment_failed` → نشانه‌گذاری plan به حالت grace-period

- **Behavior:**
  - همه رویدادها در جدول `stripe_webhook_events` لاگ شوند (`stripe_event_id`, `type`, `payload`, `processed_at`).
  - برای idempotency، روی `stripe_event_id` محدودیت `UNIQUE` وجود دارد و هر event فقط یک‌بار پردازش می‌شود.
  - اعمال تغییرات روی user & plan به‌شکل اتمیک در سطح رکورد `app_users` انجام می‌شود؛ اگر منطق تجاری شکست بخورد، `processed_at` ست نمی‌شود تا امکان retry وجود داشته باشد.

- **Event Handling Table (v1):**

  | Event Type                     | منبع اطلاعات پلن / کاربر                           | Behavior اصلی                                                                 |
  | ------------------------------ | --------------------------------------------------- | ------------------------------------------------------------------------------ |
  | `checkout.session.completed`   | `session.metadata.plan`, `session.metadata.user_id` | اگر `plan` و `user_id` معتبر باشند: `app_users.plan = plan` و `stripe_customer_id` ست/آپدیت می‌شود. |
  |                                | `session.customer` / `session.customer_details`    | در صورت نبود user، یک `app_users` جدید با همان `id` و `email` ساخته می‌شود. |
  | `customer.subscription.updated`| `subscription.metadata.plan`                       | اگر `plan` و `stripe_customer_id` معتبر باشند: کاربر متناظر پیدا شده و `plan` آپدیت می‌شود. |
  |                                | `subscription.customer`                            | در صورت عدم وجود کاربر برای آن customer، event فقط لاگ می‌شود.                |
  | `invoice.payment_failed`       | `invoice.customer`                                 | کاربری که `stripe_customer_id` او برابر customer است به پلن `free` برگردانده می‌شود. |

#### 7.5 Endpointهای پیشنهادی آینده

- `GET /api/tracks/:id` – دریافت metadata و لینک دانلود ترک قبلی
- `GET /healthz` – health check برای مانیتورینگ
- `GET /api/providers` – لیست providerهای فعال و محدودیت‌هایشان


### 8. مدل داده (Logical Data Model)

#### 8.1 User

- `id`
- `email`
- `plan` (free/basic/pro/ultra)
- `stripe_customer_id`
- `created_at`, `updated_at`

#### 8.2 ApiKey

- `id`
- `user_id`
- `key_hash`
- `label`
- `status` (active/disabled/revoked)
- `last_used_at`
- `created_at`

#### 8.3 Track

- `id`
- `user_id`
- `storage_path`
- `format` (mp3/wav)
- `duration_seconds`
- `mood`, `style`, `tempo`, `length`, `intensity`
- `provider`
- `provider_version` (اختیاری؛ برای multi-provider و نسخه‌ی مدل صوتی در v2)
- `plan`
- `created_at`

یادداشت‌ها:

- فیلد `intensity` در DB به‌صورت `NOT NULL` با default `'medium'` تعریف می‌شود تا در صورت عدم ارسال از سمت کاربر، مقدار پیش‌فرض مشخصی داشته باشد.
- فیلدهای `provider` و `provider_version` در v1 ساده نگه داشته می‌شوند (مثلاً فقط `openai` یا `suno` و بدون نسخه)، اما برای v2 که multi-provider و نسخه‌های مختلف مدل داریم، پر می‌شوند.

#### 8.4 UsageDaily

- `id`
- `user_id`
- `date`
- `requests_count`

یادداشت‌ها:

- روی `(user_id, date)` یک محدودیت `UNIQUE` و یک index ترکیبی تعریف می‌شود تا هم از رکورد تکراری جلوگیری شود و هم خواندن/آپدیت سریع باشد.
- در مسیر `generate` همیشه در یک transaction، رکورد `(user_id, date)` خوانده یا ساخته می‌شود (upsert با lock) تا در حضور چند درخواست هم‌زمان، شمارنده‌ی `requests_count` به‌درستی به‌روز شود.

#### 8.5 StripeWebhookEvent

- `id`
- `stripe_event_id`
- `type`
- `payload` (JSON)
- `processed_at`
- `created_at`


### 9. Rate Limiting و Quota per Plan

مطابق مدل درآمدی:

- **Free**
  - `1` درخواست generate در روز
  - خروجی با watermark
- **Basic – 9€/month**
  - `5` درخواست در روز
  - خروجی MP3 192kbps
- **Pro – 19€/month**
  - `20` درخواست در روز
  - خروجی MP3 + WAV
  - اولویت بالاتر در صف (در صورت وجود صف)
- **Ultra – 49€/month**
  - `100` درخواست در روز
  - مجوز commercial use (در metadata نگه‌داری شود)

**منطق در کد:**

- قبل از هر generate:
  - شروع transaction در DB (Supabase Postgres)
  - خواندن/ایجاد رکورد `UsageDaily` برای `(user_id, date)` با lock
  - اگر `requests_count >= plan_limit` → خطای `quota_exceeded`
  - افزایش `requests_count` و commit
  - (Future) در صورت نیاز به rate limiting کوتاه‌مدت می‌توان Redis یا سرویس جداگانه اضافه کرد (در MVP استفاده نمی‌شود)


### 10. Watermarking برای پلن Free

- افزودن یک لایه نویز/تون خیلی ملایم در ۳–۵ ثانیه پایانی ترک
- استفاده از ffmpeg برای mix کردن لایه watermark روی خروجی provider
- configuration watermark (gain، طول، نوع صدا) قابل تنظیم از env/config
- فایل watermark به‌صورت یک فایل صوتی ثابت (مثلاً WAV کوتاه) در Supabase Storage نگه‌داری می‌شود و در زمان generate فقط میکس می‌شود؛ بنابراین نیاز به تولید watermark در هر درخواست وجود ندارد.
- فلگ‌های `watermarked` و `commercial_license` در metadata خروجی، به‌صورت صریح وضعیت استفاده تجاری را برای کلاینت مشخص می‌کنند.


### 11. امنیت و Best Practices

- فقط HTTPS; عدم پشتیبانی از HTTP خالص
- CORS محدود (originهای مشخص برای استفاده داخلی و future پنل؛ API key clients آزادتر ولی کنترل‌شده)
- ذخیره نشدن API key به‌صورت plain text (فقط hash، با الگوریتم‌های امن مانند bcrypt یا argon2)
- از لاگ‌کردن prompt کامل و سایر ورودی‌های متنی حساس خودداری می‌شود؛ فقط متادیتای حداقلی (مانند id کاربر، plan، مدت ترک) در لاگ‌ها ثبت می‌شود.
- TTL محدود برای Signed URLهای دانلود (مثلاً ۱ ساعت)


### 12. Deployment و محیط‌ها

- **Environments:** dev / staging / prod
- **Config:** از طریق env (Supabase URL/keys, Supabase storage bucket, provider keys, Stripe keys)
- **Monitoring:**
  - APM/metrics (Prometheus, OpenTelemetry, یا سرویس hosted)
  - Alert روی نرخ خطای بالا یا افزایش latency


### 13. Roadmap نسخه‌ها

- **v1 (MVP):**
  - فقط یک provider (مثلاً OpenAI)
  - sync generation (بدون صف)
  - فقط MP3
  - پلن‌ها و quota پایه + watermark free

- **v2:**
  - اضافه کردن WAV، صف async (job queue ساده)
  - multi-provider + fallback، نگه‌داری `provider` و `provider_version` در metadata هر ترک
  - endpointهای اضافی برای مدیریت ترک‌ها

- **v3:**
  - پارامترهای پیشرفته (seed, loopable, variation)
  - analytics برای کاربران (dashboard مصرف و هزینه)


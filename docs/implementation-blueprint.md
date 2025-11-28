
# Implementation Blueprint – Ambient Background Music Generator API (v1)

این داک، طراحی نرم (soft-design) و ADRها را به یک **نقشه‌ی پیاده‌سازی عملی** تبدیل می‌کند.

فاز فعلی: **v1 (MVP) – Supabase-only, single audio provider, sync generation, API-only**

---

## 1) ساختار فولدرهای Fastify (پروژه Node.js + TypeScript)

پیشنهاد ساختار ریپو:

```text
ambient-bgm-api/
  package.json
  tsconfig.json
  .env.example
  src/
    index.ts                 # entrypoint: ساخت Fastify instance و ثبت routeها
    app.ts                   # buildApp(): ساخت و کانفیگ Fastify (برای تست و runtime)

    config/
      env.ts                 # خواندن و validate کردن env (Supabase, Stripe, provider, ...)

    infra/
      supabaseClient.ts      # ساخت Supabase client (Postgrest + Storage)
      stripeClient.ts        # ساخت Stripe client
      ffmpeg.ts              # wrapper برای اجرای ffmpeg (child_process یا fluent-ffmpeg)

    routes/
      generate.route.ts      # POST /api/generate
      keys.route.ts          # POST /api/keys
      me.route.ts            # GET /api/me
      stripeWebhook.route.ts # POST /webhooks/stripe
      health.route.ts        # GET /healthz
      tracks.route.ts        # (Future) GET /api/tracks/:id

    schemas/                 # JSON Schemas برای Fastify (body/params/response)
      generate.schema.ts
      keys.schema.ts
      me.schema.ts
      error.schema.ts

    services/
      auth/
        apiKeyAuthService.ts     # validate API key و برگرداندن user
      billing/
        planService.ts           # logic پلن و محدودیت‌ها
        stripeWebhookService.ts  # پردازش رویدادهای Stripe
      usage/
        usageService.ts          # UsageDaily + quota check
      tracks/
        generateTrackService.ts  # orchestration کامل generate ترک
        trackMetadataService.ts  # CRUD ساده روی metadata ترک‌ها (future)
      prompt/
        promptEngine.ts          # ساخت prompt از روی ورودی‌های API
      storage/
        storageService.ts        # abstraction برای Storage (Supabase در v1)

    providers/
      audio/
        audioProvider.ts         # interface AudioProvider
        defaultAudioProvider.ts  # پیاده‌سازی v1 (OpenAI یا Suno)

    types/
      domain.ts                  # تایپ‌های domain-level: User, Plan, TrackMetadata, ...
      errors.ts                  # error codes و کلاس‌های خطا

  tests/
    unit/
    integration/
```

---

## 2) طراحی کامل لایه Service

### 2.1 Auth & API Key Service

- **فایل:** `src/services/auth/apiKeyAuthService.ts`
- **مسئولیت‌ها:**
  - خواندن `Authorization: Bearer <API_KEY>`.
  - پیدا کردن `ApiKey` در DB از روی `key_hash`.
  - برگرداندن `user` + `plan` + اطلاعات پایه.
  - مدیریت وضعیت کلید (active/disabled/revoked).
- **اینترفیس پیشنهادی (مفهومی):**

```ts
interface ApiKeyAuthService {
  authenticate(apiKey: string): Promise<{ user: User; apiKey: ApiKey }>
}
```

### 2.2 Plan & Billing Service

- **فایل:** `src/services/billing/planService.ts`
- **مسئولیت‌ها:**
  - map کردن `user.plan` → quota روزانه، امکانات (MP3/WAV, watermark, commercial_license).
  - منطق اینکه پلن Free/Billing/Pro/Ultra چه حقوقی دارد.
- **فایل:** `src/services/billing/stripeWebhookService.ts`
- **مسئولیت‌ها:**
  - validate امضای Stripe.
  - ذخیره‌ی event در `stripe_webhook_events`.
  - آپدیت `user.plan`, `stripe_customer_id`, وضعیت subscription.

### 2.3 Usage & Quota Service

- **فایل:** `src/services/usage/usageService.ts`
- **مسئولیت‌ها:**
  - قبل از هر generate:
    - شروع transaction.
    - پیدا/ایجاد رکورد `UsageDaily (user_id, date)`.
    - مقایسه `requests_count` با `plan_limit`.
    - افزایش شمارنده و commit.
  - پرتاب خطای domain-level `QuotaExceededError` در صورت عبور از حد.
- **اینترفیس:**

```ts
interface UsageService {
  checkAndConsumeDaily(user: User, plan: Plan): Promise<void>
}
```

### 2.4 Prompt Engine Service

- **فایل:** `src/services/prompt/promptEngine.ts`
- **مسئولیت‌ها:**
  - validate مقادیر mood/style/tempo/length/intensity در سطح domain (یا rely on schema).
  - اعمال default برای `intensity = "medium"` در صورت نبود.
  - ساخت template نهایی مطابق soft-design.
- **اینترفیس:**

```ts
interface PromptEngine {
  buildPrompt(input: GenerateRequest): PromptPayload
}
```

### 2.5 Audio Generation / Track Service

- **فایل:** `src/services/tracks/generateTrackService.ts`
- **مسئولیت‌ها (orchestration):**
  1. Auth → user + plan.
  2. Quota → `usageService.checkAndConsumeDaily`.
  3. Prompt → `promptEngine.buildPrompt`.
  4. Audio Provider → `audioProvider.generateTrack(prompt, options)`.
  5. ffmpeg pipeline → normalize + watermark (اگر Free) + encoding MP3/WAV.
  6. Storage → upload فایل‌ها به Supabase Storage.
  7. DB → نوشتن `Track` row با metadata کامل.
  8. ساخت response payload شامل `download_url` و metadata.
- **اینترفیس:**

```ts
interface GenerateTrackService {
  generate(request: GenerateRequest, apiKey: string): Promise<GenerateResponse>
}
```

### 2.6 Storage Service

- **فایل:** `src/services/storage/storageService.ts`
- **مسئولیت‌ها:**
  - abstraction روی Supabase Storage.
  - آپلود ترک نهایی (MP3 و در صورت نیاز WAV).
  - تولید Signed URL با TTL.
- **اینترفیس:**

```ts
interface StorageService {
  uploadTrack(params: {
    userId: string;
    trackId: string;
    localFilePath: string;
    format: 'mp3' | 'wav';
  }): Promise<{ storagePath: string }>;

  getDownloadUrl(params: {
    storagePath: string;
    expiresInSeconds: number;
  }): Promise<string>;
}
```

### 2.7 Stripe Webhook Service

- **فایل:** `src/services/billing/stripeWebhookService.ts`
- **مسئولیت‌ها:**
  - پردازش رویدادهای `checkout.session.completed`, `customer.subscription.updated`, `invoice.payment_failed`.
  - log کردن همه‌ی events در `stripe_webhook_events`.
  - به‌روزرسانی plan و subscription state.

---

## 3) طراحی Supabase SQL Schema (migration-ready)

نکته: نام جداول پیشنهادی؛ در محیط Supabase می‌توان آن‌ها را در `public` schema ایجاد کرد. اگر از Supabase Auth استفاده شود، می‌توان `user_id` را به `auth.users` رفرنس داد.

### 3.1 Enum Types

```sql
CREATE TYPE plan_type AS ENUM ('free', 'basic', 'pro', 'ultra');

CREATE TYPE api_key_status AS ENUM ('active', 'disabled', 'revoked');

CREATE TYPE intensity_level AS ENUM ('soft', 'medium', 'high');
```

### 3.2 Table: app_users

```sql
CREATE TABLE public.app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  plan plan_type NOT NULL DEFAULT 'free',
  stripe_customer_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

> اگر از Supabase Auth (`auth.users`) استفاده شود، می‌توان `app_users.id` را با `auth.users.id` sync یا مستقیماً از `auth.users` استفاده کرد. این داک ساده‌ترین حالت (جدول مستقل) را نشان می‌دهد.

### 3.3 Table: api_keys

```sql
CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.app_users (id) ON DELETE CASCADE,
  key_hash text NOT NULL,
  label text,
  status api_key_status NOT NULL DEFAULT 'active',
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX api_keys_user_id_idx ON public.api_keys (user_id);
```

### 3.4 Table: tracks

```sql
CREATE TABLE public.tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.app_users (id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  format text NOT NULL CHECK (format IN ('mp3', 'wav')),
  duration_seconds integer NOT NULL CHECK (duration_seconds > 0),

  mood text NOT NULL,
  style text NOT NULL,
  tempo integer NOT NULL CHECK (tempo BETWEEN 50 AND 90),
  length integer NOT NULL CHECK (length BETWEEN 30 AND 120),
  intensity intensity_level NOT NULL DEFAULT 'medium',

  provider text NOT NULL,
  provider_version text,
  plan plan_type NOT NULL,
  watermarked boolean NOT NULL DEFAULT false,
  commercial_license boolean NOT NULL DEFAULT false,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX tracks_user_created_idx ON public.tracks (user_id, created_at DESC);
```

### 3.5 Table: usage_daily

```sql
CREATE TABLE public.usage_daily (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.app_users (id) ON DELETE CASCADE,
  date date NOT NULL,
  requests_count integer NOT NULL DEFAULT 0,
  CONSTRAINT usage_daily_user_date_unique UNIQUE (user_id, date)
);

CREATE INDEX usage_daily_user_date_idx ON public.usage_daily (user_id, date);
```

### 3.6 Table: stripe_webhook_events

```sql
CREATE TABLE public.stripe_webhook_events (
  id bigserial PRIMARY KEY,
  stripe_event_id text NOT NULL UNIQUE,
  type text NOT NULL,
  payload jsonb NOT NULL,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

---

## 4) اسکلت کامل Endpointها (Fastify)

در ادامه، اسکلت routeها و اتصال‌شان به سرویس‌ها را تعریف می‌کنیم. (کد نهایی در `src/routes/*.route.ts` پیاده‌سازی می‌شود.)

### 4.1 POST /api/generate

- **فایل:** `src/routes/generate.route.ts`
- **Flow سطح بالا handler:**

```ts
fastify.post('/api/generate', {
  schema: GenerateSchema,
}, async (request, reply) => {
  const apiKey = extractApiKey(request.headers);
  const response = await generateTrackService.generate(request.body, apiKey);
  reply.send(response);
});
```

- **Dependencies:** `ApiKeyAuthService`, `UsageService`, `PromptEngine`, `AudioProvider`, `StorageService`.

### 4.2 POST /api/keys

- **فایل:** `src/routes/keys.route.ts`
- **نکته:** پشت user-auth است (نه API key). در v1 ممکن است این route فقط برای internal/CLI استفاده شود.

```ts
fastify.post('/api/keys', {
  preHandler: requireUserAuth, // session/JWT
  schema: CreateApiKeySchema,
}, async (request, reply) => {
  const apiKey = await apiKeyService.createForUser(request.user.id, request.body.label);
  reply.send(apiKey);
});
```

### 4.3 GET /api/me

- **فایل:** `src/routes/me.route.ts`
- **Auth:** API key

```ts
fastify.get('/api/me', {
  schema: MeSchema,
}, async (request, reply) => {
  const apiKey = extractApiKey(request.headers);
  const { user } = await apiKeyAuthService.authenticate(apiKey);
  const usage = await usageService.getTodayUsage(user.id);
  const planInfo = planService.describePlan(user.plan, usage.requestsCount);
  reply.send({ user, ...planInfo });
});
```

### 4.4 POST /webhooks/stripe

- **فایل:** `src/routes/stripeWebhook.route.ts`

```ts
fastify.post('/webhooks/stripe', {
  config: { rawBody: true },
}, async (request, reply) => {
  await stripeWebhookService.handleEvent(request.rawBody, request.headers['stripe-signature']);
  reply.code(200).send({ received: true });
});
```

### 4.5 GET /healthz

- **فایل:** `src/routes/health.route.ts`
- **هدف:** health check ساده (DB + provider readiness).

```ts
fastify.get('/healthz', async () => ({ status: 'ok' }));
```

### 4.6 (Future) GET /api/tracks/:id

- **فایل:** `src/routes/tracks.route.ts`
- **هدف:** بازگرداندن metadata ترک و لینک دانلود جدید.

---

## 5) Provider Adapter Structure

### 5.1 Interface عمومی Provider

- **فایل:** `src/providers/audio/audioProvider.ts`

```ts
export interface AudioProvider {
  generateTrack(params: {
    prompt: string;
    tempo: number;
    lengthSeconds: number;
  }): Promise<{
    /** مسیر فایل موقتی خروجی provider (مثلاً WAV) */
    tempFilePath: string;
    format: 'wav' | 'mp3';
  }>;
}
```

### 5.2 پیاده‌سازی v1 – defaultAudioProvider

- **فایل:** `src/providers/audio/defaultAudioProvider.ts`
- **نکته:**
  - در env مشخص می‌شود که provider فعلی `openai` است یا `suno`.
  - این فایل در v1 فقط یکی از آن‌ها را پیاده‌سازی می‌کند.

```ts
export class DefaultAudioProvider implements AudioProvider {
  constructor(private readonly config: ProviderConfig) {}

  async generateTrack(params: ProviderGenerateParams): Promise<ProviderGenerateResult> {
    // call OpenAI/Suno API based on config
  }
}
```

در v2، می‌توان چند کلاس (`OpenAIAudioProvider`, `SunoAudioProvider`) و یک factory برای انتخاب provider اضافه کرد.

---

## 6) Storage Layer Abstraction

### 6.1 Interface

- **فایل:** `src/services/storage/storageService.ts`

```ts
export interface StorageService {
  uploadTrack(params: {
    userId: string;
    trackId: string;
    localFilePath: string;
    format: 'mp3' | 'wav';
  }): Promise<{ storagePath: string }>;

  getDownloadUrl(params: {
    storagePath: string;
    expiresInSeconds: number;
  }): Promise<string>;
}
```

### 6.2 SupabaseStorageService (v1)

- **فایل:** `src/services/storage/supabaseStorageService.ts`
- **مسئولیت‌ها:**
  - map کردن `userId` + `trackId` → مسیر `storage_path` مثل:
    - `tracks/{userId}/{trackId}.mp3`
  - استفاده از Supabase JS client برای `upload` و `createSignedUrl`.

در آینده، در صورت مهاجرت به S3، فقط implementation عوض می‌شود، نه interface.

---

## 7) ffmpeg Pipeline Blueprint

### 7.1 هدف

Pipeline ffmpeg وظیفه دارد:

- گرفتن خروجی خام provider (مثلاً WAV).
- normalize کردن بلندی صدا.
- افزودن watermark (در صورت Free plan).
- encode نهایی به MP3 192kbps (و در صورت نیاز WAV).

### 7.2 مراحل پردازش

1. **دریافت فایل خام**
   - `tempInputPath` از `AudioProvider.generateTrack`.
2. **تبدیل به فرمت پایه** (اگر لازم بود):
   - نمونه: WAV، 44.1kHz, 16-bit stereo.
3. **Normalize Loudness**
   - استفاده از فیلتر `loudnorm` در ffmpeg برای سطح بلندی یکنواخت.
4. **افزودن Watermark (فقط Free plan)**
   - watermarkFile: یک فایل WAV کوتاه ثابت از Supabase Storage (یا local asset).
   - mix کردن watermark فقط در ۳–۵ ثانیه‌ی پایانی ترک با فیلتر `amix` یا `adelay + amix`.
   - gain watermark از config خوانده می‌شود تا خیلی آزاردهنده نباشد.
5. **Encode به MP3 (و WAV برای Pro/Ultra)**
   - MP3: bitrate حداقل 192kbps.
   - اگر plan اجازه دهد، خروجی WAV نیز ذخیره می‌شود.
6. **خروجی**
   - مسیر `tempMp3Path` (و در صورت نیاز `tempWavPath`).
   - این مسیرها بعداً توسط `StorageService.uploadTrack` به Supabase ارسال می‌شوند.
7. **Cleanup**
   - حذف فایل‌های موقتی بعد از آپلود موفق (در بلاک `finally`).

### 7.3 ماژول ffmpeg Wrapper

- **فایل:** `src/infra/ffmpeg.ts`
- **گزینه‌ها:**
  - استفاده از `child_process.spawn` و اجرای commandهای ffmpeg.
  - یا استفاده از کتابخانه‌ای مانند `fluent-ffmpeg`.
- **الگو:**
  - هر عملیات، یک تابع async که ورودی/خروجی فایل را می‌گیرد و Promise برمی‌گرداند.
  - logging مناسب برای مدت زمان پردازش و خطاها.

---

## جمع‌بندی

- این blueprint به‌صورت مستقیم قابل تبدیل به:
  - ساختار فولدر در `src/`.
  - فایل‌های migration Supabase (SQL).
  - اسکلت اولیه‌ی Fastify routes + services.
- گام بعدی پیشنهادی:
  - ایجاد فولدر `src/` و فایل‌های حداقلی مطابق این ساختار.
  - اضافه‌کردن migrationها (به‌صورت SQL یا Supabase migration scripts).


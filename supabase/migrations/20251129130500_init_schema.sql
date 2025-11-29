-- 0001_schema.sql - Initial schema for Ambient Background Music Generator API (schema bootstrap)
-- This mirrors 0001_init.sql so fresh deployments can recreate the DB from migrations alone.

-- Ensure gen_random_uuid() is available (Supabase usually has this, but keep it explicit)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enum types (created conditionally so the migration is idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plan_type') THEN
    CREATE TYPE plan_type AS ENUM ('free', 'basic', 'pro', 'ultra');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'api_key_status') THEN
    CREATE TYPE api_key_status AS ENUM ('active', 'disabled', 'revoked');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'intensity_level') THEN
    CREATE TYPE intensity_level AS ENUM ('soft', 'medium', 'high');
  END IF;
END
$$;

-- Table: app_users
CREATE TABLE IF NOT EXISTS public.app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  plan plan_type NOT NULL DEFAULT 'free',
  stripe_customer_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Table: api_keys
CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.app_users (id) ON DELETE CASCADE,
  key_hash text NOT NULL,
  label text,
  status api_key_status NOT NULL DEFAULT 'active',
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS api_keys_user_id_idx ON public.api_keys (user_id);

-- Table: tracks
CREATE TABLE IF NOT EXISTS public.tracks (
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

CREATE INDEX IF NOT EXISTS tracks_user_created_idx ON public.tracks (user_id, created_at DESC);

-- Table: usage_daily
CREATE TABLE IF NOT EXISTS public.usage_daily (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.app_users (id) ON DELETE CASCADE,
  date date NOT NULL,
  requests_count integer NOT NULL DEFAULT 0,
  CONSTRAINT usage_daily_user_date_unique UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS usage_daily_user_date_idx ON public.usage_daily (user_id, date);

-- Table: stripe_webhook_events
CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id bigserial PRIMARY KEY,
  stripe_event_id text NOT NULL UNIQUE,
  type text NOT NULL,
  payload jsonb NOT NULL,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

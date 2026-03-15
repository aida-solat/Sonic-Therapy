-- 0005_add_track_type.sql - Add track_type column to distinguish standard vs therapy tracks

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'track_type') THEN
    CREATE TYPE track_type AS ENUM ('standard', 'therapy');
  END IF;
END
$$;

ALTER TABLE public.tracks
  ADD COLUMN IF NOT EXISTS track_type track_type NOT NULL DEFAULT 'standard';

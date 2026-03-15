-- 0007_add_therapy_frequency.sql - Add therapy_frequency JSONB column for storing binaural beat info

ALTER TABLE public.tracks
  ADD COLUMN IF NOT EXISTS therapy_frequency jsonb;

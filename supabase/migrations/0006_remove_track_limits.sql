-- 0006_remove_track_limits.sql - Remove CHECK constraints on tempo, length, and duration_seconds

ALTER TABLE public.tracks DROP CONSTRAINT IF EXISTS tracks_tempo_check;
ALTER TABLE public.tracks DROP CONSTRAINT IF EXISTS tracks_length_check;
ALTER TABLE public.tracks DROP CONSTRAINT IF EXISTS tracks_duration_seconds_check;

-- Re-add minimal constraints (must be positive)
ALTER TABLE public.tracks ADD CONSTRAINT tracks_tempo_check CHECK (tempo > 0);
ALTER TABLE public.tracks ADD CONSTRAINT tracks_length_check CHECK (length > 0);
ALTER TABLE public.tracks ADD CONSTRAINT tracks_duration_seconds_check CHECK (duration_seconds > 0);

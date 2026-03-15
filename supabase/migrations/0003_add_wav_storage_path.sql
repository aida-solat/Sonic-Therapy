ALTER TABLE public.tracks
ADD COLUMN IF NOT EXISTS wav_storage_path text;
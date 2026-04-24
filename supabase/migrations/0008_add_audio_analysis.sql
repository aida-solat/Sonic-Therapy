-- 0008_add_audio_analysis.sql
-- Add objective audio analysis columns populated by the Python audio-analysis microservice.
--
-- audio_analysis         : full JSON payload returned by /analyze (BPM, spectral, dynamics, therapy, etc.)
-- audio_analysis_score   : flattened 0..1 therapy_fit_score for cheap filtering / sorting
-- audio_analysis_status  : pending | completed | failed | skipped
-- audio_analysis_at      : timestamp of the last successful analysis

ALTER TABLE public.tracks
  ADD COLUMN IF NOT EXISTS audio_analysis         jsonb,
  ADD COLUMN IF NOT EXISTS audio_analysis_score   real,
  ADD COLUMN IF NOT EXISTS audio_analysis_status  text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS audio_analysis_at      timestamptz;

-- Useful index for "show me my best-scoring tracks" queries.
CREATE INDEX IF NOT EXISTS idx_tracks_audio_analysis_score
  ON public.tracks (audio_analysis_score DESC NULLS LAST);

-- Status filter index for background retry jobs.
CREATE INDEX IF NOT EXISTS idx_tracks_audio_analysis_status
  ON public.tracks (audio_analysis_status)
  WHERE audio_analysis_status IN ('pending', 'failed');

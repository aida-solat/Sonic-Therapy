-- Track ratings for evaluation metrics
CREATE TABLE public.track_ratings (
  id bigserial PRIMARY KEY,
  track_id uuid NOT NULL REFERENCES public.tracks (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.app_users (id) ON DELETE CASCADE,
  satisfaction smallint NOT NULL CHECK (satisfaction BETWEEN 1 AND 5),
  mood_accuracy smallint NOT NULL CHECK (mood_accuracy BETWEEN 1 AND 5),
  style_accuracy smallint NOT NULL CHECK (style_accuracy BETWEEN 1 AND 5),
  audio_quality smallint NOT NULL CHECK (audio_quality BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT track_ratings_user_track_unique UNIQUE (track_id, user_id)
);

CREATE INDEX track_ratings_track_id_idx ON public.track_ratings (track_id);
CREATE INDEX track_ratings_user_id_idx ON public.track_ratings (user_id);

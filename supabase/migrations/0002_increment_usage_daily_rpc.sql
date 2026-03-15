-- 0002_increment_usage_daily_rpc.sql
-- Atomic daily quota increment with row-level locking.
-- Returns the NEW requests_count so the caller can compare against the plan limit.

CREATE OR REPLACE FUNCTION public.increment_usage_daily(
  p_user_id uuid,
  p_date date
)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_count integer;
BEGIN
  INSERT INTO public.usage_daily (user_id, date, requests_count)
  VALUES (p_user_id, p_date, 1)
  ON CONFLICT (user_id, date)
  DO UPDATE SET requests_count = usage_daily.requests_count + 1
  RETURNING requests_count INTO v_count;

  RETURN v_count;
END;
$$;

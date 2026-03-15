-- Rate limiting for edge functions
-- Tracks call counts per (key, window) so edge functions can self-throttle

CREATE TABLE IF NOT EXISTS rate_limits (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key         text        NOT NULL,          -- e.g. 'cnpj_lookup:ip:1.2.3.4'
  window_start timestamptz NOT NULL,         -- start of the 1-minute window
  call_count  integer     NOT NULL DEFAULT 1,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (key, window_start)
);

-- Allow edge functions (service role) full access
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON rate_limits
  FOR ALL USING (auth.role() = 'service_role');

-- Auto-delete records older than 24h to keep the table small
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits (window_start);

-- Upsert helper function called by edge functions
CREATE OR REPLACE FUNCTION rate_limit_check(
  p_key text,
  p_max_calls integer,
  p_window_seconds integer DEFAULT 60
)
RETURNS boolean   -- true = allowed, false = rate limited
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_window timestamptz;
  v_count  integer;
BEGIN
  -- Round down to nearest window
  v_window := date_trunc('minute', now()) +
              (floor(extract(epoch from now())::numeric / p_window_seconds) -
               floor(extract(epoch from date_trunc('minute', now()))::numeric / p_window_seconds)
              ) * p_window_seconds * interval '1 second';

  INSERT INTO rate_limits (key, window_start, call_count)
  VALUES (p_key, v_window, 1)
  ON CONFLICT (key, window_start)
  DO UPDATE SET call_count = rate_limits.call_count + 1
  RETURNING call_count INTO v_count;

  RETURN v_count <= p_max_calls;
END;
$$;

COMMENT ON FUNCTION rate_limit_check IS
  'Returns TRUE if request is within limit, FALSE if rate-limited. Called from edge functions via RPC.';

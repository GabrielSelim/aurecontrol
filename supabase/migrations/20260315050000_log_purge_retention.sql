-- ============================================================
-- Log purge / LGPD retention policy
-- Runs weekly via pg_cron
-- ============================================================

-- Function: purge_old_logs
-- Cleans up old records per retention policy:
--   audit_logs          → keep 5 years  (LGPD Art. 15 — "necessário cumprimento de obrigação legal")
--   notification_logs   → keep 1 year
--   rate_limits         → keep 1 day  (operational window only)
--   lgpd_deletion_requests (completed/rejected) → keep 3 years
CREATE OR REPLACE FUNCTION purge_old_logs()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_audit_deleted      int := 0;
  v_notif_deleted      int := 0;
  v_rate_deleted       int := 0;
  v_lgpd_deleted       int := 0;
BEGIN
  -- Audit logs older than 5 years
  DELETE FROM audit_logs
  WHERE created_at < NOW() - INTERVAL '5 years';
  GET DIAGNOSTICS v_audit_deleted = ROW_COUNT;

  -- Notification logs older than 1 year
  DELETE FROM notification_logs
  WHERE created_at < NOW() - INTERVAL '1 year';
  GET DIAGNOSTICS v_notif_deleted = ROW_COUNT;

  -- Rate limit windows older than 1 day
  DELETE FROM rate_limits
  WHERE window_start < NOW() - INTERVAL '1 day';
  GET DIAGNOSTICS v_rate_deleted = ROW_COUNT;

  -- Completed/rejected LGPD deletion requests older than 3 years
  DELETE FROM lgpd_deletion_requests
  WHERE status IN ('completed', 'rejected')
    AND updated_at < NOW() - INTERVAL '3 years';
  GET DIAGNOSTICS v_lgpd_deleted = ROW_COUNT;

  RETURN jsonb_build_object(
    'purged_at',            NOW(),
    'audit_logs_deleted',   v_audit_deleted,
    'notif_logs_deleted',   v_notif_deleted,
    'rate_limits_deleted',  v_rate_deleted,
    'lgpd_req_deleted',     v_lgpd_deleted
  );
END;
$$;

-- Weekly cron: every Sunday at 03:00 UTC
-- Only schedule if not already present
DO $do$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-old-logs') THEN
    PERFORM cron.schedule(
      'purge-old-logs',
      '0 3 * * 0',
      'SELECT purge_old_logs();'
    );
  END IF;
END;
$do$;

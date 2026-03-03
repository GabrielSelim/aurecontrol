-- Sprint 10: Auditoria Central
-- View audit_log_full: joins contract_audit_logs with contracts and profiles

CREATE OR REPLACE VIEW audit_log_full AS
SELECT
  cal.id,
  cal.contract_id,
  cal.document_id,
  cal.action,
  cal.action_category,
  cal.actor_id,
  cal.actor_name,
  cal.actor_email,
  cal.details,
  cal.ip_address,
  cal.user_agent,
  cal.created_at,
  -- Contract info
  c.company_id,
  c.job_title         AS contract_job_title,
  c.contract_type,
  c.status            AS contract_status,
  -- Actor profile info
  p.full_name         AS actor_full_name
FROM contract_audit_logs cal
LEFT JOIN contracts c ON c.id = cal.contract_id
LEFT JOIN profiles p  ON p.user_id = cal.actor_id;

-- Performance indexes on contract_audit_logs
CREATE INDEX IF NOT EXISTS idx_cal_contract_id
  ON contract_audit_logs (contract_id);

CREATE INDEX IF NOT EXISTS idx_cal_actor_id
  ON contract_audit_logs (actor_id);

CREATE INDEX IF NOT EXISTS idx_cal_created_at
  ON contract_audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_cal_action
  ON contract_audit_logs (action);

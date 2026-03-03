-- Sprint 8: Centro Financeiro e Alertas
-- View: financeiro_dashboard — monthly payment aggregates by status

CREATE OR REPLACE VIEW financeiro_dashboard AS
SELECT
  p.company_id,
  DATE_TRUNC('month', p.created_at)::DATE AS month,
  COUNT(*) FILTER (WHERE p.status = 'pending')  AS pending_count,
  COUNT(*) FILTER (WHERE p.status = 'approved') AS approved_count,
  COUNT(*) FILTER (WHERE p.status = 'paid')     AS paid_count,
  COUNT(*) FILTER (WHERE p.status = 'rejected') AS rejected_count,
  SUM(p.amount) FILTER (WHERE p.status IN ('approved', 'paid')) AS total_approved,
  SUM(p.amount) FILTER (WHERE p.status = 'paid')               AS total_paid,
  SUM(p.amount) FILTER (WHERE p.status = 'pending')            AS total_pending
FROM payments p
GROUP BY p.company_id, DATE_TRUNC('month', p.created_at)::DATE;

-- View: payment_alerts — overdue and expiring-contract alerts per company
CREATE OR REPLACE VIEW payment_alerts AS
SELECT
  p.company_id,
  'overdue_payment' AS alert_type,
  p.id             AS reference_id,
  p.due_date       AS alert_date,
  CONCAT('Pagamento em atraso: R$ ', TO_CHAR(p.amount, 'FM999G999D99')) AS message
FROM payments p
WHERE p.status = 'pending'
  AND p.due_date IS NOT NULL
  AND p.due_date < CURRENT_DATE

UNION ALL

SELECT
  c.company_id,
  'contract_expiring' AS alert_type,
  c.id                AS reference_id,
  c.end_date          AS alert_date,
  CONCAT('Contrato vencendo em ', (c.end_date - CURRENT_DATE), ' dias') AS message
FROM contracts c
WHERE c.status = 'active'
  AND c.end_date IS NOT NULL
  AND c.end_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '30 days');

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_payments_company_status_created
  ON payments (company_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_payments_due_date_status
  ON payments (due_date, status)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_contracts_end_date_status
  ON contracts (end_date, status)
  WHERE status = 'active';

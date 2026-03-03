-- Sprint 4: Automação Financeira
-- Add payment_day to contracts (1-28, day of month payment is due)
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS payment_day INTEGER CHECK (payment_day BETWEEN 1 AND 28),
  ADD COLUMN IF NOT EXISTS monthly_value DECIMAL(10,2);

-- Add due_date to payments for more precise scheduling
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS due_date DATE;

-- View: pj_payment_queue — active PJ contracts pending payment generation
CREATE OR REPLACE VIEW public.pj_payment_queue AS
SELECT
  c.id AS contract_id,
  c.company_id,
  c.user_id,
  c.job_title,
  c.salary AS monthly_value,
  c.payment_frequency,
  c.payment_day,
  c.start_date,
  c.end_date,
  p.full_name,
  p.email
FROM public.contracts c
JOIN public.profiles p ON p.user_id = c.user_id
WHERE c.contract_type = 'PJ'
  AND c.status = 'active'
  AND c.salary IS NOT NULL;

-- Index for payment generation queries
CREATE INDEX IF NOT EXISTS idx_payments_contract_ref ON public.payments(contract_id, reference_month);
CREATE INDEX IF NOT EXISTS idx_contracts_pj_active ON public.contracts(company_id, contract_type, status) WHERE contract_type = 'PJ';

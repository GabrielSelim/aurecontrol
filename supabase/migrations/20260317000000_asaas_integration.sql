-- ============================================================
-- Asaas Payment Gateway Integration
-- Adds Asaas fields to company_billings and companies tables
-- ============================================================

-- Add Asaas customer ID to companies (created once per company)
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT;

-- Add Asaas charge fields to company_billings
ALTER TABLE company_billings
  ADD COLUMN IF NOT EXISTS asaas_charge_id    TEXT,
  ADD COLUMN IF NOT EXISTS asaas_payment_link TEXT,
  ADD COLUMN IF NOT EXISTS asaas_pix_payload  TEXT,
  ADD COLUMN IF NOT EXISTS asaas_boleto_url   TEXT,
  ADD COLUMN IF NOT EXISTS asaas_boleto_barcode TEXT;

-- Index for webhook lookup by charge ID
CREATE INDEX IF NOT EXISTS idx_company_billings_asaas_charge_id
  ON company_billings (asaas_charge_id)
  WHERE asaas_charge_id IS NOT NULL;

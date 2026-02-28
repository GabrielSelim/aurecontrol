-- Sprint 16: Contract payment splits / beneficiaries

CREATE TABLE IF NOT EXISTS contract_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  beneficiary_name TEXT NOT NULL,
  beneficiary_document TEXT,
  beneficiary_bank TEXT,
  beneficiary_agency TEXT,
  beneficiary_account TEXT,
  percentage NUMERIC(5,2) NOT NULL CHECK (percentage > 0 AND percentage <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contract_splits_contract_id ON contract_splits(contract_id);

-- RLS policies
ALTER TABLE contract_splits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view splits for their company contracts"
  ON contract_splits FOR SELECT
  USING (
    contract_id IN (
      SELECT id FROM contracts
      WHERE company_id IN (
        SELECT company_id FROM profiles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert splits for their company contracts"
  ON contract_splits FOR INSERT
  WITH CHECK (
    contract_id IN (
      SELECT id FROM contracts
      WHERE company_id IN (
        SELECT company_id FROM profiles WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete splits for their company contracts"
  ON contract_splits FOR DELETE
  USING (
    contract_id IN (
      SELECT id FROM contracts
      WHERE company_id IN (
        SELECT company_id FROM profiles WHERE user_id = auth.uid()
      )
    )
  );

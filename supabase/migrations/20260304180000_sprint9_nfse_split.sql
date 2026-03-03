-- Sprint 9: NFS-e e Split
-- Tabela nfse: controle de notas fiscais de serviço por contrato

CREATE TABLE IF NOT EXISTS nfse (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  numero TEXT,
  valor DECIMAL(10,2) NOT NULL,
  competencia DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'emitida', 'cancelada', 'erro')),
  xml TEXT,
  pdf_url TEXT,
  error_message TEXT,
  emitida_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nfse_contract_id ON nfse (contract_id);
CREATE INDEX IF NOT EXISTS idx_nfse_company_id ON nfse (company_id);
CREATE INDEX IF NOT EXISTS idx_nfse_competencia ON nfse (competencia DESC);
CREATE INDEX IF NOT EXISTS idx_nfse_status ON nfse (status);

ALTER TABLE nfse ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users can view nfse"
  ON nfse FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Company admins can manage nfse"
  ON nfse FOR ALL
  USING (
    company_id IN (
      SELECT company_id FROM profiles
      WHERE user_id = auth.uid()
        AND id IN (
          SELECT profile_id FROM user_roles
          WHERE role IN ('admin', 'financeiro', 'master_admin')
        )
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles
      WHERE user_id = auth.uid()
        AND id IN (
          SELECT profile_id FROM user_roles
          WHERE role IN ('admin', 'financeiro', 'master_admin')
        )
    )
  );

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_nfse_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_nfse_updated_at
BEFORE UPDATE ON nfse
FOR EACH ROW EXECUTE FUNCTION update_nfse_updated_at();

-- PJ Document uploads
-- PJ users can upload compliance documents (RG, CNPJ card, proof of address, etc.)

CREATE TABLE IF NOT EXISTS pj_documents (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  company_id  uuid REFERENCES companies(id) ON DELETE SET NULL,
  document_type text NOT NULL CHECK (document_type IN (
    'rg', 'cpf', 'cnpj_card', 'proof_of_address',
    'bank_statement', 'social_contract', 'other'
  )),
  file_name   text NOT NULL,
  file_path   text NOT NULL,   -- Supabase Storage path
  file_size   bigint,
  mime_type   text,
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason text,
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pj_documents_user_id   ON pj_documents (user_id);
CREATE INDEX IF NOT EXISTS idx_pj_documents_company_id ON pj_documents (company_id);
CREATE INDEX IF NOT EXISTS idx_pj_documents_status    ON pj_documents (status);

ALTER TABLE pj_documents ENABLE ROW LEVEL SECURITY;

-- PJ can see and insert their own documents
CREATE POLICY "pj_own_documents_select" ON pj_documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "pj_own_documents_insert" ON pj_documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "pj_own_documents_delete" ON pj_documents
  FOR DELETE USING (auth.uid() = user_id AND status = 'pending');

-- Admin/financeiro can view all documents for their company
CREATE POLICY "admin_company_documents" ON pj_documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'master_admin', 'financeiro', 'gestor')
        AND (company_id IS NULL OR ur.company_id = pj_documents.company_id)
    )
  );

-- Updated_at trigger
CREATE OR REPLACE FUNCTION pj_documents_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS pj_documents_updated_at_trigger ON pj_documents;
CREATE TRIGGER pj_documents_updated_at_trigger
  BEFORE UPDATE ON pj_documents
  FOR EACH ROW EXECUTE FUNCTION pj_documents_updated_at();

-- LGPD — Right to erasure / data deletion requests
-- Users can request deletion of their personal data (Art. 18 LGPD)

CREATE TABLE IF NOT EXISTS lgpd_deletion_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  requester_email text NOT NULL,
  reason          text,
  status          text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_review', 'completed', 'rejected')),
  reviewed_by     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at     timestamptz,
  rejection_reason text,
  anonymized_at   timestamptz,   -- set when data is actually wiped
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lgpd_requests_user_id ON lgpd_deletion_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_lgpd_requests_status  ON lgpd_deletion_requests (status);

ALTER TABLE lgpd_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Users can create and view their own requests
CREATE POLICY "lgpd_own_select" ON lgpd_deletion_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "lgpd_own_insert" ON lgpd_deletion_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Master admin can manage all
CREATE POLICY "lgpd_master_admin_all" ON lgpd_deletion_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'master_admin'
    )
  );

-- Updated_at trigger
CREATE OR REPLACE FUNCTION lgpd_requests_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS lgpd_requests_updated_at_trigger ON lgpd_deletion_requests;
CREATE TRIGGER lgpd_requests_updated_at_trigger
  BEFORE UPDATE ON lgpd_deletion_requests
  FOR EACH ROW EXECUTE FUNCTION lgpd_requests_updated_at();

-- Anonymization procedure: wipes PII for a given user
-- Called by master_admin after approving a deletion request
CREATE OR REPLACE FUNCTION anonymize_user_data(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_anon_name text := 'Usuário Removido';
  v_anon_email text := 'removed_' || substr(p_user_id::text, 1, 8) || '@anonimizado.invalid';
BEGIN
  -- Profiles
  UPDATE profiles SET
    full_name         = v_anon_name,
    email             = v_anon_email,
    phone             = NULL,
    cpf               = NULL,
    rg                = NULL,
    birth_date        = NULL,
    address           = NULL,
    city              = NULL,
    state             = NULL,
    zip_code          = NULL,
    bank_name         = NULL,
    bank_agency       = NULL,
    bank_account      = NULL,
    pix_key           = NULL,
    cnpj              = NULL,
    company_name      = NULL,
    avatar_url        = NULL
  WHERE id = p_user_id;

  -- Audit logs: redact actor info
  UPDATE audit_logs SET
    actor_name  = v_anon_name,
    actor_email = v_anon_email,
    ip_address  = NULL
  WHERE actor_email = (SELECT email FROM profiles WHERE id = p_user_id);

  -- Mark deletion request as completed
  UPDATE lgpd_deletion_requests SET
    status        = 'completed',
    anonymized_at = now()
  WHERE user_id = p_user_id AND status = 'in_review';
END;
$$;

COMMENT ON FUNCTION anonymize_user_data IS
  'Wipes PII for a user in compliance with LGPD Art.18. Called by master_admin.';

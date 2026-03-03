-- Sprint 7: Melhorias no Contrato — Anexos

-- Tabela de anexos de contratos
CREATE TABLE IF NOT EXISTS public.contrato_anexos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,  -- path no Storage bucket 'contrato-anexos'
  file_size BIGINT,
  mime_type TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.contrato_anexos ENABLE ROW LEVEL SECURITY;

-- RLS: admins/gestores da empresa podem ver e gerenciar
CREATE POLICY "Company users can view contract attachments"
  ON public.contrato_anexos FOR SELECT
  USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Company admins can manage contract attachments"
  ON public.contrato_anexos FOR ALL
  USING (
    public.is_company_admin(auth.uid(), company_id)
    OR public.has_role(auth.uid(), 'gestor')
    OR public.has_role(auth.uid(), 'master_admin')
  );

-- Index
CREATE INDEX IF NOT EXISTS idx_contrato_anexos_contract ON public.contrato_anexos(contract_id);

-- Storage bucket (precisa ser criado via dashboard ou seed)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('contrato-anexos', 'contrato-anexos', false) ON CONFLICT DO NOTHING;

-- Storage RLS policies (aplicar via dashboard ou migration de storage)

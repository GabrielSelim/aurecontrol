-- Add CLT-specific fields to contracts table
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS clt_employee_id    text,
  ADD COLUMN IF NOT EXISTS clt_ctps_number    text,
  ADD COLUMN IF NOT EXISTS clt_ctps_series    text,
  ADD COLUMN IF NOT EXISTS clt_cbo_code       text,
  ADD COLUMN IF NOT EXISTS clt_work_regime    text DEFAULT 'presencial';

COMMENT ON COLUMN public.contracts.clt_employee_id  IS 'Matrícula do colaborador CLT';
COMMENT ON COLUMN public.contracts.clt_ctps_number  IS 'Número da Carteira de Trabalho (CTPS)';
COMMENT ON COLUMN public.contracts.clt_ctps_series  IS 'Série da Carteira de Trabalho (CTPS)';
COMMENT ON COLUMN public.contracts.clt_cbo_code     IS 'Código CBO da ocupação';
COMMENT ON COLUMN public.contracts.clt_work_regime  IS 'Regime de trabalho: presencial, teletrabalho, hibrido, parcial';

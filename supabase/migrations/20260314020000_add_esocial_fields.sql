-- Add eSocial / payroll fields to contracts table (CLT)
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS pis_pasep          text,
  ADD COLUMN IF NOT EXISTS esocial_categoria  text DEFAULT '101',
  ADD COLUMN IF NOT EXISTS grau_instrucao     text,
  ADD COLUMN IF NOT EXISTS raca_cor           text,
  ADD COLUMN IF NOT EXISTS estado_civil       text,
  ADD COLUMN IF NOT EXISTS data_admissao      date;

COMMENT ON COLUMN public.contracts.pis_pasep         IS 'Número PIS/PASEP do colaborador CLT';
COMMENT ON COLUMN public.contracts.esocial_categoria IS 'Categoria do trabalhador no eSocial (ex: 101 = Empregado geral)';
COMMENT ON COLUMN public.contracts.grau_instrucao    IS 'Grau de instrução do colaborador (tabela eSocial)';
COMMENT ON COLUMN public.contracts.raca_cor          IS 'Raça/Cor do colaborador (tabela eSocial)';
COMMENT ON COLUMN public.contracts.estado_civil      IS 'Estado civil do colaborador';
COMMENT ON COLUMN public.contracts.data_admissao     IS 'Data de admissão para fins eSocial (pode diferir de start_date)';

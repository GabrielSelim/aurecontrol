-- Add bank data and tax fields to profiles for PJ contractors
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pj_bank_name        text,
  ADD COLUMN IF NOT EXISTS pj_bank_agency      text,
  ADD COLUMN IF NOT EXISTS pj_bank_account     text,
  ADD COLUMN IF NOT EXISTS pj_bank_account_type text DEFAULT 'corrente',
  ADD COLUMN IF NOT EXISTS pj_pix_key          text,
  ADD COLUMN IF NOT EXISTS pj_pix_key_type     text DEFAULT 'cpf',
  ADD COLUMN IF NOT EXISTS pj_regime_tributario text DEFAULT 'simples_nacional',
  ADD COLUMN IF NOT EXISTS pj_onboarding_done  boolean DEFAULT false;

COMMENT ON COLUMN public.profiles.pj_bank_name           IS 'Nome do banco do PJ';
COMMENT ON COLUMN public.profiles.pj_bank_agency         IS 'Agência bancária do PJ';
COMMENT ON COLUMN public.profiles.pj_bank_account        IS 'Conta bancária do PJ';
COMMENT ON COLUMN public.profiles.pj_bank_account_type   IS 'Tipo de conta: corrente ou poupanca';
COMMENT ON COLUMN public.profiles.pj_pix_key             IS 'Chave Pix do PJ';
COMMENT ON COLUMN public.profiles.pj_pix_key_type        IS 'Tipo de chave Pix: cpf, email, telefone, aleatoria';
COMMENT ON COLUMN public.profiles.pj_regime_tributario   IS 'Regime tributário: simples_nacional, lucro_presumido, mei';
COMMENT ON COLUMN public.profiles.pj_onboarding_done     IS 'Indica se o PJ completou o onboarding';

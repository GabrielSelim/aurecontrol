-- Add PJ (legal entity) fields to profiles table for contractors
ALTER TABLE public.profiles 
ADD COLUMN pj_cnpj text,
ADD COLUMN pj_razao_social text,
ADD COLUMN pj_nome_fantasia text;

-- Add comment to explain the fields
COMMENT ON COLUMN public.profiles.pj_cnpj IS 'CNPJ for PJ contractors';
COMMENT ON COLUMN public.profiles.pj_razao_social IS 'Legal company name for PJ contractors';
COMMENT ON COLUMN public.profiles.pj_nome_fantasia IS 'Trade name for PJ contractors';
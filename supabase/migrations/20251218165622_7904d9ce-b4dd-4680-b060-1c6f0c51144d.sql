-- Add representative/signer data fields to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS nationality text,
ADD COLUMN IF NOT EXISTS marital_status text,
ADD COLUMN IF NOT EXISTS birth_date date,
ADD COLUMN IF NOT EXISTS profession text,
ADD COLUMN IF NOT EXISTS identity_number text,
ADD COLUMN IF NOT EXISTS identity_issuer text;

-- Add comments for documentation
COMMENT ON COLUMN public.profiles.nationality IS 'Nationality of the user (e.g., Brasileira)';
COMMENT ON COLUMN public.profiles.marital_status IS 'Marital status (e.g., Solteiro, Casado)';
COMMENT ON COLUMN public.profiles.birth_date IS 'Date of birth';
COMMENT ON COLUMN public.profiles.profession IS 'Profession/occupation';
COMMENT ON COLUMN public.profiles.identity_number IS 'RG or identity document number';
COMMENT ON COLUMN public.profiles.identity_issuer IS 'Identity document issuer (e.g., SSP-MS, DRT SP)';

-- Add company_representative_id column to contract_documents to track which admin will sign
ALTER TABLE public.contract_documents
ADD COLUMN IF NOT EXISTS company_representative_id uuid REFERENCES auth.users(id);

COMMENT ON COLUMN public.contract_documents.company_representative_id IS 'The admin user who will sign the contract as company representative';
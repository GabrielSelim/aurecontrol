-- Add separate address fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN address_cep text,
ADD COLUMN address_street text,
ADD COLUMN address_number text,
ADD COLUMN address_complement text,
ADD COLUMN address_neighborhood text,
ADD COLUMN address_city text,
ADD COLUMN address_state text;

-- Add comments
COMMENT ON COLUMN public.profiles.address_cep IS 'CEP (postal code)';
COMMENT ON COLUMN public.profiles.address_street IS 'Street name (logradouro)';
COMMENT ON COLUMN public.profiles.address_number IS 'Street number';
COMMENT ON COLUMN public.profiles.address_complement IS 'Address complement (apartamento, bloco, etc)';
COMMENT ON COLUMN public.profiles.address_neighborhood IS 'Neighborhood (bairro)';
COMMENT ON COLUMN public.profiles.address_city IS 'City name';
COMMENT ON COLUMN public.profiles.address_state IS 'State abbreviation (UF)';
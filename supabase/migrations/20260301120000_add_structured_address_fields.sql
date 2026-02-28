-- Add structured address fields to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS address_cep TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS address_street TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS address_number TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS address_complement TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS address_neighborhood TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS address_city TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS address_state TEXT;

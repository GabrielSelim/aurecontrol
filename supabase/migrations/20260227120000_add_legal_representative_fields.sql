-- Add legal representative fields to companies table
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS legal_rep_name text,
  ADD COLUMN IF NOT EXISTS legal_rep_cpf text,
  ADD COLUMN IF NOT EXISTS legal_rep_rg text,
  ADD COLUMN IF NOT EXISTS legal_rep_rg_issuer text,
  ADD COLUMN IF NOT EXISTS legal_rep_nationality text,
  ADD COLUMN IF NOT EXISTS legal_rep_profession text;

-- Create storage bucket for company logos (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload logos
CREATE POLICY "Authenticated users can upload logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'logos');

-- Allow public read access to logos
CREATE POLICY "Public can read logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'logos');

-- Allow authenticated users to update/delete their logos
CREATE POLICY "Authenticated users can update logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'logos');

CREATE POLICY "Authenticated users can delete logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'logos');

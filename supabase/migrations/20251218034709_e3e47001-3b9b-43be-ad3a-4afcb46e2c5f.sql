-- Create storage bucket for contract signatures
INSERT INTO storage.buckets (id, name, public)
VALUES ('contract-signatures', 'contract-signatures', false);

-- Policy: Users can upload their own signatures
CREATE POLICY "Users can upload their own signatures"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'contract-signatures' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can view signatures in their company contracts
CREATE POLICY "Users can view contract signatures"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'contract-signatures'
  AND (
    -- User can see their own signatures
    auth.uid()::text = (storage.foldername(name))[1]
    OR
    -- Company admins and master admins can see all signatures
    public.is_master_admin(auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = auth.uid()
      AND public.is_company_admin(auth.uid(), p.company_id)
    )
  )
);

-- Policy: Users can update their own signatures
CREATE POLICY "Users can update their own signatures"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'contract-signatures'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own signatures
CREATE POLICY "Users can delete their own signatures"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'contract-signatures'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
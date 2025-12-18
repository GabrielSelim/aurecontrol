-- Add signing_token column to contract_signatures for public witness access
ALTER TABLE public.contract_signatures 
ADD COLUMN IF NOT EXISTS signing_token TEXT UNIQUE;

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_contract_signatures_signing_token 
ON public.contract_signatures(signing_token) WHERE signing_token IS NOT NULL;

-- Create function to generate signing token
CREATE OR REPLACE FUNCTION public.generate_signing_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.signer_type = 'witness' AND NEW.signing_token IS NULL THEN
    NEW.signing_token := encode(gen_random_bytes(32), 'hex');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-generate token for witnesses
DROP TRIGGER IF EXISTS set_signing_token ON public.contract_signatures;
CREATE TRIGGER set_signing_token
  BEFORE INSERT ON public.contract_signatures
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_signing_token();

-- Update existing witness signatures that don't have tokens
UPDATE public.contract_signatures 
SET signing_token = encode(gen_random_bytes(32), 'hex')
WHERE signer_type = 'witness' AND signing_token IS NULL;

-- Create RLS policy for public access to witness signatures via token
CREATE POLICY "Allow public access to witness signatures via token"
  ON public.contract_signatures
  FOR SELECT
  USING (signing_token IS NOT NULL);

CREATE POLICY "Allow witness to update their signature via token"
  ON public.contract_signatures
  FOR UPDATE
  USING (signing_token IS NOT NULL AND signed_at IS NULL)
  WITH CHECK (signing_token IS NOT NULL);
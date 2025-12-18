-- Add position fields to contract_signatures for drag-and-drop positioning
ALTER TABLE public.contract_signatures
ADD COLUMN IF NOT EXISTS position_x numeric DEFAULT 50,
ADD COLUMN IF NOT EXISTS position_y numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS position_page integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS position_width numeric DEFAULT 200,
ADD COLUMN IF NOT EXISTS position_height numeric DEFAULT 80;

-- Add comment for documentation
COMMENT ON COLUMN public.contract_signatures.position_x IS 'X position as percentage (0-100) from left';
COMMENT ON COLUMN public.contract_signatures.position_y IS 'Y position as percentage (0-100) from top';
COMMENT ON COLUMN public.contract_signatures.position_page IS 'Page number where signature should appear (1-indexed)';
COMMENT ON COLUMN public.contract_signatures.position_width IS 'Width of signature box in pixels';
COMMENT ON COLUMN public.contract_signatures.position_height IS 'Height of signature box in pixels';

-- Create table for external signature provider configurations (for future integration)
CREATE TABLE IF NOT EXISTS public.signature_provider_configs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  provider_name TEXT NOT NULL, -- 'clicksign', 'docusign', 'd4sign', 'autentique', 'zapsign'
  is_active BOOLEAN DEFAULT false,
  api_key_secret_name TEXT, -- Reference to the secret name in the secrets manager
  webhook_url TEXT,
  sandbox_mode BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(company_id, provider_name)
);

-- Enable RLS
ALTER TABLE public.signature_provider_configs ENABLE ROW LEVEL SECURITY;

-- Only company admins can view/manage provider configs
CREATE POLICY "Company admins can manage signature providers"
ON public.signature_provider_configs
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    JOIN user_roles ur ON ur.user_id = p.user_id
    WHERE p.company_id = signature_provider_configs.company_id
    AND p.user_id = auth.uid()
    AND ur.role IN ('admin', 'master_admin')
  )
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_signature_provider_company ON public.signature_provider_configs(company_id, is_active);
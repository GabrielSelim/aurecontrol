-- Fix views to use SECURITY INVOKER instead of SECURITY DEFINER
-- This ensures RLS policies of the querying user are enforced

-- Drop and recreate profiles_secure view with SECURITY INVOKER
DROP VIEW IF EXISTS public.profiles_secure;

CREATE VIEW public.profiles_secure 
WITH (security_invoker = true)
AS
SELECT 
  id,
  user_id,
  full_name,
  email,
  CASE 
    WHEN can_view_sensitive_profile_data(auth.uid(), company_id) THEN cpf
    ELSE NULL
  END as cpf,
  CASE 
    WHEN can_view_sensitive_profile_data(auth.uid(), company_id) THEN phone
    ELSE NULL
  END as phone,
  company_id,
  is_active,
  avatar_url,
  created_at,
  updated_at
FROM public.profiles;

GRANT SELECT ON public.profiles_secure TO authenticated;

-- Drop and recreate contracts_secure view with SECURITY INVOKER
DROP VIEW IF EXISTS public.contracts_secure;

CREATE VIEW public.contracts_secure 
WITH (security_invoker = true)
AS
SELECT 
  id,
  company_id,
  user_id,
  contract_type,
  job_title,
  department,
  start_date,
  end_date,
  status,
  document_url,
  notes,
  created_at,
  updated_at,
  created_by,
  CASE 
    WHEN is_admin_or_financeiro(auth.uid()) THEN salary
    ELSE NULL
  END as salary,
  CASE 
    WHEN is_admin_or_financeiro(auth.uid()) THEN hourly_rate
    ELSE NULL
  END as hourly_rate
FROM public.contracts;

GRANT SELECT ON public.contracts_secure TO authenticated;

-- Drop and recreate companies_secure view with SECURITY INVOKER
DROP VIEW IF EXISTS public.companies_secure;

CREATE VIEW public.companies_secure 
WITH (security_invoker = true)
AS
SELECT 
  id,
  name,
  cnpj,
  logo_url,
  is_active,
  created_at,
  updated_at,
  CASE 
    WHEN is_master_admin(auth.uid()) OR is_company_admin(auth.uid(), id) THEN email
    ELSE NULL
  END as email,
  CASE 
    WHEN is_master_admin(auth.uid()) OR is_company_admin(auth.uid(), id) THEN phone
    ELSE NULL
  END as phone,
  CASE 
    WHEN is_master_admin(auth.uid()) OR is_company_admin(auth.uid(), id) THEN address
    ELSE NULL
  END as address
FROM public.companies;

GRANT SELECT ON public.companies_secure TO authenticated;

-- Add explicit SELECT policy for system_settings to block non-master_admin access
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'system_settings' 
    AND policyname = 'Only master admins can read system settings'
  ) THEN
    DROP POLICY "Only master admins can read system settings" ON public.system_settings;
  END IF;
END $$;

CREATE POLICY "Only master admins can read system settings"
ON public.system_settings
FOR SELECT
USING (is_master_admin(auth.uid()));
-- Create helper function to check if user is admin or financeiro
CREATE OR REPLACE FUNCTION public.is_admin_or_financeiro(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('master_admin', 'admin', 'financeiro')
  )
$$;

-- Create helper function to check if user can view sensitive profile data
CREATE OR REPLACE FUNCTION public.can_view_sensitive_profile_data(_user_id uuid, _target_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    is_master_admin(_user_id) OR 
    is_company_admin(_user_id, _target_company_id)
$$;

-- Create a secure view for profiles that hides CPF from non-admins
-- First, drop any existing view
DROP VIEW IF EXISTS public.profiles_secure;

-- Create secure profiles view
CREATE VIEW public.profiles_secure AS
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

-- Grant access to authenticated users
GRANT SELECT ON public.profiles_secure TO authenticated;

-- Create secure view for contracts that hides salary from gestores
DROP VIEW IF EXISTS public.contracts_secure;

CREATE VIEW public.contracts_secure AS
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

-- Grant access to authenticated users
GRANT SELECT ON public.contracts_secure TO authenticated;

-- Create secure view for companies that limits contact info visibility
DROP VIEW IF EXISTS public.companies_secure;

CREATE VIEW public.companies_secure AS
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

-- Grant access to authenticated users
GRANT SELECT ON public.companies_secure TO authenticated;

-- Add policy for gestores to view profiles in their company (basic info only)
-- First check if policy exists and drop it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Gestores can view profiles in their company'
  ) THEN
    DROP POLICY "Gestores can view profiles in their company" ON public.profiles;
  END IF;
END $$;

-- Create new policy for gestores to view basic profile info
CREATE POLICY "Gestores can view profiles in their company"
ON public.profiles
FOR SELECT
USING (
  (company_id = get_user_company_id(auth.uid())) 
  AND has_role(auth.uid(), 'gestor'::app_role)
);

-- Add policy for financeiro to view profiles in their company
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Financeiro can view profiles in their company'
  ) THEN
    DROP POLICY "Financeiro can view profiles in their company" ON public.profiles;
  END IF;
END $$;

CREATE POLICY "Financeiro can view profiles in their company"
ON public.profiles
FOR SELECT
USING (
  (company_id = get_user_company_id(auth.uid())) 
  AND has_role(auth.uid(), 'financeiro'::app_role)
);
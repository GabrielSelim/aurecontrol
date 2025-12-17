
-- Drop existing RESTRICTIVE policies on profiles
DROP POLICY IF EXISTS "Admins can view all profiles in their company" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Drop existing RESTRICTIVE policies on companies
DROP POLICY IF EXISTS "Master admins can do everything on companies" ON public.companies;
DROP POLICY IF EXISTS "Users can view their own company" ON public.companies;

-- Create PERMISSIVE policies for profiles (using default PERMISSIVE behavior)
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all profiles in their company"
ON public.profiles FOR SELECT
USING (
  is_master_admin(auth.uid()) OR is_company_admin(auth.uid(), company_id)
);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (user_id = auth.uid());

-- Create PERMISSIVE policies for companies
CREATE POLICY "Users can view their own company"
ON public.companies FOR SELECT
USING (id = get_user_company_id(auth.uid()));

CREATE POLICY "Company admins can update their company"
ON public.companies FOR UPDATE
USING (is_company_admin(auth.uid(), id));

CREATE POLICY "Master admins can do everything on companies"
ON public.companies FOR ALL
USING (is_master_admin(auth.uid()));

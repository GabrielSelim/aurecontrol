-- Criar enum para tipos de roles
CREATE TYPE public.app_role AS ENUM ('master_admin', 'admin', 'financeiro', 'gestor', 'colaborador');

-- Criar enum para tipo de contrato
CREATE TYPE public.contract_type AS ENUM ('CLT', 'PJ');

-- Criar enum para status de convite
CREATE TYPE public.invite_status AS ENUM ('pending', 'accepted', 'expired', 'cancelled');

-- Criar enum para status de contrato
CREATE TYPE public.contract_status AS ENUM ('active', 'inactive', 'terminated');

-- Criar enum para status de pagamento
CREATE TYPE public.payment_status AS ENUM ('pending', 'approved', 'paid', 'rejected');

-- =============================================
-- TABELA: EMPRESAS (Companies)
-- =============================================
CREATE TABLE public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    cnpj TEXT UNIQUE NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    logo_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABELA: PROFILES (Perfis de usuários)
-- =============================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    cpf TEXT,
    phone TEXT,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABELA: USER_ROLES (Roles de usuários - SEPARADA para segurança)
-- =============================================
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABELA: INVITES (Convites)
-- =============================================
CREATE TABLE public.invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    email TEXT NOT NULL,
    role app_role NOT NULL,
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
    status invite_status DEFAULT 'pending',
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '7 days'),
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABELA: CONTRACTS (Contratos)
-- =============================================
CREATE TABLE public.contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    contract_type contract_type NOT NULL,
    job_title TEXT NOT NULL,
    department TEXT,
    salary DECIMAL(10,2),
    hourly_rate DECIMAL(10,2),
    start_date DATE NOT NULL,
    end_date DATE,
    status contract_status DEFAULT 'active',
    document_url TEXT,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- =============================================
-- TABELA: PAYMENTS (Pagamentos)
-- =============================================
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    reference_month DATE NOT NULL,
    description TEXT,
    status payment_status DEFAULT 'pending',
    payment_date DATE,
    proof_url TEXT,
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- =============================================
-- FUNÇÃO: has_role (Security Definer para evitar recursão)
-- =============================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- =============================================
-- FUNÇÃO: get_user_company_id
-- =============================================
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT company_id
    FROM public.profiles
    WHERE user_id = _user_id
$$;

-- =============================================
-- FUNÇÃO: is_master_admin
-- =============================================
CREATE OR REPLACE FUNCTION public.is_master_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.has_role(_user_id, 'master_admin')
$$;

-- =============================================
-- FUNÇÃO: is_company_admin
-- =============================================
CREATE OR REPLACE FUNCTION public.is_company_admin(_user_id UUID, _company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles p
        INNER JOIN public.user_roles ur ON ur.user_id = p.user_id
        WHERE p.user_id = _user_id
          AND p.company_id = _company_id
          AND ur.role IN ('admin', 'master_admin')
    )
$$;

-- =============================================
-- FUNÇÃO: update_updated_at_column
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- =============================================
-- TRIGGERS: Atualizar updated_at automaticamente
-- =============================================
CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON public.companies
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contracts_updated_at
    BEFORE UPDATE ON public.contracts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- RLS POLICIES: COMPANIES
-- =============================================
CREATE POLICY "Master admins can do everything on companies"
    ON public.companies FOR ALL
    TO authenticated
    USING (public.is_master_admin(auth.uid()));

CREATE POLICY "Users can view their own company"
    ON public.companies FOR SELECT
    TO authenticated
    USING (id = public.get_user_company_id(auth.uid()));

-- =============================================
-- RLS POLICIES: PROFILES
-- =============================================
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all profiles in their company"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (
        public.is_master_admin(auth.uid()) OR
        public.is_company_admin(auth.uid(), company_id)
    );

-- =============================================
-- RLS POLICIES: USER_ROLES
-- =============================================
CREATE POLICY "Users can view their own roles"
    ON public.user_roles FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Master admins can manage all roles"
    ON public.user_roles FOR ALL
    TO authenticated
    USING (public.is_master_admin(auth.uid()));

CREATE POLICY "Company admins can view roles of their company users"
    ON public.user_roles FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles p1
            WHERE p1.user_id = user_roles.user_id
              AND p1.company_id = public.get_user_company_id(auth.uid())
        ) AND public.has_role(auth.uid(), 'admin')
    );

-- =============================================
-- RLS POLICIES: INVITES
-- =============================================
CREATE POLICY "Master admins can manage all invites"
    ON public.invites FOR ALL
    TO authenticated
    USING (public.is_master_admin(auth.uid()));

CREATE POLICY "Company admins can manage their company invites"
    ON public.invites FOR ALL
    TO authenticated
    USING (public.is_company_admin(auth.uid(), company_id));

CREATE POLICY "Anyone can view invite by token for registration"
    ON public.invites FOR SELECT
    TO anon, authenticated
    USING (status = 'pending');

-- =============================================
-- RLS POLICIES: CONTRACTS
-- =============================================
CREATE POLICY "Users can view their own contracts"
    ON public.contracts FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Master admins can manage all contracts"
    ON public.contracts FOR ALL
    TO authenticated
    USING (public.is_master_admin(auth.uid()));

CREATE POLICY "Company admins can manage their company contracts"
    ON public.contracts FOR ALL
    TO authenticated
    USING (public.is_company_admin(auth.uid(), company_id));

CREATE POLICY "Gestores can view contracts in their company"
    ON public.contracts FOR SELECT
    TO authenticated
    USING (
        company_id = public.get_user_company_id(auth.uid()) AND
        public.has_role(auth.uid(), 'gestor')
    );

-- =============================================
-- RLS POLICIES: PAYMENTS
-- =============================================
CREATE POLICY "Users can view their own payments"
    ON public.payments FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Master admins can manage all payments"
    ON public.payments FOR ALL
    TO authenticated
    USING (public.is_master_admin(auth.uid()));

CREATE POLICY "Company admins can manage their company payments"
    ON public.payments FOR ALL
    TO authenticated
    USING (public.is_company_admin(auth.uid(), company_id));

CREATE POLICY "Financeiro can manage payments in their company"
    ON public.payments FOR ALL
    TO authenticated
    USING (
        company_id = public.get_user_company_id(auth.uid()) AND
        public.has_role(auth.uid(), 'financeiro')
    );

CREATE POLICY "Gestores can view payments in their company"
    ON public.payments FOR SELECT
    TO authenticated
    USING (
        company_id = public.get_user_company_id(auth.uid()) AND
        public.has_role(auth.uid(), 'gestor')
    );
-- Tabela de configurações do sistema
CREATE TABLE public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Inserir preço base por contrato PJ
INSERT INTO public.system_settings (key, value, description)
VALUES ('pj_contract_price', '{"amount": 49.90, "currency": "BRL"}', 'Preço base por contrato PJ ativo');

-- Tabela de cupons de desconto
CREATE TABLE public.discount_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value numeric NOT NULL,
  max_uses integer,
  current_uses integer DEFAULT 0,
  valid_from timestamp with time zone DEFAULT now(),
  valid_until timestamp with time zone,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Tabela de promoções
CREATE TABLE public.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value numeric NOT NULL,
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone NOT NULL,
  is_active boolean DEFAULT true,
  applies_to text DEFAULT 'all' CHECK (applies_to IN ('all', 'new_companies', 'existing_companies')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Tabela de pacotes promocionais (ex: 10+ contratos = desconto)
CREATE TABLE public.pricing_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  min_contracts integer NOT NULL,
  max_contracts integer,
  price_per_contract numeric NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Inserir pacotes padrão
INSERT INTO public.pricing_tiers (name, min_contracts, max_contracts, price_per_contract) VALUES
('Básico', 1, 10, 49.90),
('Profissional', 11, 50, 44.90),
('Empresarial', 51, 100, 39.90),
('Enterprise', 101, NULL, 34.90);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_tiers ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Only master admin can manage
CREATE POLICY "Master admins can manage system settings" ON public.system_settings
  FOR ALL USING (is_master_admin(auth.uid()));

CREATE POLICY "Master admins can manage coupons" ON public.discount_coupons
  FOR ALL USING (is_master_admin(auth.uid()));

CREATE POLICY "Master admins can manage promotions" ON public.promotions
  FOR ALL USING (is_master_admin(auth.uid()));

CREATE POLICY "Master admins can manage pricing tiers" ON public.pricing_tiers
  FOR ALL USING (is_master_admin(auth.uid()));

-- Anyone can read pricing tiers (for companies to see prices)
CREATE POLICY "Anyone can view pricing tiers" ON public.pricing_tiers
  FOR SELECT USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_discount_coupons_updated_at
  BEFORE UPDATE ON public.discount_coupons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_promotions_updated_at
  BEFORE UPDATE ON public.promotions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pricing_tiers_updated_at
  BEFORE UPDATE ON public.pricing_tiers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
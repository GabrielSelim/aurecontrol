-- ============================================================
-- Subscriptions: planos contratados pelas empresas
-- ============================================================

-- 1. Adiciona preço fixo mensal por plano em pricing_tiers
ALTER TABLE public.pricing_tiers
  ADD COLUMN IF NOT EXISTS subscription_monthly_price numeric;

UPDATE public.pricing_tiers SET subscription_monthly_price = 299.00  WHERE name = 'Básico';
UPDATE public.pricing_tiers SET subscription_monthly_price = 699.00  WHERE name = 'Profissional';
UPDATE public.pricing_tiers SET subscription_monthly_price = 1299.00 WHERE name = 'Empresarial';
UPDATE public.pricing_tiers SET subscription_monthly_price = 2499.00 WHERE name = 'Enterprise';

-- 2. Tabela de assinaturas
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id               uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  pricing_tier_id          uuid REFERENCES public.pricing_tiers(id),
  plan_name                text NOT NULL,
  cycle                    text NOT NULL CHECK (cycle IN ('monthly', 'annual')),
  status                   text NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'active', 'cancelled', 'expired', 'upgrading')),
  monthly_value            numeric NOT NULL,
  total_charged            numeric NOT NULL,
  discount_percent         numeric NOT NULL DEFAULT 0,
  starts_at                timestamptz,
  ends_at                  timestamptz,
  -- Asaas
  asaas_charge_id          text,
  asaas_payment_link       text,
  asaas_pix_payload        text,
  -- Upgrade tracking
  is_upgrade               boolean NOT NULL DEFAULT false,
  previous_subscription_id uuid REFERENCES public.subscriptions(id),
  notes                    text,
  created_at               timestamptz DEFAULT now(),
  updated_at               timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_company_id   ON public.subscriptions (company_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status       ON public.subscriptions (status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_asaas_charge ON public.subscriptions (asaas_charge_id)
  WHERE asaas_charge_id IS NOT NULL;

-- Trigger updated_at
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Referência de assinatura ativa na empresa
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS active_subscription_id uuid REFERENCES public.subscriptions(id);

-- 4. RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Master admins veem tudo
CREATE POLICY "master_admin_full_subscriptions" ON public.subscriptions
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'master_admin'
    )
  );

-- Admins da empresa veem a própria
CREATE POLICY "company_admin_own_subscriptions" ON public.subscriptions
  FOR SELECT
  USING (
    company_id IN (
      SELECT p.company_id FROM public.profiles p WHERE p.user_id = auth.uid()
    )
  );

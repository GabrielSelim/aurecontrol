-- Tabela de faturas/cobranças do sistema
CREATE TABLE public.company_billings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  reference_month date NOT NULL,
  pj_contracts_count integer NOT NULL DEFAULT 0,
  unit_price numeric NOT NULL,
  discount_amount numeric DEFAULT 0,
  discount_description text,
  coupon_id uuid REFERENCES public.discount_coupons(id),
  promotion_id uuid REFERENCES public.promotions(id),
  subtotal numeric NOT NULL,
  total numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  due_date date NOT NULL,
  paid_at timestamp with time zone,
  payment_method text,
  payment_proof_url text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_company_billings_company_id ON public.company_billings(company_id);
CREATE INDEX idx_company_billings_status ON public.company_billings(status);
CREATE INDEX idx_company_billings_reference_month ON public.company_billings(reference_month);

-- Enable RLS
ALTER TABLE public.company_billings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Master admins can manage all billings" ON public.company_billings
  FOR ALL USING (is_master_admin(auth.uid()));

CREATE POLICY "Company admins can view their billings" ON public.company_billings
  FOR SELECT USING (company_id = get_user_company_id(auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER update_company_billings_updated_at
  BEFORE UPDATE ON public.company_billings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
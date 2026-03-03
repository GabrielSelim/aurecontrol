-- Sprint 5: In-app Notifications (tabela separada de notification_logs que é email)

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',  -- info | success | warning | error
  event_type TEXT,                    -- contract_signed | signature_pending | payment_due | contract_expiring
  contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Service role can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications(user_id, read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications(user_id, created_at DESC);

-- ============================================================
-- Trigger: notify contract admin when all signatures complete
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_on_contract_signed()
RETURNS TRIGGER AS $$
DECLARE
  v_contract RECORD;
  v_creator_id UUID;
BEGIN
  -- Only when signature_status becomes 'completed'
  IF NEW.signature_status <> 'completed' OR OLD.signature_status = 'completed' THEN
    RETURN NEW;
  END IF;

  -- Fetch contract basics
  SELECT c.id, c.job_title, c.created_by, c.company_id
    INTO v_contract
    FROM public.contracts c
   WHERE c.id = NEW.contract_id;

  IF v_contract.created_by IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, title, message, type, event_type, contract_id)
    VALUES (
      v_contract.created_by,
      'Contrato totalmente assinado',
      'O contrato "' || v_contract.job_title || '" foi assinado por todos os participantes.',
      'success',
      'contract_signed',
      v_contract.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_notify_contract_signed
  AFTER UPDATE OF signature_status ON public.contract_documents
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_contract_signed();

-- ============================================================
-- Trigger: notify user when they have a pending signature
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_on_signature_pending()
RETURNS TRIGGER AS $$
DECLARE
  v_contract RECORD;
BEGIN
  -- Only on new signature requests with pending status
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' AND NEW.user_id IS NOT NULL THEN
    SELECT c.id, c.job_title INTO v_contract
      FROM public.contracts c WHERE c.id = NEW.contract_id;

    INSERT INTO public.notifications(user_id, title, message, type, event_type, contract_id)
    VALUES (
      NEW.user_id,
      'Assinatura pendente',
      'Você tem uma assinatura pendente no contrato "' || COALESCE(v_contract.job_title, 'sem título') || '".',
      'warning',
      'signature_pending',
      NEW.contract_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_notify_signature_pending
  AFTER INSERT ON public.contract_signatures
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_signature_pending();

-- ============================================================
-- Trigger: notify admin when PJ payment is created (needs approval)
-- ============================================================
CREATE OR REPLACE FUNCTION public.notify_on_payment_pending()
RETURNS TRIGGER AS $$
DECLARE
  v_admin_ids UUID[];
  v_admin_id UUID;
  v_amount TEXT;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    v_amount := 'R$ ' || REPLACE(TO_CHAR(NEW.amount, 'FM999G999G990D00'), '.', ',');

    -- Notify all admins of the company
    SELECT ARRAY_AGG(p.user_id) INTO v_admin_ids
      FROM public.profiles p
      JOIN public.user_roles ur ON ur.user_id = p.user_id
     WHERE p.company_id = NEW.company_id
       AND ur.role IN ('admin', 'master_admin', 'financeiro');

    IF v_admin_ids IS NOT NULL THEN
      FOREACH v_admin_id IN ARRAY v_admin_ids LOOP
        INSERT INTO public.notifications(user_id, title, message, type, event_type, contract_id)
        VALUES (
          v_admin_id,
          'Novo pagamento pendente de aprovação',
          'Pagamento de ' || v_amount || ' aguarda aprovação.',
          'info',
          'payment_pending',
          NEW.contract_id
        );
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_notify_payment_pending
  AFTER INSERT ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_payment_pending();

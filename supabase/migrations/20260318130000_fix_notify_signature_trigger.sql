-- Fix notify_on_signature_pending() which referenced non-existent columns
-- (NEW.status, NEW.user_id, NEW.contract_id) on the contract_signatures table.
-- These should be: no status column (every insert is "pending"), NEW.signer_user_id, and
-- contract_id is obtained via contract_documents join.

CREATE OR REPLACE FUNCTION notify_on_signature_pending()
RETURNS TRIGGER AS $$
DECLARE
  v_job_title TEXT;
  v_contract_id UUID;
BEGIN
  -- Only notify if there's a specific internal user to notify
  IF TG_OP = 'INSERT' AND NEW.signer_user_id IS NOT NULL THEN
    -- Resolve contract info through contract_documents
    SELECT c.id, c.job_title
      INTO v_contract_id, v_job_title
      FROM public.contract_documents cd
      JOIN public.contracts c ON c.id = cd.contract_id
     WHERE cd.id = NEW.document_id;

    INSERT INTO public.notifications(user_id, title, message, type, event_type, contract_id)
    VALUES (
      NEW.signer_user_id,
      'Assinatura pendente',
      'Você tem uma assinatura pendente no contrato "' || COALESCE(v_job_title, 'sem título') || '".',
      'warning',
      'signature_pending',
      v_contract_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also fix the default position_y from 0 to 85 so new signatures are visible
-- without manual repositioning (y=0 with translate(-50%,-50%) hides elements above the container)
ALTER TABLE public.contract_signatures
  ALTER COLUMN position_y SET DEFAULT 85;

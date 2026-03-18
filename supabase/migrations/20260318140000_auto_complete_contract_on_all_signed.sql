-- Trigger that automatically marks a contract as fully signed once all
-- signature records have signed_at set.
-- Runs SECURITY DEFINER so it bypasses RLS — works whether the signer is
-- an internal admin or an external (unauthenticated) user via token link.

CREATE OR REPLACE FUNCTION auto_complete_contract_on_all_signed()
RETURNS TRIGGER AS $$
DECLARE
  v_total     INTEGER;
  v_completed INTEGER;
  v_doc_id    UUID;
  v_contract_id UUID;
BEGIN
  -- Only react when signed_at transitions from NULL → a value
  IF NEW.signed_at IS NULL OR OLD.signed_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_doc_id := NEW.document_id;

  -- Count total vs signed
  SELECT COUNT(*),
         COUNT(signed_at)
    INTO v_total, v_completed
    FROM public.contract_signatures
   WHERE document_id = v_doc_id;

  IF v_completed >= v_total AND v_total > 0 THEN
    -- Resolve the contract_id via contract_documents
    SELECT contract_id INTO v_contract_id
      FROM public.contract_documents
     WHERE id = v_doc_id;

    -- Mark document as completed
    UPDATE public.contract_documents
       SET signature_status = 'completed',
           completed_at = NOW()
     WHERE id = v_doc_id;

    -- Mark contract as assinado
    UPDATE public.contracts
       SET status = 'assinado'
     WHERE id = v_contract_id;
  ELSE
    -- At least one has signed — mark partial if not already completed
    UPDATE public.contract_documents
       SET signature_status = CASE
             WHEN signature_status = 'completed' THEN 'completed'
             ELSE 'partial'
           END
     WHERE id = v_doc_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop old trigger if it exists, then recreate
DROP TRIGGER IF EXISTS trg_auto_complete_contract ON public.contract_signatures;

CREATE TRIGGER trg_auto_complete_contract
  AFTER UPDATE OF signed_at ON public.contract_signatures
  FOR EACH ROW
  EXECUTE FUNCTION auto_complete_contract_on_all_signed();

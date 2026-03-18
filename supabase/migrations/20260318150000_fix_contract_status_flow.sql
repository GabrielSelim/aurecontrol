-- Migration: Fix contract status lifecycle
-- PJ contracts now start as 'enviado' (sent for signing).
-- When all parties sign, the contract becomes 'active' (vigente), not 'assinado'.
-- The signing completion is already tracked via contract_documents.signature_status.

-- 1. Recreate the auto-complete trigger to set status = 'active' after all sign
CREATE OR REPLACE FUNCTION auto_complete_contract_on_all_signed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_document_id   uuid;
  v_contract_id   uuid;
  v_total         int;
  v_signed        int;
BEGIN
  -- Only act when signed_at goes from NULL to a non-null value
  IF OLD.signed_at IS NOT NULL OR NEW.signed_at IS NULL THEN
    RETURN NEW;
  END IF;

  v_document_id := NEW.document_id;

  -- Count total & signed required signatures (exclude witnesses without user_id
  -- if they were left empty — count them all to be safe)
  SELECT COUNT(*)                          INTO v_total  FROM contract_signatures WHERE document_id = v_document_id;
  SELECT COUNT(*) FILTER (WHERE signed_at IS NOT NULL) INTO v_signed FROM contract_signatures WHERE document_id = v_document_id;

  -- If all signatures are complete, mark the document and contract as done
  IF v_signed >= v_total THEN
    -- Get the contract id through the document
    SELECT contract_id INTO v_contract_id
    FROM contract_documents
    WHERE id = v_document_id;

    -- Mark the document as completed
    UPDATE contract_documents
    SET signature_status = 'completed',
        completed_at = NOW()
    WHERE id = v_document_id;

    -- Mark the contract as 'active' (vigente) — the fully executed contract
    UPDATE contracts
    SET status = 'active'
    WHERE id = v_contract_id;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Migrate contracts that were previously set to 'assinado' → 'active'
--    (These were set by the old version of the trigger or manual patch)
UPDATE contracts
SET status = 'active'
WHERE status = 'assinado';

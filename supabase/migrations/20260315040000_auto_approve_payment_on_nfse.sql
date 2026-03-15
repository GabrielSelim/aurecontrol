-- Auto-approval queue for payments
-- When an NFS-e is marked as 'emitida' for a contract, any pending payment
-- for the same contract + reference_month is automatically approved.

-- Function: auto-approve pending payments when NFS-e turns 'emitida'
CREATE OR REPLACE FUNCTION auto_approve_payment_on_nfse()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_payment_date date := CURRENT_DATE;
  v_system_user  uuid;
BEGIN
  -- Only trigger when status transitions TO 'emitida'
  IF NEW.status <> 'emitida' OR OLD.status = 'emitida' THEN
    RETURN NEW;
  END IF;

  -- Auto-approve matching pending payments (same contract, same reference month)
  UPDATE payments
  SET
    status       = 'paid',
    payment_date = v_payment_date,
    approved_at  = now(),
    notes        = coalesce(notes || E'\n', '') ||
                   '[Auto-aprovado] NFS-e ' || coalesce(NEW.numero, NEW.id::text) ||
                   ' emitida em ' || to_char(now(), 'DD/MM/YYYY HH24:MI')
  WHERE
    contract_id      = NEW.contract_id
    AND status       = 'pending'
    -- Match competencia YYYY-MM with reference_month date (first day of month)
    AND to_char(reference_month, 'YYYY-MM') = NEW.competencia;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION auto_approve_payment_on_nfse IS
  'Fires after NFS-e marked emitida — auto-approves matching pending payments for same contract + month.';

-- Attach the trigger to the nfse table
DROP TRIGGER IF EXISTS trigger_auto_approve_payment ON nfse;
CREATE TRIGGER trigger_auto_approve_payment
  AFTER UPDATE OF status ON nfse
  FOR EACH ROW
  EXECUTE FUNCTION auto_approve_payment_on_nfse();

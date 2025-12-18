-- Create function to notify when contract is fully signed
CREATE OR REPLACE FUNCTION public.notify_contract_signed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  supabase_url text;
  service_role_key text;
BEGIN
  -- Only proceed if signature_status changed to 'completed'
  IF NEW.signature_status = 'completed' AND (OLD.signature_status IS NULL OR OLD.signature_status <> 'completed') THEN
    -- Get the edge function URL from environment
    supabase_url := current_setting('app.settings.supabase_url', true);
    
    -- Call the edge function asynchronously via pg_net if available
    -- For now, we'll use a simpler approach with http extension
    PERFORM net.http_post(
      url := 'https://okphvwfomnjeltkydsqw.supabase.co/functions/v1/contract-signed-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object(
        'type', 'UPDATE',
        'table', 'contract_documents',
        'record', jsonb_build_object(
          'id', NEW.id,
          'contract_id', NEW.contract_id,
          'signature_status', NEW.signature_status,
          'completed_at', NEW.completed_at
        ),
        'old_record', jsonb_build_object(
          'signature_status', OLD.signature_status
        )
      )
    );
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'Failed to send contract signed notification: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create trigger for contract signed notification
DROP TRIGGER IF EXISTS on_contract_fully_signed ON public.contract_documents;
CREATE TRIGGER on_contract_fully_signed
  AFTER UPDATE ON public.contract_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_contract_signed();
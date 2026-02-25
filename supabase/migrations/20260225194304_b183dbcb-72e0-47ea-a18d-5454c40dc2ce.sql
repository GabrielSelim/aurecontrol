
-- Table for user notification preferences
CREATE TABLE public.notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  notification_type text NOT NULL,
  channel_email boolean NOT NULL DEFAULT true,
  channel_in_app boolean NOT NULL DEFAULT true,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, notification_type)
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own preferences"
ON public.notification_preferences FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own preferences"
ON public.notification_preferences FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own preferences"
ON public.notification_preferences FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own preferences"
ON public.notification_preferences FOR DELETE
USING (user_id = auth.uid());

CREATE TRIGGER update_notification_preferences_updated_at
BEFORE UPDATE ON public.notification_preferences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Table for delivery logs with retry tracking
CREATE TABLE public.notification_delivery_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_log_id uuid REFERENCES public.notification_logs(id) ON DELETE CASCADE,
  attempt_number integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending',
  channel text NOT NULL DEFAULT 'email',
  error_message text,
  error_code text,
  response_data jsonb,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  idempotency_key text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_delivery_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master admins can view all delivery logs"
ON public.notification_delivery_logs FOR SELECT
USING (is_master_admin(auth.uid()));

CREATE POLICY "Company admins can view their delivery logs"
ON public.notification_delivery_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM notification_logs nl
    WHERE nl.id = notification_delivery_logs.notification_log_id
    AND nl.company_id = get_user_company_id(auth.uid())
    AND is_company_admin(auth.uid(), nl.company_id)
  )
);

-- Add new columns to notification_logs for better tracking
ALTER TABLE public.notification_logs
ADD COLUMN IF NOT EXISTS event_type text,
ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_retries integer DEFAULT 3,
ADD COLUMN IF NOT EXISTS last_retry_at timestamptz,
ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
ADD COLUMN IF NOT EXISTS idempotency_key text UNIQUE,
ADD COLUMN IF NOT EXISTS channel text DEFAULT 'email',
ADD COLUMN IF NOT EXISTS user_id uuid;

-- Create index for faster queries
CREATE INDEX idx_notification_logs_event_type ON public.notification_logs(event_type);
CREATE INDEX idx_notification_logs_status ON public.notification_logs(status);
CREATE INDEX idx_notification_logs_user_id ON public.notification_logs(user_id);
CREATE INDEX idx_notification_delivery_logs_notification ON public.notification_delivery_logs(notification_log_id);
CREATE INDEX idx_notification_delivery_logs_status ON public.notification_delivery_logs(status);
CREATE INDEX idx_notification_preferences_user ON public.notification_preferences(user_id);

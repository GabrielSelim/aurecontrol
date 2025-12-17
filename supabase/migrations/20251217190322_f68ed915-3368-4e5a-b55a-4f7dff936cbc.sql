-- Create notifications history table
CREATE TABLE public.notification_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  recipient_email TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- Master admins can view all notifications
CREATE POLICY "Master admins can view all notification logs"
ON public.notification_logs
FOR SELECT
USING (is_master_admin(auth.uid()));

-- Company admins can view their company notifications
CREATE POLICY "Company admins can view their notification logs"
ON public.notification_logs
FOR SELECT
USING (company_id = get_user_company_id(auth.uid()) AND is_company_admin(auth.uid(), company_id));

-- Create index for better performance
CREATE INDEX idx_notification_logs_company_id ON public.notification_logs(company_id);
CREATE INDEX idx_notification_logs_created_at ON public.notification_logs(created_at DESC);
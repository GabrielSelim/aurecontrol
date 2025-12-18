-- Create system_announcements table for Master Admin messages
CREATE TABLE public.system_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  target_type text NOT NULL DEFAULT 'all', -- 'all', 'company', 'role'
  target_company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  target_roles text[] DEFAULT '{}', -- Array of roles: ['admin', 'financeiro', 'gestor', 'colaborador', 'juridico']
  priority text NOT NULL DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone
);

-- Create table to track which users have read announcements
CREATE TABLE public.announcement_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES public.system_announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at timestamp with time zone DEFAULT now(),
  UNIQUE(announcement_id, user_id)
);

-- Enable RLS
ALTER TABLE public.system_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

-- Master admins can manage all announcements
CREATE POLICY "Master admins can manage announcements"
ON public.system_announcements
FOR ALL
USING (is_master_admin(auth.uid()));

-- Users can view announcements targeted to them
CREATE POLICY "Users can view targeted announcements"
ON public.system_announcements
FOR SELECT
USING (
  is_active = true
  AND (expires_at IS NULL OR expires_at > now())
  AND (
    -- All users
    target_type = 'all'
    -- Specific company
    OR (target_type = 'company' AND target_company_id = get_user_company_id(auth.uid()))
    -- Specific role
    OR (target_type = 'role' AND EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role::text = ANY(target_roles)
    ))
  )
);

-- Users can manage their own read status
CREATE POLICY "Users can manage their read status"
ON public.announcement_reads
FOR ALL
USING (user_id = auth.uid());

-- Create index for faster queries
CREATE INDEX idx_announcements_active ON public.system_announcements(is_active, expires_at);
CREATE INDEX idx_announcements_target ON public.system_announcements(target_type, target_company_id);
CREATE INDEX idx_announcement_reads_user ON public.announcement_reads(user_id, announcement_id);
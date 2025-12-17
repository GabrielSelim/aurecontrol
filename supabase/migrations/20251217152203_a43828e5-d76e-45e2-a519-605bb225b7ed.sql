-- Drop the insecure policy
DROP POLICY IF EXISTS "Anyone can view invite by token for registration" ON public.invites;

-- Create a secure function to get invite by token (only returns specific invite)
CREATE OR REPLACE FUNCTION public.get_invite_by_token(_token text)
RETURNS TABLE (
  id uuid,
  email text,
  company_id uuid,
  role app_role,
  status invite_status,
  expires_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    i.id,
    i.email,
    i.company_id,
    i.role,
    i.status,
    i.expires_at
  FROM public.invites i
  WHERE i.token = _token
    AND i.status = 'pending'
    AND i.expires_at > now()
  LIMIT 1
$$;
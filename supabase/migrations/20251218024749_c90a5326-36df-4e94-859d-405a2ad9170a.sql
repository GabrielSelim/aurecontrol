-- Drop the existing policy to recreate with new logic
DROP POLICY IF EXISTS "Users can view targeted announcements" ON public.system_announcements;

-- Create updated policy that handles company + role targeting
CREATE POLICY "Users can view targeted announcements" 
ON public.system_announcements 
FOR SELECT 
USING (
  (is_active = true) 
  AND ((expires_at IS NULL) OR (expires_at > now())) 
  AND (
    -- All users
    (target_type = 'all') 
    OR 
    -- Specific company (all users in that company)
    (target_type = 'company' AND target_company_id = get_user_company_id(auth.uid()) AND (target_roles IS NULL OR array_length(target_roles, 1) IS NULL OR array_length(target_roles, 1) = 0))
    OR 
    -- Specific roles (across all companies)
    (target_type = 'role' AND (target_company_id IS NULL) AND EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND (ur.role)::text = ANY(system_announcements.target_roles)
    ))
    OR
    -- Company + specific roles (specific roles within a specific company)
    (target_type = 'company_role' AND target_company_id = get_user_company_id(auth.uid()) AND EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND (ur.role)::text = ANY(system_announcements.target_roles)
    ))
  )
);
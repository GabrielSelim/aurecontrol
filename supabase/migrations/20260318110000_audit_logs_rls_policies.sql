-- Fix: contract_audit_logs had RLS enabled but no policies
-- This silently blocked all INSERT operations from authenticated users

-- Allow any authenticated user to insert (log their actions)
CREATE POLICY "Authenticated users can insert audit logs"
  ON public.contract_audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Master admin can read all audit logs
CREATE POLICY "Master admin can read all audit logs"
  ON public.contract_audit_logs
  FOR SELECT
  TO authenticated
  USING (is_master_admin(auth.uid()));

-- Company admins can read audit logs for their own company's contracts
CREATE POLICY "Company admins can read their own audit logs"
  ON public.contract_audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.contracts c
      WHERE c.id = contract_id
      AND is_company_admin(auth.uid(), c.company_id)
    )
  );

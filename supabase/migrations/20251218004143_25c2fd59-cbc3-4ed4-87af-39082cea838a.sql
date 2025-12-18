-- Create RLS policy for juridico role to view contracts in their company
CREATE POLICY "Juridico can view contracts in their company" 
ON public.contracts 
FOR SELECT 
USING ((company_id = get_user_company_id(auth.uid())) AND has_role(auth.uid(), 'juridico'::app_role));
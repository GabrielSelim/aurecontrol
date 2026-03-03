-- Add 'pj' to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'pj';

-- RLS: PJ users can only read their own profile
CREATE POLICY IF NOT EXISTS "pj_select_own_profile"
  ON public.profiles
  FOR SELECT
  USING (user_id = auth.uid());

-- RLS: PJ users can only read contracts where they are the contractor (user_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'contracts' AND policyname = 'pj_select_own_contracts'
  ) THEN
    CREATE POLICY "pj_select_own_contracts"
      ON public.contracts
      FOR SELECT
      USING (
        user_id = auth.uid()
        AND has_role(auth.uid(), 'pj'::app_role)
      );
  END IF;
END $$;

-- RLS: PJ users can read their own contract documents
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'contract_documents' AND policyname = 'pj_select_own_documents'
  ) THEN
    CREATE POLICY "pj_select_own_documents"
      ON public.contract_documents
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.contracts c
          WHERE c.id = contract_documents.contract_id
            AND c.user_id = auth.uid()
            AND has_role(auth.uid(), 'pj'::app_role)
        )
      );
  END IF;
END $$;

-- RLS: PJ can read their own signatures
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'contract_signatures' AND policyname = 'pj_select_own_signatures'
  ) THEN
    CREATE POLICY "pj_select_own_signatures"
      ON public.contract_signatures
      FOR SELECT
      USING (signer_user_id = auth.uid());
  END IF;
END $$;

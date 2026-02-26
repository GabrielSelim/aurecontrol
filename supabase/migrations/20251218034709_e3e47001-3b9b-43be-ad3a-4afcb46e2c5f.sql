-- ============================================================
-- Bootstrap: criar tabelas e funcoes de storage caso o Storage API
-- ainda nao tenha iniciado (ele usa IF NOT EXISTS tambem).
-- ============================================================
CREATE TABLE IF NOT EXISTS storage.buckets (
  id text PRIMARY KEY,
  name text NOT NULL,
  owner uuid,
  public boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS bname ON storage.buckets USING btree (name);

CREATE TABLE IF NOT EXISTS storage.objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text REFERENCES storage.buckets(id),
  name text,
  owner uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_accessed_at timestamptz DEFAULT now(),
  metadata jsonb
);
CREATE UNIQUE INDEX IF NOT EXISTS bucketid_objname ON storage.objects USING btree (bucket_id, name);

CREATE OR REPLACE FUNCTION storage.foldername(name text)
RETURNS text[]
LANGUAGE plpgsql AS $$
DECLARE _parts text[];
BEGIN
  SELECT string_to_array(name, '/') INTO _parts;
  RETURN _parts[1:array_length(_parts,1)-1];
END
$$;

-- ============================================================
-- Migration: contract-signatures bucket + policies
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('contract-signatures', 'contract-signatures', false)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Users can upload their own signatures
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can upload their own signatures' AND tablename = 'objects') THEN
    CREATE POLICY "Users can upload their own signatures"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
      bucket_id = 'contract-signatures' 
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;

-- Policy: Users can view signatures in their company contracts
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view contract signatures' AND tablename = 'objects') THEN
    CREATE POLICY "Users can view contract signatures"
    ON storage.objects
    FOR SELECT
    USING (
      bucket_id = 'contract-signatures'
      AND (
        auth.uid()::text = (storage.foldername(name))[1]
        OR
        public.is_master_admin(auth.uid())
        OR
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.user_id = auth.uid()
          AND public.is_company_admin(auth.uid(), p.company_id)
        )
      )
    );
  END IF;
END $$;

-- Policy: Users can update their own signatures
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own signatures' AND tablename = 'objects') THEN
    CREATE POLICY "Users can update their own signatures"
    ON storage.objects
    FOR UPDATE
    USING (
      bucket_id = 'contract-signatures'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;

-- Policy: Users can delete their own signatures
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete their own signatures' AND tablename = 'objects') THEN
    CREATE POLICY "Users can delete their own signatures"
    ON storage.objects
    FOR DELETE
    USING (
      bucket_id = 'contract-signatures'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;
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
-- Migration: avatars bucket + policies
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to upload their own avatar
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can upload their own avatar' AND tablename = 'objects') THEN
    CREATE POLICY "Users can upload their own avatar"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'avatars' 
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;

-- Allow authenticated users to update their own avatar
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own avatar' AND tablename = 'objects') THEN
    CREATE POLICY "Users can update their own avatar"
    ON storage.objects FOR UPDATE
    USING (
      bucket_id = 'avatars' 
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;

-- Allow authenticated users to delete their own avatar
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete their own avatar' AND tablename = 'objects') THEN
    CREATE POLICY "Users can delete their own avatar"
    ON storage.objects FOR DELETE
    USING (
      bucket_id = 'avatars' 
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;

-- Allow public access to view avatars
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view avatars' AND tablename = 'objects') THEN
    CREATE POLICY "Anyone can view avatars"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');
  END IF;
END $$;
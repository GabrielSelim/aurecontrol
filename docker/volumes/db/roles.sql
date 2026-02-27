-- NOTE: This file runs during PostgreSQL initialization as superuser.
-- It sets all service role passwords to match POSTGRES_PASSWORD,
-- fixes ownership for GoTrue auth, and prepares schemas.
\set pgpass `echo "$POSTGRES_PASSWORD"`

-- Set passwords for all service roles
ALTER USER authenticator WITH PASSWORD :'pgpass';
ALTER USER supabase_auth_admin WITH PASSWORD :'pgpass';
ALTER USER supabase_storage_admin WITH PASSWORD :'pgpass';
ALTER USER supabase_admin WITH PASSWORD :'pgpass';

-- Fix auth schema ownership so GoTrue can run its migrations
ALTER SCHEMA auth OWNER TO supabase_auth_admin;
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT p.oid::regprocedure AS fn FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'auth'
  LOOP EXECUTE 'ALTER FUNCTION ' || r.fn || ' OWNER TO supabase_auth_admin'; END LOOP;
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'auth'
  LOOP EXECUTE 'ALTER TABLE auth.' || quote_ident(r.tablename) || ' OWNER TO supabase_auth_admin'; END LOOP;
  FOR r IN SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'auth'
  LOOP EXECUTE 'ALTER SEQUENCE auth.' || quote_ident(r.sequence_name) || ' OWNER TO supabase_auth_admin'; END LOOP;
END $$;
GRANT ALL ON SCHEMA auth TO supabase_auth_admin;
GRANT ALL ON ALL TABLES IN SCHEMA auth TO supabase_auth_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO supabase_auth_admin;
GRANT ALL ON ALL ROUTINES IN SCHEMA auth TO supabase_auth_admin;

-- Create _realtime schema for Realtime service
CREATE SCHEMA IF NOT EXISTS _realtime;
ALTER SCHEMA _realtime OWNER TO supabase_admin;
GRANT ALL ON SCHEMA _realtime TO supabase_admin;

-- Add missing column to storage.buckets (needed by migrations)
ALTER TABLE storage.buckets ADD COLUMN IF NOT EXISTS public boolean DEFAULT false;

-- Fix auth schema ownership so GoTrue (supabase_auth_admin) can run migrations
ALTER SCHEMA auth OWNER TO supabase_auth_admin;
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT p.oid::regprocedure AS fs FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'auth'
  LOOP EXECUTE 'ALTER FUNCTION ' || r.fs || ' OWNER TO supabase_auth_admin'; END LOOP;
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'auth'
  LOOP EXECUTE 'ALTER TABLE auth.' || quote_ident(r.tablename) || ' OWNER TO supabase_auth_admin'; END LOOP;
  FOR r IN SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'auth'
  LOOP EXECUTE 'ALTER SEQUENCE auth.' || quote_ident(r.sequence_name) || ' OWNER TO supabase_auth_admin'; END LOOP;
END $$;
GRANT ALL ON SCHEMA auth TO supabase_auth_admin;
GRANT ALL ON ALL TABLES IN SCHEMA auth TO supabase_auth_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA auth TO supabase_auth_admin;
GRANT ALL ON ALL ROUTINES IN SCHEMA auth TO supabase_auth_admin;

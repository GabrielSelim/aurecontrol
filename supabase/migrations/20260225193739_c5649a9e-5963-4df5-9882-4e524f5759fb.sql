
-- Use md5 which is built-in to PostgreSQL
CREATE OR REPLACE FUNCTION public.generate_document_hash(content text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT md5(content)
$$;

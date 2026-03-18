-- Fix: contracts_search_vector_update trigger was calling
-- coalesce(NEW.contract_type, '') which tries to cast '' (text) to the
-- contract_type enum, causing "invalid input value for enum" on every INSERT.
-- Fix: add explicit ::text cast on enum columns.

CREATE OR REPLACE FUNCTION public.contracts_search_vector_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('portuguese', coalesce(NEW.job_title, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.contract_type::text, '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.status::text, '')), 'C') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.notes, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Full-text search on contracts
-- Adds a GIN index on a tsvector column combining key searchable fields

-- Add tsvector column
ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Back-fill from existing rows
UPDATE contracts
SET search_vector =
  setweight(to_tsvector('portuguese', coalesce(job_title, '')), 'A') ||
  setweight(to_tsvector('portuguese', coalesce(contract_type, '')), 'B') ||
  setweight(to_tsvector('portuguese', coalesce(status, '')), 'C') ||
  setweight(to_tsvector('portuguese', coalesce(notes, '')), 'D');

-- GIN index for speed
CREATE INDEX IF NOT EXISTS idx_contracts_search_vector ON contracts USING GIN (search_vector);

-- Trigger to keep column up to date on insert/update
CREATE OR REPLACE FUNCTION contracts_search_vector_update()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('portuguese', coalesce(NEW.job_title, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.contract_type, '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.status, '')), 'C') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.notes, '')), 'D');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS contracts_search_vector_trigger ON contracts;
CREATE TRIGGER contracts_search_vector_trigger
BEFORE INSERT OR UPDATE ON contracts
FOR EACH ROW EXECUTE FUNCTION contracts_search_vector_update();

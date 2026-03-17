-- Evita duplicatas em pricing_tiers: min_contracts deve ser único
-- (cada tier tem um range distinto de contratos)
ALTER TABLE public.pricing_tiers
  ADD CONSTRAINT pricing_tiers_min_contracts_unique UNIQUE (min_contracts);

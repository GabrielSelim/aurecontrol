-- Add missing columns to contracts table
-- These fields are used in the contract creation form but were never added to the DB

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS compensation_type TEXT DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS variable_component NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS goal_description TEXT,
  ADD COLUMN IF NOT EXISTS clt_employee_id TEXT,
  ADD COLUMN IF NOT EXISTS clt_ctps_number TEXT,
  ADD COLUMN IF NOT EXISTS clt_ctps_series TEXT,
  ADD COLUMN IF NOT EXISTS clt_cbo_code TEXT,
  ADD COLUMN IF NOT EXISTS clt_work_regime TEXT DEFAULT 'presencial',
  ADD COLUMN IF NOT EXISTS pis_pasep TEXT,
  ADD COLUMN IF NOT EXISTS esocial_categoria TEXT,
  ADD COLUMN IF NOT EXISTS grau_instrucao TEXT,
  ADD COLUMN IF NOT EXISTS raca_cor TEXT,
  ADD COLUMN IF NOT EXISTS estado_civil TEXT,
  ADD COLUMN IF NOT EXISTS data_admissao DATE;

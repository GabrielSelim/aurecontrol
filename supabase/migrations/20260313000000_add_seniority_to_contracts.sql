-- Add seniority field to contracts table
-- Sprint 1: Campo Nível/Senioridade no contrato

ALTER TABLE contracts ADD COLUMN IF NOT EXISTS seniority TEXT;

COMMENT ON COLUMN contracts.seniority IS 'Nível de senioridade: estagio, junior, pleno, senior, especialista, gerente, diretor';

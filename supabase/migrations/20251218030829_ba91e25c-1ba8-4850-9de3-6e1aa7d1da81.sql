-- Add new values to contract_type enum
ALTER TYPE contract_type ADD VALUE IF NOT EXISTS 'estagio';
ALTER TYPE contract_type ADD VALUE IF NOT EXISTS 'temporario';